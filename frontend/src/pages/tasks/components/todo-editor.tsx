import { useRef, useCallback } from 'react'
import { ChevronRight, Trash2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { type FlatItem, validateFlat, MAX_TODOS, MAX_DEPTH } from '@/pages/tasks/utils/todo-utils'
import { createTextConstraintHandlers } from '@/pages/tasks/utils/text-constraints'

function findFirstNonEmptyDescendant(flat: FlatItem[], startIdx: number): string | null {
  const parentDepth = flat[startIdx].depth
  for (let i = startIdx + 1; i < flat.length; i++) {
    if (flat[i].depth <= parentDepth) break // out of subtree
    if (flat[i].text.trim()) return flat[i].text
  }
  return null
}

function isSubtreeEmpty(flat: FlatItem[], startIdx: number): boolean {
  const parentDepth = flat[startIdx].depth
  if (flat[startIdx].text.trim()) return false
  for (let i = startIdx + 1; i < flat.length; i++) {
    if (flat[i].depth <= parentDepth) break
    if (flat[i].text.trim()) return false
  }
  return true
}

export function sanitizeFlat(flat: FlatItem[]): FlatItem[] {
  let result = [...flat]

  // Rule 2 — Fill empty parents from first non-empty descendant (bottom-up pass)
  // Iterate from end to start so we fill bottom nodes first
  for (let i = result.length - 1; i >= 0; i--) {
    if (!result[i].text.trim()) {
      const label = findFirstNonEmptyDescendant(result, i)
      if (label) {
        result[i] = { ...result[i], text: label }
      }
    }
  }

  // Rule 3 — Delete fully empty subtrees (bottom-up)
  // Build list of indices to remove
  const toRemove = new Set<number>()
  for (let i = result.length - 1; i >= 0; i--) {
    if (toRemove.has(i)) continue
    if (isSubtreeEmpty(result, i)) {
      // Mark this node and all its descendants for removal
      const parentDepth = result[i].depth
      toRemove.add(i)
      for (let j = i + 1; j < result.length; j++) {
        if (result[j].depth <= parentDepth) break
        toRemove.add(j)
      }
    }
  }
  result = result.filter((_, i) => !toRemove.has(i))

  // Rule 1 — Trim trailing empty items (no children with text)
  while (result.length > 0) {
    const last = result[result.length - 1]
    if (!last.text.trim()) {
      result.pop()
    } else {
      break
    }
  }

  // Guard — always keep at least 1 item
  if (result.length === 0) {
    result = [{ id: crypto.randomUUID(), text: '', depth: 0, done: false }]
  }

  return result
}

// ─── Count helpers ────────────────────────────────────────────────────────────

function totalCount(flat: FlatItem[]): number {
  return flat.length
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface TodoEditorProps {
  todos: FlatItem[]
  onChange: (todos: FlatItem[], isValid: boolean) => void
  disabled?: boolean
  autoFocus?: boolean
}

// ─── Component ────────────────────────────────────────────────────────────────
const todoConstraints = createTextConstraintHandlers<HTMLInputElement>(500)
export function TodoEditor({ todos, onChange, disabled = false, autoFocus = false }: TodoEditorProps) {
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const emit = useCallback((next: FlatItem[]) => {
    const { valid } = validateFlat(next)
    onChange(next, valid)
  }, [onChange])

  // ── Mutations ────────────────────────────────────────────────────────────────

  function addAfter(afterId: string, depth: number) {
    if (totalCount(todos) >= MAX_TODOS) {
      toast.warning(`Maximum ${MAX_TODOS} todos reached`)
      return
    }
    const idx = todos.findIndex(t => t.id === afterId)
    const newItem: FlatItem = { id: crypto.randomUUID(), text: '', depth, done: false }
    const next = [...todos]
    next.splice(idx + 1, 0, newItem)
    emit(next)
    requestAnimationFrame(() => inputRefs.current[newItem.id]?.focus())
  }

  function updateText(id: string, text: string) {
    emit(todos.map(t => t.id === id ? { ...t, text } : t))
  }

  function remove(id: string) {
    if (todos.length === 1) return
    const idx = todos.findIndex(t => t.id === id)
    const next = todos.filter(t => t.id !== id)
    emit(next)
    const prevId = todos[Math.max(0, idx - 1)].id
    requestAnimationFrame(() => inputRefs.current[prevId]?.focus())
  }

  function indent(id: string, delta: number) {
    const idx = todos.findIndex(t => t.id === id)
    if (idx === -1) return

    const item = todos[idx]
    const nextDepth = item.depth + delta

    if (nextDepth < 0) return

    if (delta > 0) {
      // Hard ceiling
      if (nextDepth > MAX_DEPTH) {
        toast.warning(`Maximum nesting depth is ${MAX_DEPTH} levels`)
        return
      }
      // Cannot jump levels — must be at most prevItem.depth + 1
      const prevItem = idx > 0 ? todos[idx - 1] : null
      const maxAllowed = prevItem ? prevItem.depth + 1 : 0
      if (nextDepth > maxAllowed) return // silent no-op
    }

    emit(todos.map(t => t.id === id ? { ...t, depth: nextDepth } : t))
  }

  // ── Keyboard handler ──────────────────────────────────────────────────────────

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>, id: string, depth: number) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addAfter(id, depth)
    } else if (e.key === 'Tab') {
      e.preventDefault()
      indent(id, e.shiftKey ? -1 : 1)
    } else if (e.key === 'Backspace') {
      const item = todos.find(t => t.id === id)
      if (item?.text === '' && todos.length > 1) {
        e.preventDefault()
        remove(id)
      }
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="rounded-lg border border-border bg-secondary/30 px-3 py-2 flex flex-col gap-1">
      {todos.map((item, i) => (
        <div
          key={item.id}
          className="group flex items-center gap-1.5"
          style={{ paddingLeft: item.depth * 20 }}
        >
          {item.depth > 0 && (
            <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/40" aria-hidden />
          )}

          {/* Decorative checkbox */}
          <div
            className="h-3.5 w-3.5 shrink-0 rounded-[3px] border border-border bg-background"
            aria-hidden
          />

          <input
            {...todoConstraints}
            ref={el => { inputRefs.current[item.id] = el }}
            value={item.text}
            onChange={e => updateText(item.id, e.target.value)}
            onKeyDown={e => onKeyDown(e, item.id, item.depth)}
            placeholder={i === 0 ? 'First step…' : 'Next step…'}
            disabled={disabled}
            autoFocus={autoFocus && i === 0}
            className="min-w-0 flex-1 bg-transparent py-1 text-sm text-foreground outline-none placeholder:text-muted-foreground/50 disabled:opacity-50"
          />

          {/* Indent / unindent buttons — visible on hover */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
            {item.depth > 0 && (
              <button
                type="button"
                onClick={() => indent(item.id, -1)}
                disabled={disabled}
                aria-label="Unindent"
                title="Unindent (Shift+Tab)"
                className="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <ChevronRight className="h-3 w-3 rotate-180" />
              </button>
            )}
            {item.depth < MAX_DEPTH && (
              <button
                type="button"
                onClick={() => indent(item.id, 1)}
                disabled={disabled}
                aria-label="Indent"
                title="Indent (Tab)"
                className="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <ChevronRight className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Delete button */}
          <button
            type="button"
            onClick={() => remove(item.id)}
            disabled={disabled || todos.length === 1}
            aria-label="Delete item"
            className="opacity-0 group-hover:opacity-100 disabled:!opacity-0 transition-opacity text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}

      {/* Add item button */}
      <button
        type="button"
        onClick={() => addAfter(todos[todos.length - 1].id, 0)}
        disabled={disabled}
        className="mt-1 flex items-center gap-1.5 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
      >
        <Plus className="h-3 w-3" />
        Add item
      </button>

      {/* Counter — only show when approaching limit */}
      {todos.length >= MAX_TODOS - 5 && (
        <p className="mt-1 text-[11px] text-muted-foreground/60 text-right">
          {todos.length}/{MAX_TODOS}
        </p>
      )}
    </div>
  )
}