import { useState } from 'react'
import { Loader2, AlertTriangle } from 'lucide-react'
import { useTasks } from './hooks/use-tasks'
import { TaskList } from './components/task-list'
import { CreateTaskModal } from './components/create-task-modal'

// ─── Focus summary sidebar (placeholder until Garden API ready) ───────────────

function FocusSidebar() {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-6 backdrop-blur-sm">
      <p className="text-sm font-semibold text-foreground">Focus summary</p>
      <p className="mt-2 text-sm text-muted-foreground">
        Complete tasks to grow plants in your garden.
      </p>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 py-9">
        <svg viewBox="0 0 80 80" className="h-16 w-16" aria-hidden>
          <circle cx="40" cy="40" r="38" fill="var(--color-secondary)" />
          <line x1="40" y1="65" x2="40" y2="38" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" />
          <ellipse cx="32" cy="50" rx="9" ry="4.5" fill="var(--color-primary)" transform="rotate(-25 32 50)" />
          <ellipse cx="48" cy="45" rx="9" ry="4.5" fill="var(--color-primary)" transform="rotate(25 48 45)" />
          <circle cx="40" cy="34" r="5" fill="var(--color-chart-2)" />
        </svg>
        <p className="text-sm text-muted-foreground">Your garden awaits your focus</p>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const { tasks, quota, loading, error, reload } = useTasks()
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8">
      <div className="flex gap-6">

        {/* Left — task list (60%) */}
        <section className="w-full md:w-[63%]">
          {loading ? (
            <div className="flex items-center justify-center py-24 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-accent px-4 py-3 text-sm text-accent-foreground">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
              {error}
              <button
                type="button"
                onClick={reload}
                className="ml-auto text-xs underline underline-offset-2 hover:opacity-70 transition-opacity"
              >
                Retry
              </button>
            </div>
          ) : (
            <TaskList
              tasks={tasks}
              quota={quota}
              onNewTask={() => setModalOpen(true)}
            />
          )}
        </section>

        {/* Right — sidebar (40%) */}
        <aside className="hidden md:block md:w-[40%]">
          <FocusSidebar />
        </aside>

      </div>

      <CreateTaskModal
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  )
}