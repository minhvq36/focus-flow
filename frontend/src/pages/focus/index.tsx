import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import { useTaskDetail } from '@/pages/tasks/hooks/use-task-detail'
import { EditableTitle } from './components/editable-title'
import { TimerRing } from './components/timer-ring'
import { TodosPanel } from './components/todos-panel'
import { NotesBar } from './components/notes-bar'
import { ActionBar } from './components/action-bar'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { TodoItem } from '@/types/task'

function calcElapsed(actualDurationSec: number, startedAt: string | null): number {
  if (!startedAt) return actualDurationSec
  const delta = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
  return actualDurationSec + Math.max(0, delta)
}

export default function FocusPage() {
  const { taskId } = useParams<{ taskId: string }>()
  const navigate = useNavigate()
  const { task, isLoading, pause, resume, submit, giveUp, updateTodos, updateTitle } =
    useTaskDetail(taskId!)

  const [elapsed, setElapsed] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const seededRef = useRef(false)
  useEffect(() => {
    if (!task || seededRef.current) return
    seededRef.current = true
    setElapsed(calcElapsed(task.actual_duration_sec, task.started_at))
  }, [task])

  useEffect(() => {
    if (!task) return
    if (task.status === 'active') {
      intervalRef.current = setInterval(() => setElapsed(s => s + 1), 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [task?.status])

  const [todos, setTodos] = useState<TodoItem[]>([])
  const todosInitRef = useRef(false)
  useEffect(() => {
    if (!task || todosInitRef.current) return
    todosInitRef.current = true
    setTodos(task.todos)
  }, [task])

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  function handleTodosChange(next: TodoItem[]) {
    setTodos(next)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      updateTodos(next).catch(console.error)
    }, 1000)
  }

  async function forceSyncTodos() {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    await updateTodos(todos)
  }

  if (isLoading) return (
    <div className="flex min-h-dvh items-center justify-center text-muted-foreground text-sm">
      Loading…
    </div>
  )

  if (!task) return (
    <div className="flex min-h-dvh items-center justify-center text-muted-foreground text-sm">
      Task not found.
    </div>
  )

  const isReadOnly = task.status === 'submitted' || task.status === 'given_up'
  const totalSec = task.registered_duration_min * 60

  const STATUS_CONFIG = {
  active: {
    label: 'Active',
    color: 'text-emerald-600',
  },
  paused: {
    label: 'Paused',
    color: 'text-amber-600',
  },
  submitted: {
    label: 'Submitted',
    color: 'text-primary',
  },
  given_up: {
    label: 'Given up',
    color: 'text-red-500',
  },
} as const

  return (
    // overflow-hidden on root: prevents page scroll entirely
    <div className="flex min-h-dvh flex-col overflow-hidden" style={{ backgroundColor: '#f9f9f3' }}>

      {/* Header */}
      <header className="shrink-0 border-b border-border/60 bg-[#f9f9f3]/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-8">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => navigate('/tasks')}
              aria-label="Back to tasks"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-2">
              <span
                className={`text-sm font-medium ${STATUS_CONFIG[task.status].color}`}
              >
                {STATUS_CONFIG[task.status].label}
              </span>

              <span className="text-muted-foreground/40">·</span>

              <span className="text-sm text-muted-foreground">
                {task.registered_duration_min} min session
              </span>
            </div>
          </div>
          <span className="text-xs text-muted-foreground/60">
            {new Date(task.created_at).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric',
            })}
          </span>
        </div>
      </header>

      {/* Body — fills remaining viewport height, no page scroll */}
      <main className="min-h-0 flex-1 overflow-hidden">
        <div className="mx-auto flex h-full max-w-6xl flex-col gap-8 px-4 py-8 md:px-8 lg:flex-row lg:items-start lg:gap-10">

          {/* ── Left column: title + todos + action bar ── */}
          <div className="flex min-h-0 w-0 flex-1 flex-col gap-6 lg:h-full">

            <EditableTitle
              value={task.title}
              isReadOnly={isReadOnly}
              onCommit={updateTitle}
            />

            {/* Todos card — with scroll */}
            <div className="rounded-2xl border border-border bg-white/60 shadow-sm overflow-hidden">
              <div className="max-h-[441px] overflow-y-auto p-6">
                <TodosPanel
                  todos={todos}
                  isReadOnly={isReadOnly}
                  onChange={handleTodosChange}
                />
              </div>
            </div>

            {/* Action bar pinned to bottom of left column */}
            <div className="shrink-0">
              <div className="rounded-2xl border border-border bg-white/80 px-5 py-3 shadow-md backdrop-blur-sm">
                <ActionBar
                  status={task.status}
                  onPause={async () => { await forceSyncTodos(); await pause() }}
                  onResume={async () => { await resume() }}
                  onSubmit={async () => { await forceSyncTodos(); await submit() }}
                  onGiveUp={async () => { await forceSyncTodos(); await giveUp() }}
                />
              </div>
            </div>
          </div>

          {/* ── Right column: timer on top, notes below, own scroll ── */}
          <div className="flex shrink-0 flex-col gap-6 lg:h-full lg:w-72 xl:w-80">

            <div className="shrink-0">
              <TimerRing
                elapsedSec={elapsed}
                totalSec={totalSec}
                isReadOnly={isReadOnly}
              />
            </div>

            {/* Notes fills rest of right column height */}
            <div className="min-h-0 flex-1 overflow-hidden">
              <NotesBar taskId={task.id} isReadOnly={isReadOnly} />
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}