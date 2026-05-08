/**
 * text-constraints.ts
 *
 * Reusable DOM-level helpers that enforce a character limit on <input> and
 * <textarea> elements **without** touching React state.  Import these into any
 * component that needs a hard cap (title, todo items, focus-screen notes, …).
 *
 * Both functions are intentionally framework-agnostic: they receive the native
 * event objects that React's synthetic event system forwards, so they work
 * identically across components.
 */

// ─── types ────────────────────────────────────────────────────────────────────

/** Any writable text field — <input> or <textarea>. */
type TextField = HTMLInputElement | HTMLTextAreaElement

/** React-compatible oninput / onchange event shapes. */
type InputLikeEvent = React.FormEvent<TextField>
type PasteLikeEvent = React.ClipboardEvent<TextField>

// ─── clampInput ───────────────────────────────────────────────────────────────

/**
 * Attach to `onInput` (or `onChange`) to hard-clamp the field value whenever
 * it exceeds `maxLength` — regardless of *how* the text arrived (typing, IME
 * composition, drag-and-drop, browser auto-fill, …).
 *
 * Also calls `onAutoGrow` when provided, so callers that need auto-expanding
 * textareas don't have to wire a second handler.
 *
 * @example
 * <textarea onInput={(e) => clampInput(e, MAX_LENGTH, autoGrow)} />
 */
export function clampInput<T extends TextField>(
  e: React.FormEvent<T>,
  maxLength: number,
  onAutoGrow?: (el: T) => void,
): void {
  const el = e.currentTarget

  if (el.value.length > maxLength) {
    el.value = el.value.slice(0, maxLength)
    // Restore caret to the end of the allowed text so the cursor doesn't jump.
    el.setSelectionRange(maxLength, maxLength)
  }

  onAutoGrow?.(el)
}

// ─── clampPaste ───────────────────────────────────────────────────────────────

/**
 * Attach to `onPaste` to intercept clipboard text **before** the browser
 * writes it to the DOM.  When the pasted content would push the total length
 * over `maxLength`, the event is cancelled and only the allowed portion of the
 * clipboard text is inserted via `document.execCommand`.
 *
 * This prevents even a momentary flash of over-limit text that
 * `clampInput` alone cannot fully avoid on some browsers.
 *
 * @example
 * <textarea onPaste={(e) => clampPaste(e, MAX_LENGTH)} />
 */
export function clampPaste(e: PasteLikeEvent, maxLength: number): void {
  const el = e.currentTarget
  const pasteText = e.clipboardData.getData("text")

  const selectionStart = el.selectionStart ?? el.value.length
  const selectionEnd = el.selectionEnd ?? el.value.length

  // What the full value would look like after the paste.
  const nextValue =
    el.value.slice(0, selectionStart) +
    pasteText +
    el.value.slice(selectionEnd)

  if (nextValue.length <= maxLength) {
    // Within budget — let the browser handle it normally.
    return
  }

  e.preventDefault()

  // How many characters from the clipboard can we still accept?
  const replacedLength = selectionEnd - selectionStart
  const available = maxLength - el.value.length + replacedLength

  if (available <= 0) return

  // eslint-disable-next-line @typescript-eslint/no-deprecated -- no DOM alternative for inline caret-aware insertion
  document.execCommand("insertText", false, pasteText.slice(0, available))
}

// ─── createTextConstraintHandlers ────────────────────────────────────────────

/**
 * Convenience factory that returns a pre-bound `{ onInput, onPaste }` handler
 * pair for the given `maxLength`.  Useful when you want to spread props onto a
 * field without wiring both handlers explicitly.
 *
 * @example
 * const handlers = createTextConstraintHandlers(MAX_TITLE_LENGTH, autoGrow)
 * <textarea {...handlers} />
 */
export function createTextConstraintHandlers<T extends TextField>(
  maxLength: number,
  onAutoGrow?: (el: T) => void,
) {
  return {
    onInput: (e: React.FormEvent<T>) => clampInput(e, maxLength, onAutoGrow),
    onPaste: (e: React.ClipboardEvent<T>) => clampPaste(e, maxLength),
  } as const
}