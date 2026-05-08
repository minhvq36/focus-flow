"use client"

import React, { useState, useRef, useCallback, useEffect } from "react"
import { XCircle, Plus } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  nestedToFlat,
  flatToNested,
  MAX_TODOS,
  MAX_DEPTH,
  type FlatItem,
} from "@/pages/tasks/utils/todo-utils"
import type { TodoItem } from "@/types/task"
import { clampInput, clampPaste } from "@/pages/tasks/utils/text-constraints"

// ─── TodoRow ──────────────────────────────────────────────────────────────────

interface TodoRowProps {
  item: FlatItem
  isOnly: boolean
  onCommitText: (id: string, text: string) => void
  onToggle: (id: string) => void
  onRemove: (id: string) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>, id: string) => void
  registerRef: (id: string, el: HTMLTextAreaElement | null) => void
}

const INDENT_SIZE = 32
const MAX_TODO_LENGTH = 500

const TodoRow = React.memo(
  ({
    item,
    isOnly,
    onCommitText,
    onToggle,
    onRemove,
    onKeyDown,
    registerRef,
  }: TodoRowProps) => {
    // requestAnimationFrame: avoids forced sync layout on every keystroke
    const autoGrow = (el: HTMLTextAreaElement) => {
      requestAnimationFrame(() => {
        el.style.height = "auto"
        el.style.height = `${el.scrollHeight}px`
      })
    }

    return (
      <li
        className="group flex items-start gap-2.5"
        style={{ paddingLeft: `${item.depth * INDENT_SIZE}px` }}
      >
        <button
          type="button"
          onClick={() => onToggle(item.id)}
          className={cn(
            "mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
            item.done
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-transparent hover:border-primary/60"
          )}
          aria-label={item.done ? "Mark incomplete" : "Mark complete"}
        >
          {item.done && (
            <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none">
              <path
                d="M2 6l3 3 5-5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>

        {/* Uncontrolled textarea — value seeded once imperatively via ref */}
        <textarea
          ref={(el) => {
            registerRef(item.id, el)
            if (el && el.dataset.seeded !== "1") {
              el.value = item.text
              el.dataset.seeded = "1"
              autoGrow(el)
            }
          }}
          rows={1}
          onInput={(e) => {
            clampInput(e, MAX_TODO_LENGTH, autoGrow)
          }}
          onPaste={(e) => clampPaste(e, MAX_TODO_LENGTH)}
          onBlur={(e) => onCommitText(item.id, e.currentTarget.value)}
          onKeyDown={(e) => onKeyDown(e, item.id)}
          placeholder="Todo item…"
          className={cn(
            "flex-1 resize-none overflow-hidden bg-transparent py-0.5 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/50",
            "border-b border-transparent focus:border-border",
            "whitespace-pre-wrap break-words",
            item.done && "line-through text-muted-foreground"
          )}
          style={{ minHeight: "1.5rem" }}
        />

        <button
          type="button"
          onClick={() => onRemove(item.id)}
          disabled={isOnly}
          className="mt-1 opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground/50 hover:text-destructive disabled:!opacity-0"
          aria-label="Remove todo"
        >
          <XCircle className="h-4 w-4" />
        </button>
      </li>
    )
  },
  (prev, next) =>
    prev.item.id === next.item.id &&
    prev.item.done === next.item.done &&
    prev.item.depth === next.item.depth &&
    prev.isOnly === next.isOnly
  // item.text intentionally excluded: textarea is uncontrolled
)

TodoRow.displayName = "TodoRow"

// ─── EditableTodos ─────────────────────────────────────────────────────────────

interface EditableTodosProps {
  flat: FlatItem[]
  setFlat: React.Dispatch<React.SetStateAction<FlatItem[]>>
}

function EditableTodos({ flat, setFlat }: EditableTodosProps) {
  const inputRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map())

  // flatRef: read current flat in event handlers without triggering re-renders
  // and without needing setFlat just to peek at state.
  const flatRef = useRef(flat)
  flatRef.current = flat

  const doneCount = flat.filter((t) => t.done).length

  const registerRef = useCallback(
    (id: string, el: HTMLTextAreaElement | null) => {
      if (el) inputRefs.current.set(id, el)
      else inputRefs.current.delete(id)
    },
    []
  )

  const focusId = useCallback((id: string) => {
    setTimeout(() => {
      const el = inputRefs.current.get(id)
      if (!el) return
      el.focus()
      el.selectionStart = el.selectionEnd = el.value.length
    }, 0)
  }, [])

  const commitText = useCallback(
    (id: string, text: string) => {
      setFlat((prev) => {
        const item = prev.find((t) => t.id === id)
        // Bail early if text unchanged — prevents re-render on blur of untouched item
        if (!item || item.text === text) return prev
        return prev.map((t) => (t.id === id ? { ...t, text } : t))
      })
    },
    [setFlat]
  )

  const toggleDone = useCallback(
    (id: string) => {
      setFlat((prev) =>
        prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
      )
    },
    [setFlat]
  )

  const addAfter = useCallback(
    (afterId: string, depth: number) => {
      setFlat((prev) => {
        if (prev.length >= MAX_TODOS) {
          toast.warning(`Maximum ${MAX_TODOS} todos reached`)
          return prev
        }
        const idx = prev.findIndex((t) => t.id === afterId)
        const newItem: FlatItem = {
          id: crypto.randomUUID(),
          text: "",
          depth,
          done: false,
        }
        const next = [...prev]
        next.splice(idx + 1, 0, newItem)
        focusId(newItem.id)
        return next
      })
    },
    [setFlat, focusId]
  )

  const remove = useCallback(
    (id: string) => {
      setFlat((prev) => {
        if (prev.length <= 1) return prev
        const idx = prev.findIndex((t) => t.id === id)
        const next = prev.filter((t) => t.id !== id)
        focusId(next[Math.max(0, idx - 1)].id)
        return next
      })
    },
    [setFlat, focusId]
  )

  const indent = useCallback(
    (id: string, delta: number) => {
      setFlat((prev) => {
        const idx = prev.findIndex((t) => t.id === id)
        if (idx === -1) return prev
        const item = prev[idx]
        const nextDepth = item.depth + delta
        if (nextDepth < 0) return prev
        if (delta > 0) {
          if (nextDepth > MAX_DEPTH) {
            toast.warning(`Maximum nesting depth is ${MAX_DEPTH} levels`)
            return prev
          }
          const prevItem = idx > 0 ? prev[idx - 1] : null
          const maxAllowed = prevItem ? prevItem.depth + 1 : 0
          if (nextDepth > maxAllowed) return prev
        }
        return prev.map((t) => (t.id === id ? { ...t, depth: nextDepth } : t))
      })
    },
    [setFlat]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>, id: string) => {
      const currentFlat = flatRef.current
      const idx = currentFlat.findIndex((t) => t.id === id)
      const item = currentFlat[idx]
      if (!item) return

      switch (e.key) {
        case "Enter": {
          e.preventDefault()
          // Commit textarea value before inserting new row
          const el = inputRefs.current.get(id)
          if (el) commitText(id, el.value)
          addAfter(id, item.depth)
          break
        }
        case "Backspace": {
          const el = inputRefs.current.get(id)
          if (el?.value === "") {
            e.preventDefault()
            remove(id)
          }
          break
        }
        case "Tab": {
          e.preventDefault()
          indent(id, e.shiftKey ? -1 : 1)
          break
        }
        case "ArrowUp": {
          if (idx > 0) {
            e.preventDefault()
            focusId(currentFlat[idx - 1].id)
          }
          break
        }
        case "ArrowDown": {
          if (idx < currentFlat.length - 1) {
            e.preventDefault()
            focusId(currentFlat[idx + 1].id)
          }
          break
        }
      }
    },
    // flatRef is a stable ref object — safe to exclude from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [commitText, addAfter, remove, indent, focusId]
  )

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Todos
        </span>
        <span className="text-xs text-muted-foreground">
          {doneCount}/{flat.length}
        </span>
      </div>

      <ul className="flex flex-col gap-1.5">
        {flat.map((item) => (
          <TodoRow
            key={item.id}
            item={item}
            isOnly={flat.length === 1}
            onCommitText={commitText}
            onToggle={toggleDone}
            onRemove={remove}
            onKeyDown={handleKeyDown}
            registerRef={registerRef}
          />
        ))}
      </ul>

      <button
        type="button"
        onClick={() => {
          const last = flat[flat.length - 1]
          if (last) addAfter(last.id, 0)
        }}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors w-fit"
      >
        <Plus className="h-3.5 w-3.5" />
        Add item
      </button>
    </div>
  )
}

