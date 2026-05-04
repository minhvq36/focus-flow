import { useNavigate } from 'react-router-dom'
import { Play, Pause, CheckSquare, Clock, Sprout } from 'lucide-react'
import type { TaskSummary, TaskStatus } from '@/types/task'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(min: number) {
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

// ─── Status config ────────────────────────────────────────────────────────────

type StatusCfg = {
  label: string
  border: string
  badge: string
  dot: string
  icon: React.ReactNode
}

const STATUS_CFG: Record<TaskStatus, StatusCfg> = {
  active: {
    label: 'Active',
    border: 'border-l-primary',
    badge: 'bg-secondary text-secondary-foreground border-border',
    dot: 'bg-primary',
    icon: null,
  },
  paused: {
    label: 'Paused',
    border: 'border-l-[var(--chart-4)]',
    badge: 'bg-accent text-accent-foreground border-border',
    dot: 'bg-[var(--chart-4)]',
    icon: <Pause className="h-2.5 w-2.5" aria-hidden />,
  },
  submitted: {
    label: 'Submitted',
    border: 'border-l-muted',
    badge: 'bg-muted text-muted-foreground border-border',
    dot: 'bg-muted-foreground',
    icon: <CheckSquare className="h-2.5 w-2.5" aria-hidden />,
  },
  given_up: {
    label: 'Given up',
    border: 'border-l-destructive/50',
    badge: 'bg-muted text-muted-foreground border-border',
    dot: 'bg-destructive/60',
    icon: null,
  },
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: TaskSummary
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TaskCard({ task }: TaskCardProps) {
  const navigate = useNavigate()
  const cfg = STATUS_CFG[task.status]
  const isTerminal = task.status === 'submitted' || task.status === 'given_up'
  const isActionable = task.status === 'active' || task.status === 'paused'

  return (
    <li className={`
      rounded-xl border border-border border-l-4 ${cfg.border}
      bg-card px-4 py-3.5 shadow-sm transition-shadow hover:shadow-md
    `}>
      <div className="flex items-start gap-3">
        {/* Content */}
        <div className="flex flex-1 min-w-0 flex-col gap-2">

          {/* Title row */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={`
              text-[15px] font-semibold leading-snug
              ${task.status === 'submitted' ? 'line-through text-muted-foreground' : ''}
              ${task.status === 'given_up' ? 'text-muted-foreground' : 'text-foreground'}
            `}>
              {task.title}
            </span>

            {/* Status badge */}
            <span className={`
              inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5
              text-[11px] font-medium ${cfg.badge}
            `}>
              <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${cfg.dot}`} aria-hidden />
              {cfg.label}
              {cfg.icon}
            </span>

            {/* Penalty mode indicator */}
            {task.penalty_mode && (
              <span
                title="Penalty mode — give up affects your garden"
                className="text-[13px] leading-none cursor-default select-none"
                aria-label="Penalty mode enabled"
              >
                ⚔️
              </span>
            )}
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {!isTerminal && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" aria-hidden />
                {formatDuration(task.registered_duration_min)}
              </span>
            )}
            {task.todo_count > 0 && (
              <span className="flex items-center gap-1">
                <Sprout className="h-3 w-3" aria-hidden />
                {task.todo_done_count}/{task.todo_count} todos
              </span>
            )}
          </div>
        </div>

        {/* Action button */}
        {isActionable && (
          <button
            type="button"
            onClick={() => navigate(`/focus/${task.id}`)}
            className="
              shrink-0 flex items-center gap-1.5
              rounded-lg border border-border bg-secondary
              px-3 py-1.5 text-xs font-medium text-secondary-foreground
              hover:bg-primary hover:text-primary-foreground hover:border-primary
              transition-colors
            "
          >
            <Play className="h-3 w-3" />
            {task.status === 'paused' ? 'Resume' : 'Focus'}
          </button>
        )}
      </div>
    </li>
  )
}