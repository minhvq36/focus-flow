import { useState } from 'react'
import { Loader2, AlertTriangle } from 'lucide-react'
import { useTasks } from './hooks/use-tasks'
import { TaskList } from './components/task-list'
import { TaskSidebar } from './components/task-sidebar'
import { CreateTaskModal } from './components/create-task-modal'
import { Alert } from '@/components/ui/alert'
import { DEFAULT_FILTER } from './components/filter-panel'
import type { FilterState } from './components/filter-panel'

export default function TasksPage() {
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER)
  const { tasks, quota, loading, error, reload } =
    useTasks(filter)
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8">
      <div className="flex gap-6">

        {/* ── Left: task list ── */}
        <section className="w-full md:w-[63%]">
          {loading ? (
            <div className="flex items-center justify-center py-24 text-muted-foreground">
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
            // Alert quota đã chuyển sang TaskSidebar — TaskList không cần quota nữa
            <TaskList
              tasks={tasks}
              quota={quota}
              onNewTask={() => setModalOpen(true)}
            />
          )}
        </section>

        {/* ── Right: filters + garden summary ── */}
        <aside className="hidden md:block md:w-[40%]">
          <TaskSidebar
            quota={quota}
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