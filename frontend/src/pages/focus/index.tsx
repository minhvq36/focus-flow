import { useParams, Link } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useTaskDetail } from '@/pages/tasks/hooks/use-task-detail'
import { EditableTitle } from './components/editable-title'
import { TimerRing } from './components/timer-ring'
import { ExtendTime } from './components/extend-time'
import { TodosPanel } from './components/todos-panel'
import { NotesBar } from './components/notes-bar'
import { ActionBar } from './components/action-bar'
import { ArrowLeft, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { TodoItem } from '@/types/task'
import { cn } from '@/lib/utils'

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
  active:   { label: 'active',    color: 'text-emerald-600' },
  paused:   { label: 'paused',    color: 'text-amber-600'   },
  submitted:{ label: 'submitted', color: 'text-primary'     },
  given_up: { label: 'given_up',  color: 'text-red-500'     },
} as const

export default function FocusPage() {
  const { taskId } = useParams<{ taskId: string }>()
  const { t } = useTranslation('focus')
  const { task, isLoading, isFetching, pause, resume, submit, giveUp, updateTodos, updateTitle, extend, reset, toggleStar, isTogglingStar } =
    useTaskDetail(taskId!)

  const [elapsed, setElapsed] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [showGiveUpConfirm, setShowGiveUpConfirm] = useState(false)
  const [isActioning, setIsActioning] = useState(false)
  
  const isResettingRef = useRef(false)

  // ── Timer interval ────────────────────────────────────────────────────────
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (!task) return

    if (task.status !== 'active' || !task.started_at) {
      if (!isResettingRef.current) {
        setElapsed(calcElapsed(task.actual_duration_sec, task.started_at))
      }
      return
    }

    const startTimeMs = new Date(task.started_at).getTime()
    const baseDurationSec = task.actual_duration_sec

    const updateTimer = () => {
      const deltaSec = Math.floor((Date.now() - startTimeMs) / 1000)
      setElapsed(baseDurationSec + Math.max(0, deltaSec))
    }

    isResettingRef.current = false
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

  // ── Todos ─────────────────────────────────────────────────────────────────
  const [todos, setTodos] = useState<TodoItem[]>([])
  const todosInitRef = useRef(false)

  useEffect(() => {
    todosInitRef.current = false
  }, [task?.id])

  useEffect(() => {
    if (!task) return

    // Terminal status: luôn sync từ server, không cần guard
    if (task.status === 'submitted' || task.status === 'given_up') {
      setTodos(task.todos)
      return
    }

    // Đợi background refetch xong mới seed — tránh cache cũ đè lên DB mới
    // khi user back rồi resume lại
    if (isFetching) return

    // Đã seed rồi thì không seed lại — tránh API ngầm đè lên local state
    // khi user đang edit (toggle todo, v.v.)
    if (todosInitRef.current) return

    todosInitRef.current = true
    setTodos(task.todos)
  }, [task, isFetching])

  // ── Todos debounce ────────────────────────────────────────────────────────
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

  // ── Actions ───────────────────────────────────────────────────────────────
  async function withAction(fn: () => Promise<void>) {
    setIsActioning(true)
    try {
      await fn()
    } finally {
      setIsActioning(false)
    }
  }

  async function handleActionSubmit() {
    if (task?.status === 'active') {
      const isAllDone = todos.every((todo) => todo.done)
      if (!isAllDone) {
        toast(t('toast.task_incomplete_title'), {
          description: t('toast.task_incomplete_desc'),
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

  async function handleExtend(addMinutes: number) {
    await withAction(async () => {
      await extend(addMinutes)
      // seededRef không còn nữa — timer tự snap lại qua effect
      // [task?.actual_duration_sec, task?.started_at] khi invalidate xong
    })
  }

  async function handleReset() {
    await withAction(async () => {
      isResettingRef.current = true

      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }

      setElapsed(0)
      try {
        await reset()
        // KHÔNG finally clear flag ở đây
      } catch {
        // Chỉ clear khi fail — rollback hoàn toàn
        isResettingRef.current = false
        setElapsed(calcElapsed(task!.actual_duration_sec, task!.started_at))
        toast.error(t('toast.failed_reset_timer'))

        if (task!.status === 'active' && task!.started_at) {
          const startTimeMs = new Date(task!.started_at).getTime()
          const base = task!.actual_duration_sec
          intervalRef.current = setInterval(() => {
            const delta = Math.floor((Date.now() - startTimeMs) / 1000)
            setElapsed(base + Math.max(0, delta))
          }, 1000)
        }
      }
    })
  }

  // ── Guards ────────────────────────────────────────────────────────────────
  if (isLoading) return (
    <div className="flex min-h-dvh items-center justify-center text-muted-foreground text-sm">
      {t('loading_message')}
    </div>
  )

  if (!task) return (
    <div className="flex min-h-dvh items-center justify-center text-muted-foreground text-sm">
      {t('task_not_found')}
    </div>
  )

  const isReadOnly = task.status === 'submitted' || task.status === 'given_up'
  const totalSec = task.registered_duration_min * 60

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden lg:overflow-hidden" style={{ backgroundColor: '#f9f9f3' }}>

      <header className="shrink-0 border-b border-border/60 bg-[#f9f9f3]/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-8">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              asChild
            >
              <Link to="/tasks" aria-label={t('back_to_tasks')}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>

            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${STATUS_CONFIG[task.status].color}`}>
                {t(`status.${task.status}`)}
              </span>
              <span className="text-muted-foreground/40">·</span>
              <span className="text-sm text-muted-foreground">
                {t('min_session', { duration: task.registered_duration_min })}
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
            <div className="shrink-0 flex items-start gap-3">
              {/* Star — chỉ active/paused, to hơn task card 1 chút */}
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={() => toggleStar()}
                  disabled={isTogglingStar || isReadOnly}
                  aria-label={task.is_starred ? 'Unstar task' : 'Star task'}
                  className={cn(
                    'mt-2 shrink-0 transition-colors',
                    task.is_starred
                      ? 'text-amber-400 hover:text-amber-300'
                      : 'text-muted-foreground/30 hover:text-amber-400',
                    isTogglingStar && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <Star className={cn('h-4 w-4', task.is_starred && 'fill-amber-400')} />
                </button>
              )}
              <EditableTitle
                value={task.title}
                isReadOnly={isReadOnly}
                onCommit={updateTitle}
                displayClassName="line-clamp-4"
              />
            </div>

            <div className="flex flex-1 flex-col min-h-0 rounded-2xl border border-border bg-white/60 shadow-sm overflow-hidden">
              <div className="min-h-[135px] max-h-[calc(100vh-282px)] overflow-y-auto scroll-smooth [scrollbar-gutter:stable]">
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
                onReset={task.status === 'active' ? handleReset : undefined}
              />
              {(task.status === 'active' || task.status === 'paused') && (
                <div className="mt-2 flex justify-center">
                  <ExtendTime
                    registeredDurationMin={task.registered_duration_min}
                    disabled={isActioning}
                    onExtend={handleExtend}
                  />
                </div>
              )}
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
            <AlertDialogTitle>{t('confirm_give_up.title')}</AlertDialogTitle>
            <AlertDialogDescription className="gap-4 pb-3">
              {t('confirm_give_up.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row justify-center gap-4 sm:justify-center py-4">
            <AlertDialogCancel className="w-16 hover:bg-gray">{t('confirm_give_up.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="w-16 bg-red-600 hover:bg-red-700 text-white"
              onClick={confirmGiveUp}
            >
              {t('confirm_give_up.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}