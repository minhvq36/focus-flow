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

import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

function calcElapsed(actualDurationSec: number, startedAt: string | null): number {
  if (!startedAt) return actualDurationSec
  const delta = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
  return actualDurationSec + Math.max(0, delta)
}

const STATUS_CONFIG = {
  active:   { label: 'Active',    color: 'text-emerald-600' },
  paused:   { label: 'Paused',    color: 'text-amber-600'   },
  submitted:{ label: 'Submitted', color: 'text-primary'     },
  given_up: { label: 'Given up',  color: 'text-red-500'     },
} as const

export default function FocusPage() {
  const { taskId } = useParams<{ taskId: string }>()
  const navigate = useNavigate()
  const { task, isLoading, pause, resume, submit, giveUp, updateTodos, updateTitle } =
    useTaskDetail(taskId!)

  const [elapsed, setElapsed] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [showGiveUpConfirm, setShowGiveUpConfirm] = useState(false)
  const [isActioning, setIsActioning] = useState(false)

  const seededRef = useRef(false)
  useEffect(() => {
    if (!task || seededRef.current) return
    seededRef.current = true
    setElapsed(calcElapsed(task.actual_duration_sec, task.started_at))
  }, [task])

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (!task || task.status !== 'active' || !task.started_at) return

    const startTimeMs = new Date(task.started_at).getTime()
    const baseDurationSec = task.actual_duration_sec

    const updateTimer = () => {
      const deltaSec = Math.floor((Date.now() - startTimeMs) / 1000)
      setElapsed(baseDurationSec + Math.max(0, deltaSec))
    }

    updateTimer()
    intervalRef.current = setInterval(updateTimer, 1000)

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') updateTimer()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [task?.status, task?.started_at, task?.actual_duration_sec])

  const [todos, setTodos] = useState<TodoItem[]>([])
  const todosInitRef = useRef(false)
  useEffect(() => {
    if (!task) return

    if (task.status === 'submitted' || task.status === 'given_up') {
      setTodos(task.todos)
      return
    }

    if (todosInitRef.current) return
    
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
    try {
      await updateTodos(todos)
    } catch (error) {
      toast.error("An error occurred. Try to check connection.")
      throw error
    }
  }

  async function withAction(fn: () => Promise<void>) {
    setIsActioning(true)
    try {
      await fn()
    } finally {
      setIsActioning(false)
    }
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

  async function handleActionSubmit() {
    if (task?.status === 'active') {
      const isAllDone = todos.every((todo) => todo.done)
      if (!isAllDone) {
        toast("Task is not yet complete", {
          description: "Please complete all todos before submitting.",
          style: {
            border: "1px solid #3b82f6",
            color: "#1e3a8a",
            backgroundColor: "#eff6ff"
          },
        })
        return
      }
    }
    await forceSyncTodos()
    await submit()
  }

  async function confirmGiveUp() {
    await withAction(async () => {
      await forceSyncTodos()
      await giveUp()
    })
    setShowGiveUpConfirm(false)
  }

  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden lg:overflow-hidden" style={{ backgroundColor: '#f9f9f3' }}>

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
              <span className={`text-sm font-medium ${STATUS_CONFIG[task.status].color}`}>
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

      <main className="min-h-0 flex-1 lg:overflow-hidden">
        <div className="mx-auto flex lg:h-full max-w-6xl flex-col gap-8 px-4 py-8 md:px-8 lg:flex-row lg:items-start lg:gap-10">

          {/* ── Left column ── */}
          <div className="flex min-h-0 w-full flex-col gap-6 lg:w-0 lg:flex-1 lg:h-full">
            <div className="shrink-0">
              <EditableTitle
                value={task.title}
                isReadOnly={isReadOnly}
                onCommit={updateTitle}
                displayClassName="line-clamp-4"
              />
            </div>

            <div className="flex flex-1 flex-col min-h-0 rounded-2xl border border-border bg-white/60 shadow-sm overflow-hidden">
              <div className="min-h-[135px] max-h-[calc(100vh-340px)] overflow-y-auto scroll-smooth [scrollbar-gutter:stable]">
                <div className="p-6">
                  <TodosPanel
                    todos={todos}
                    isReadOnly={isReadOnly}
                    onChange={handleTodosChange}
                  />
                </div>
              </div>
            </div>

            <div className="shrink-0 mt-1.5">
              <ActionBar
                status={task.status}
                isLoading={isActioning}
                onPause={() => withAction(async () => { await forceSyncTodos(); await pause() })}
                onResume={() => withAction(async () => { await resume() })}
                onSubmit={() => withAction(handleActionSubmit)}
                onGiveUp={() => setShowGiveUpConfirm(true)}
              />
            </div>
          </div>

          {/* ── Right column ── */}
          <div className="flex w-full shrink-0 flex-col gap-6 lg:h-full lg:w-72 xl:w-80">
            <div className="shrink-0">
              <TimerRing
                elapsedSec={elapsed}
                totalSec={totalSec}
                isReadOnly={isReadOnly}
              />
            </div>

            <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
              <NotesBar taskId={task.id} isReadOnly={isReadOnly} />
            </div>
          </div>
        </div>
      </main>

      <AlertDialog open={showGiveUpConfirm} onOpenChange={setShowGiveUpConfirm}>
        <AlertDialogContent className="w-[95vw] sm:max-w-2xl pt-8">
          <AlertDialogHeader className="gap-4">
            <AlertDialogTitle>Give up on this task?</AlertDialogTitle>
            <AlertDialogDescription className="gap-4 pb-3">
              This action cannot be undone. The task will be marked as given up.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row justify-center gap-4 sm:justify-center py-4">
            <AlertDialogCancel className="w-16 hover:bg-gray">No</AlertDialogCancel>
            <AlertDialogAction
              className="w-16 bg-red-600 hover:bg-red-700 text-white"
              onClick={confirmGiveUp}
            >
              Yes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}