// ─── ReadOnlyTodos ─────────────────────────────────────────────────────────────

function ReadOnlyTodos({ flat }: { flat: FlatItem[] }) {
  const doneCount = flat.filter((t) => t.done).length

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Todos
        </span>
        <span className="text-xs text-muted-foreground">
          {doneCount}/{flat.length}
        </span>
      </div>

      <ul className="flex flex-col gap-1.5">
        {flat.map((item) => (
          <li
            key={item.id}
            className="flex items-start gap-2.5"
            style={{ paddingLeft: `${item.depth * INDENT_SIZE}px` }}
          >
            <div
              className={cn(
                "mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                item.done
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-transparent"
              )}
            >
              {item.done && (
                <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none">
                  <path
                    d="M2 6l3 3 5-5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
            <span
              className={cn(
                "flex-1 text-sm leading-relaxed text-foreground whitespace-pre-wrap break-words",
                item.done && "line-through text-muted-foreground"
              )}
            >
              {item.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ─── TodosPanel ────────────────────────────────────────────────────────────────

interface TodosPanelProps {
  todos: TodoItem[]
  isReadOnly: boolean
  onChange: (todos: TodoItem[]) => void
}

export function TodosPanel({ todos, isReadOnly, onChange }: TodosPanelProps) {
  const [flat, setFlat] = useState<FlatItem[]>(() => nestedToFlat(todos))
  const isOwnUpdateRef = useRef(false)

  useEffect(() => {
    if (isOwnUpdateRef.current) {
      isOwnUpdateRef.current = false
      return
    }
    setFlat(nestedToFlat(todos))
  }, [todos])

  const setFlatAndNotify: React.Dispatch<React.SetStateAction<FlatItem[]>> =
    useCallback(
      (action) => {
        setFlat((prev) => {
          const next = typeof action === "function" ? action(prev) : action
          if (next !== prev) {
            isOwnUpdateRef.current = true
            onChange(flatToNested(next))
          }
          return next
        })
      },
      [onChange]
    )

  if (isReadOnly) {
    return <ReadOnlyTodos flat={flat} />
  }

  return <EditableTodos flat={flat} setFlat={setFlatAndNotify} />
}