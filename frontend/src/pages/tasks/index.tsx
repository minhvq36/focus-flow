import { useState } from 'react'
import { Loader2, AlertTriangle } from 'lucide-react'
import { useTasks } from './hooks/use-tasks'
import { TaskList } from './components/task-list'
import { TaskSidebar } from './components/task-sidebar'
import { CreateTaskModal } from './components/create-task-modal'
import { Alert } from '@/components/ui/alert'
import { DEFAULT_FILTER } from '@/types/task'
import type { FilterState } from '@/types/task'

// Chiều cao header + padding + quota text + alert row (khi xuất hiện)
const HEIGHT_BASE    = 'calc(100vh - 220px)'
const HEIGHT_COMPACT = 'calc(100vh - 284px)' // 220 + ~64px alert height

export default function TasksPage() {
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER)
  const { tasks, quota, loading, error, reload } = useTasks(filter)
  const [modalOpen, setModalOpen] = useState(false)

  const quotaExceeded = quota.used >= quota.limit

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
            <TaskList
              tasks={tasks}
              quota={quota}
              onNewTask={() => setModalOpen(true)}
              maxHeight={quotaExceeded ? HEIGHT_COMPACT : HEIGHT_BASE}
            />
          )}
        </section>

        {/* ── Right: filters + garden summary ── */}
        <aside className="hidden md:block md:w-[40%]">
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