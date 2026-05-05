import { AlertTriangle, Plus, Sprout } from 'lucide-react'
import { TaskCard } from './task-card'
import type { TaskSummary, QuotaToday } from '@/types/task'
import { Alert } from '@/components/ui/alert'

// ─── Sub-components tách biệt (Chỉ dùng nội bộ trong file này) ─────────────

function TaskHeader({ quota, onNewTask, hideButton }: { quota: QuotaToday, onNewTask: () => void, hideButton: boolean }) {
  const remaining = quota.limit - quota.used
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Today's Tasks</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{quota.used}</span>
          /{quota.limit} tasks today
          {remaining > 0 && (
            <span className="ml-1.5 text-primary">· {remaining} remainings</span>
          )}
        </p>
      </div>
      {!hideButton && (
        <button
          type="button"
          onClick={onNewTask}
          className="flex shrink-0 items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity shadow-sm"
        >
          <Plus className="h-4 w-4" />
          New Task
        </button>
      )}
    </div>
  )
}

function EmptyState({ onNewTask }: { onNewTask: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border bg-card/40 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
        <Sprout className="h-6 w-6 text-primary" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">No tasks yet</p>
        <p className="mt-1 text-xs text-muted-foreground">Start a focus session to grow your garden.</p>
      </div>
      <button
        type="button"
        onClick={onNewTask}
        className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
      >
        <Plus className="h-4 w-4" />
        New Task
      </button>
    </div>
  )
}

// ─── Main Component (Giữ nguyên Props signature để file Index không lỗi) ───

interface TaskListProps {
  tasks: TaskSummary[]
  quota: QuotaToday
  onNewTask: () => void
}

export function TaskList({ tasks, quota, onNewTask }: TaskListProps) {
  const quotaExceeded = quota.used >= quota.limit

  return (
    <div className="flex flex-col gap-4">
      <TaskHeader 
        quota={quota} 
        onNewTask={onNewTask} 
        hideButton={quotaExceeded || tasks.length === 0} 
      />

      {quotaExceeded && (
        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          Daily limit reached ({quota.used}/{quota.limit}). Resets tomorrow.
        </Alert>
      )}

      <div className="mt-2">
        {tasks.length === 0 ? (
          <EmptyState onNewTask={onNewTask} />
        ) : (
          <ul className="flex flex-col gap-3">
            {tasks.map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}