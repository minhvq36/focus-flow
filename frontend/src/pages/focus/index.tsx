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

export default function FocusPage() {
  const { taskId } = useParams<{ taskId: string }>()
  const navigate = useNavigate()
  const { task, isLoading, pause, resume, submit, giveUp, updateTodos, updateTitle } =
    useTaskDetail(taskId!)

  const [elapsed, setElapsed] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [showGiveUpConfirm, setShowGiveUpConfirm] = useState(false)

  const seededRef = useRef(false)
  useEffect(() => {
    if (!task || seededRef.current) return
    seededRef.current = true
    setElapsed(calcElapsed(task.actual_duration_sec, task.started_at))
  }, [task])

  useEffect(() => {
    // 1. Dọn dẹp interval cũ nếu có
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (!task || task.status !== 'active' || !task.started_at) return

    // 2. PARSE NGÀY CHỈ MỘT LẦN KHI MOUNT/ACTIVE (Tối ưu hiệu năng)
    const startTimeMs = new Date(task.started_at).getTime()
    const baseDurationSec = task.actual_duration_sec

    // 3. Hàm tính toán và cập nhật giờ dựa trên mốc thời gian tuyệt đối (Date.now())
    const updateTimer = () => {
      const nowMs = Date.now()
      const deltaSec = Math.floor((nowMs - startTimeMs) / 1000)
      setElapsed(baseDurationSec + Math.max(0, deltaSec))
    }

    // Set ngay lập tức để tránh delay 1s đầu tiên
    updateTimer()

    // Chạy interval mỗi giây
    intervalRef.current = setInterval(updateTimer, 1000)

    // 4. BÍ KÍP CHỐNG LAGGING KHI ĐỔI TAB: Lắng nghe sự kiện tab được focus lại
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateTimer() // Cập nhật ngay tức thì khi người dùng quay lại tab
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  },[task?.status, task?.started_at, task?.actual_duration_sec])

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
    try {
      await updateTodos(todos)
    } catch (error) {
      // TODO: To map with specific error from api
      toast.error("An error occurred. Try to check connection.")
      throw error
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

// --- 1. HÀM XỬ LÝ SUBMIT CHẶN KHI CHƯA XONG TODOS ---
  async function handleActionSubmit() {
    // Chỉ check khi task đang active
    if (task?.status === 'active') {
      const isAllDone = todos.every((todo) => todo.done)
      
      if (!isAllDone) {
        // Bắn Sonner toast với border xanh như yêu cầu và KHÔNG gọi API
        toast("Task is not yet complete", {
          description: "Please complete all todos before submitting.",
          style: {
            border: "1px solid #3b82f6", // Border màu xanh (blue-500)
            color: "#1e3a8a", 
            backgroundColor: "#eff6ff"
          },
        })
        return
      }
    }

    // Pass qua được thì tiến hành sync todos và gọi API submit
    await forceSyncTodos()
    await submit()
  }

  // --- 2. HÀM XỬ LÝ GIVE UP (Chỉ mở popup) ---
  function handleActionGiveUp() {
    setShowGiveUpConfirm(true)
  }

  // --- 3. HÀM XÁC NHẬN GIVE UP (Khi user bấm Yes trong popup) ---
  async function confirmGiveUp() {
    await forceSyncTodos()
    await giveUp()
    setShowGiveUpConfirm(false)
  }

  return (
    // THAY ĐỔI 1: Chỉ overflow-hidden ở desktop (lg). 
    // Mobile bắt buộc phải cho cuộn toàn trang vì 2 cột xếp chồng lên nhau.
    <div className="flex min-h-dvh flex-col overflow-x-hidden lg:overflow-hidden" style={{ backgroundColor: '#f9f9f3' }}>

      {/* Header (Giữ nguyên) */}
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

      {/* Body */}
      <main className="min-h-0 flex-1 lg:overflow-hidden">
        {/* THAY ĐỔI 2: lg:h-full giúp desktop chốt cứng chiều cao, mobile thì tự do giãn */}
        <div className="mx-auto flex lg:h-full max-w-6xl flex-col gap-8 px-4 py-8 md:px-8 lg:flex-row lg:items-start lg:gap-10">

          {/* ── Left column ── */}
          <div className="flex min-h-0 w-full flex-col gap-6 lg:w-0 lg:flex-1 lg:h-full">

            {/* THAY ĐỔI 3: Bỏ max-h-32 và overflow-hidden. Để EditableTitle tự do múa */}
            <div className="shrink-0">
              <EditableTitle
                value={task.title}
                isReadOnly={isReadOnly}
                onCommit={updateTitle}
                displayClassName="line-clamp-4"
              />
            </div>

            {/* THAY ĐỔI 4: Bí kíp flex-1 min-h-0 thay cho calc() */}
            {/* Vẫn xài trick tách lớp 2 div như cũ để scrollbar đẹp mắt */}
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

            {/* Action bar (Giữ nguyên) */}
            <div className="shrink-0 mt-1.5">
                <ActionBar
                  status={task.status}
                  onPause={async () => { await forceSyncTodos(); await pause() }}
                  onResume={async () => { await resume() }}
                  onSubmit={handleActionSubmit}
                  onGiveUp={handleActionGiveUp}
                />
            </div>
          </div>

          {/* ── Right column ── */}
          {/* w-full ở mobile, lg:w-72 ở desktop */}
          <div className="flex w-full shrink-0 flex-col gap-6 lg:h-full lg:w-72 xl:w-80">

            <div className="shrink-0">
              <TimerRing
                elapsedSec={elapsed}
                totalSec={totalSec}
                isReadOnly={isReadOnly}
              />
            </div>

            {/* THAY ĐỔI 5: Tương tự Todos, thêm flex flex-col cho container của Notes */}
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
            <AlertDialogAction className="w-16 bg-red-600 hover:bg-red-700 text-white" onClick={confirmGiveUp}>Yes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </div>
  )
}