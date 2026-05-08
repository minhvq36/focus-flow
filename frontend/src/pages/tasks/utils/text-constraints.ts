type TextField = HTMLInputElement | HTMLTextAreaElement
type InputLikeEvent = React.FormEvent<TextField>
type PasteLikeEvent = React.ClipboardEvent<TextField>

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

export function createTextConstraintHandlers<T extends TextField>(
  maxLength: number,
  onAutoGrow?: (el: T) => void,
) {
  return {
    onInput: (e: React.FormEvent<T>) => clampInput(e, maxLength, onAutoGrow),
    onPaste: (e: React.ClipboardEvent<T>) => clampPaste(e, maxLength),
  } as const
}