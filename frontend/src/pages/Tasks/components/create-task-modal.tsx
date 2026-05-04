import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TodoEditor, sanitizeFlat, flatToNested } from './todo-editor'
import type { FlatItem } from './todo-editor'
import type { Task, CreateTaskRequest } from '@/types/task'

// ─── Constants ────────────────────────────────────────────────────────────────

const DURATIONS = [25, 30, 45, 60, 90, 120] as const

function makeDefaultTodo(): FlatItem {
  return { id: crypto.randomUUID(), text: '', depth: 0, done: false }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface CreateTaskModalProps {
  open: boolean
  onOpenChange: (v: boolean) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CreateTaskModal({ open, onOpenChange }: CreateTaskModalProps) {
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [todos, setTodos] = useState<FlatItem[]>([makeDefaultTodo()])
  const [todosValid, setTodosValid] = useState(false)
  const [durationMin, setDurationMin] = useState<number>(45)
  const [isCustom, setIsCustom] = useState(false)
  const [customMin, setCustomMin] = useState(45)
  const [penaltyMode, setPenaltyMode] = useState(false)
  const [titleError, setTitleError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // ── Reset ──────────────────────────────────────────────────────────────────

  function reset() {
    setTitle('')
    setTodos([makeDefaultTodo()])
    setTodosValid(false)
    setDurationMin(45)
    setIsCustom(false)
    setCustomMin(45)
    setPenaltyMode(false)
    setTitleError(null)
    setSubmitting(false)
  }

  function handleOpenChange(v: boolean) {
    if (!v) reset()
    onOpenChange(v)
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const finalDuration = isCustom ? customMin : durationMin

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    // Validate title
    if (!title.trim()) {
      setTitleError('Title is required.')
      return
    }
    setTitleError(null)

    // Sanitize + validate todos
    const sanitized = sanitizeFlat(todos)
    const nested = flatToNested(sanitized)
    if (nested.length === 0 || !sanitized.some(t => t.text.trim())) {
      toast.error('Add at least one todo item.')
      return
    }

    setSubmitting(true)

    const body: CreateTaskRequest = {
      title: title.trim(),
      todos: nested,
      registered_duration_min: finalDuration,
      penalty_mode: penaltyMode,
    }

    try {
      const task = await api.post<Task>('/api/tasks', body)
      handleOpenChange(false)
      navigate(`/focus/${task.id}`)
    } catch (err: unknown) {
      const e = err as Error & { status?: number }
      if (e.status === 409) {
        toast.error('Daily task limit reached. Try again tomorrow.')
      } else {
        toast.error(e.message ?? 'Failed to create task. Please try again.')
      }
      setSubmitting(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl gap-0 overflow-hidden p-0 bg-background">
        <DialogHeader className="border-b border-border px-6 py-5">
          <DialogTitle className="text-base font-semibold">New Focus Session</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5 overflow-y-auto px-6 py-5" style={{ maxHeight: '70vh' }}>
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              What will you focus on?
            </label>
            <Input
              autoFocus
              placeholder="e.g. Write the product brief"
              value={title}
              onChange={e => { setTitle(e.target.value); setTitleError(null) }}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              className={cn('text-sm', titleError && 'border-destructive focus-visible:ring-destructive')}
            />
            {titleError && (
              <p className="text-xs text-destructive">{titleError}</p>
            )}
          </div>

          {/* Todos */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Todo checklist
            </label>
            <TodoEditor
              todos={todos}
              onChange={(next, valid) => { setTodos(next); setTodosValid(valid) }}
              autoFocus={false}
              disabled={submitting}
            />
            <p className="text-[11px] text-muted-foreground/70">
              Enter to add · Tab to indent · Shift+Tab to unindent
            </p>
          </div>

          {/* Duration */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Session duration
            </label>
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => { setDurationMin(d); setIsCustom(false) }}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-sm transition-colors',
                    !isCustom && durationMin === d
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background text-foreground hover:bg-secondary'
                  )}
                >
                  {d} min
                </button>
              ))}
              <button
                type="button"
                onClick={() => setIsCustom(true)}
                className={cn(
                  'rounded-lg border px-3 py-1.5 text-sm transition-colors',
                  isCustom
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-foreground hover:bg-secondary'
                )}
              >
                Custom
              </button>
            </div>
            {isCustom && (
              <div className="flex items-center gap-2 mt-1">
                <Input
                  type="number"
                  min={25}
                  value={customMin}
                  onChange={e => setCustomMin(Math.max(25, Number(e.target.value)))}
                  className="w-28 text-sm"
                />
                <span className="text-sm text-muted-foreground">minutes (min 25)</span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="border-t border-border px-6 py-4 flex-col gap-3 sm:flex-col">
          {/* Penalty mode — advanced opt-in, default off */}
          <label className="flex items-start gap-2.5 cursor-pointer select-none w-full">
            <input
              type="checkbox"
              checked={penaltyMode}
              onChange={e => setPenaltyMode(e.target.checked)}
              disabled={submitting}
              className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-destructive cursor-pointer"
            />
            <span className="flex flex-col gap-0.5">
              <span className="text-xs font-medium text-muted-foreground">
                Enable penalty mode ⚔️
              </span>
              <span className="text-[11px] text-muted-foreground/60">
                If you give up, items in your garden may wilt or disappear.
              </span>
            </span>
          </label>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              {submitting ? 'Creating…' : 'Create & Start'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}