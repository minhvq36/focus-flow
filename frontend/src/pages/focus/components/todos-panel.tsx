import { useState, useEffect, useRef } from 'react'
import { TodoEditor, nestedToFlat, flatToNested, type FlatItem } from '@/pages/tasks/components/todo-editor'
import { cn } from '@/lib/utils'
import type { TodoItem } from '@/types/task'

// ─── Read-only render ─────────────────────────────────────────────────────────

function ReadOnlyTodos({ flat }: { flat: FlatItem[] }) {
  const done = flat.filter(t => t.done).length

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Todos
        </span>
        <span className="text-xs text-muted-foreground">
          {done}/{flat.length}
        </span>
      </div>

      <ul className="flex flex-col gap-1.5">
        {flat.map(item => (
          <li
            key={item.id}
            className="flex items-start gap-2.5"
            style={{ paddingLeft: `${item.depth * 20}px` }}
          >
            <div
              className={cn(
                'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                item.done
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-transparent'
              )}
              aria-hidden
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
                'flex-1 text-sm leading-relaxed text-foreground break-words whitespace-pre-wrap',
                item.done && 'line-through text-muted-foreground'
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

// ─── Editable render ──────────────────────────────────────────────────────────
// Done toggles live here (above TodoEditor).
// TodoEditor owns text editing + keyboard + add/remove/indent.

interface EditableTodosProps {
  flat: FlatItem[]
  onChange: (next: FlatItem[]) => void
}

function EditableTodos({ flat, onChange }: EditableTodosProps) {
  const done = flat.filter(t => t.done).length

  function toggleDone(id: string) {
    onChange(flat.map(t => t.id === id ? { ...t, done: !t.done } : t))
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Todos
        </span>
        <span className="text-xs text-muted-foreground">
          {done}/{flat.length}
        </span>
      </div>

      {/* Done toggle column — rendered separately so TodoEditor stays pure */}
      <div className="flex flex-col gap-[1px]">
        {flat.map(item => (
          <div
            key={item.id}
            className="flex h-8 items-center"
            style={{ paddingLeft: `${item.depth * 20}px` }}
          >
            <button
              type="button"
              onClick={() => toggleDone(item.id)}
              className={cn(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                item.done
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-transparent hover:border-primary/60'
              )}
              aria-label={item.done ? 'Mark as undone' : 'Mark as done'}
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
          </div>
        ))}
      </div>

      <TodoEditor
        todos={flat}
        onChange={(next) => onChange(next)}
        disabled={false}
      />
    </div>
  )
}

// ─── TodosPanel ───────────────────────────────────────────────────────────────

interface TodosPanelProps {
  todos: TodoItem[]        // nested, from server / parent state
  isReadOnly: boolean
  onChange: (todos: TodoItem[]) => void
}

export function TodosPanel({ todos, isReadOnly, onChange }: TodosPanelProps) {
  const [flat, setFlat] = useState<FlatItem[]>(() => nestedToFlat(todos))

  // Re-sync from server snapshot (after pause/resume invalidates query).
  // Skip the seed render — already set in useState initializer.
  const seededRef = useRef(false)
  useEffect(() => {
    if (!seededRef.current) {
      seededRef.current = true
      return
    }
    setFlat(nestedToFlat(todos))
  }, [todos])

  function handleChange(next: FlatItem[]) {
    setFlat(next)
    onChange(flatToNested(next))
  }

  if (isReadOnly) {
    return <ReadOnlyTodos flat={flat} />
  }

  return <EditableTodos flat={flat} onChange={handleChange} />
}