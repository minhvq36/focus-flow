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

// Tính elapsed hiện tại từ server data
function calcElapsed(actualDurationSec: number, startedAt: string | null): number {
  if (!startedAt) return actualDurationSec
  const delta = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
  return actualDurationSec + Math.max(0, delta)
}

export default function FocusPage() {
  const { taskId } = useParams<{ taskId: string }>()
  const navigate = useNavigate()
  const { task, isLoading, pause, resume, submit, giveUp, updateTodos } =
    useTaskDetail(taskId!)

  // Timer local state — seed từ server, tự đếm
  const [elapsed, setElapsed] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Seed elapsed khi task load xong lần đầu
  const seededRef = useRef(false)
  useEffect(() => {
    if (!task || seededRef.current) return
    seededRef.current = true
    setElapsed(calcElapsed(task.actual_duration_sec, task.started_at))
  }, [task])

  // Chạy/dừng interval theo status
  useEffect(() => {
    if (!task) return
    if (task.status === 'active') {
      intervalRef.current = setInterval(() => setElapsed(s => s + 1), 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [task?.status])

  // Todos local state — optimistic, debounce sync
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

  // Force sync trước khi mutate status
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

  return (
    <div className="min-h-dvh" style={{ backgroundColor: '#f9f9f3' }}>
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border/60 bg-[#f9f9f3]/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/tasks')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              {task.registered_duration_min} min session
            </span>
          </div>
          <span className="text-xs text-muted-foreground/60">
            {new Date(task.created_at).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric',
            })}
          </span>
        </div>
      </header>

      {/* Body */}
      <main className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">

          {/* Left column */}
          <div className="flex min-w-0 flex-1 flex-col gap-8">
            <EditableTitle
              value={task.title}
              isReadOnly={isReadOnly}
            />

            <TimerRing
              elapsedSec={elapsed}
              totalSec={totalSec}
              isReadOnly={isReadOnly}
            />

            <div className="rounded-2xl border border-border bg-white/60 p-6 shadow-sm">
              <TodosPanel
                todos={todos}
                isReadOnly={isReadOnly}
                onChange={handleTodosChange}
              />
            </div>

            <div className="sticky bottom-6">
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

          {/* Right: Notes */}
          <NotesBar taskId={task.id} isReadOnly={isReadOnly} />
        </div>
      </main>
    </div>
  )
}