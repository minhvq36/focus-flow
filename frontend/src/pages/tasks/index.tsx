import { useState } from 'react'
import { Loader2, AlertTriangle } from 'lucide-react'
import { useTasks } from './hooks/use-tasks'
import { TaskList } from './components/task-list'
import { TaskSidebar } from './components/task-sidebar'
import { CreateTaskModal } from './components/create-task-modal'
import { Alert } from '@/components/ui/alert'
import { DEFAULT_FILTER } from '@/types/task'
import type { FilterState } from '@/types/task'
import { useEffect } from 'react';

export default function TasksPage() {
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER)
  const { tasks, quota, loading, error, reload } = useTasks(filter)
  const[modalOpen, setModalOpen] = useState(false)
  
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("toggle-bg", { 
      detail: { paused: modalOpen } 
    }));
    
    // Tạm dừng luôn cả CSS Background Gradient
    if (modalOpen) {
      document.body.classList.add("modal-open-pause-bg");
    } else {
      document.body.classList.remove("modal-open-pause-bg");
    }

    return () => {
      document.body.classList.remove("modal-open-pause-bg");
      window.dispatchEvent(new CustomEvent("toggle-bg", { detail: { paused: false } }));
    };
  }, [modalOpen]);

  return (
    // THAY ĐỔI 1: Thêm h-full và flex flex-col để Container ăn trọn chiều cao từ AppLayout
    <div className="mx-auto flex h-full w-full max-w-6xl flex-col px-4 py-8 md:px-8">
      
      {/* THAY ĐỔI 2: flex-1 min-h-0 giúp nội dung bên trong không bao giờ bị tràn ra ngoài */}
      <div className="flex flex-1 gap-6 min-h-0">

        {/* ── Left: task list ── */}
        {/* THAY ĐỔI 3: Chỉnh lại width thành w-3/5 (~60%) thay vì 63% để cộng với sidebar 40% (w-2/5) không bị lố */}
        <section className="flex w-full flex-col md:w-[63%] min-h-0">
          
          {loading ? (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : error ? (
            <Alert variant="error" className="flex items-center">
              <AlertTriangle aria-hidden />
              {error}
              <button
                type="button"
                onClick={reload}
                className="ml-auto text-xs underline underline-offset-2 hover:opacity-70 transition-opacity"
              >
                Retry
              </button>
            </Alert>
          ) : (
            // THAY ĐỔI 4: Không cần truyền maxHeight vào đây nữa!
            // Component TaskList sẽ tự động chiếm vùng không gian còn lại nhờ Flexbox.
            <TaskList
              tasks={tasks}
              quota={quota}
              onNewTask={() => setModalOpen(true)}
            />
          )}
        </section>

        {/* ── Right: filters + garden summary ── */}
        {/* THAY ĐỔI 5: Dùng w-2/5 (40%) và shrink-0 để không bị bóp */}
        <aside className="hidden md:w-[37%] shrink-0 md:block">
          <TaskSidebar
            filter={filter}
            onFilterChange={setFilter}
          />
        </aside>

      </div>

      <CreateTaskModal
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  )
}