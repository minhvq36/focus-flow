import { useNavigate } from 'react-router-dom'
import { Play, Eye, Send, Clock, Sprout, Pause, CheckSquare, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TaskSummary, TaskStatus } from '@/types/task'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(min: number) {
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

function formatDateUTC(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}
function isTodayUTC(iso: string) {
  const todayUTC = new Date().toISOString().slice(0, 10)
  const dateUTC = new Date(iso).toISOString().slice(0, 10)

  return dateUTC === todayUTC
}

// ─── Status config ────────────────────────────────────────────────────────────

type StatusCfg = {
  border: string
  badge: string
  dot: string
  label: string
  icon: React.ReactNode
}

const STATUS_CFG: Record<TaskStatus, StatusCfg> = {
  active: {
    border: 'border-l-emerald-400',
    badge:  'border-emerald-200 bg-emerald-50 text-emerald-700',
    dot:    'bg-emerald-500',
    label:  'Active',
    icon:   null,
  },
  paused: {
    border: 'border-l-amber-400',
    badge:  'border-amber-200 bg-amber-50 text-amber-700',
    dot:    'bg-amber-500',
    label:  'Paused',
    icon:   <Pause className="h-3 w-3" aria-hidden />,
  },
  submitted: {
    border: 'border-l-primary',
    badge:  'border-primary/20 bg-primary/10 text-primary',
    dot:    'bg-primary',
    label:  'Submitted',
    icon:   <CheckSquare className="h-3 w-3" aria-hidden />,
  },
  given_up: {
    border: 'border-l-red-300',
    badge:  'border-red-200 bg-red-50 text-red-600',
    dot:    'bg-red-500',
    label:  'Given up',
    icon:   null,
  },
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: TaskSummary
  onSubmit?: (taskId: string) => void
  isSubmitting?: boolean
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TaskCard({ task, onSubmit, isSubmitting = false }: TaskCardProps) {
  const navigate = useNavigate()
  const cfg = STATUS_CFG[task.status]

  const isActive    = task.status === 'active'
  const isPaused    = task.status === 'paused'
  const isSubmitted = task.status === 'submitted'
  const isGivenUp   = task.status === 'given_up'
  const isTerminal  = isSubmitted || isGivenUp

  return (
    <li className={`
      rounded-xl border border-border border-l-4 ${cfg.border}
      bg-card/80 p-4 shadow-sm backdrop-blur-sm
      transition-shadow hover:shadow-md
    `}>
      <div className="flex items-start justify-between gap-3">

        {/* ── Content ── */}
        <div className="flex min-w-0 flex-1 flex-col gap-2">

          {/* Title + status badge */}
          <div className="flex items-center gap-2 min-w-0">
            <span className={`
              text-[15px] font-semibold leading-snug
              truncate max-w-full
              ${isSubmitted ? 'line-through decoration-muted-foreground text-foreground' : ''}
              ${isGivenUp   ? 'text-muted-foreground' : 'text-foreground'}
            `}>
              {task.title}
            </span>

            <span className={`
              inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5
              text-[11px] font-medium whitespace-nowrap shrink-0 ${cfg.badge}
            `}>
              <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${cfg.dot}`} aria-hidden />
              {cfg.label}
              {cfg.icon}
            </span>
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
                <Sprout className="h-3 w-3 text-primary" aria-hidden />
                {task.todo_done_count}/{task.todo_count} todos
              </span>
            )}
            {!isTodayUTC(task.created_at) && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" aria-hidden />
                {formatDateUTC(task.created_at)}
              </span>
            )}
            {task.penalty_mode && (
              <span
                title="Penalty mode — give up affects your garden"
                className="cursor-default select-none text-[0.65rem]"
                aria-label="Penalty mode enabled"
              >
                ⚔️
              </span>
            )}
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="flex shrink-0 items-center gap-2">
          {isActive && (
            <button
              type="button"
              onClick={() => navigate(`/focus/${task.id}`)}
              className="inline-flex items-center gap-1.5 rounded-md px-3 h-8 text-xs font-medium bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-0 shadow-none transition-colors"
            >
              <Play className="h-3 w-3" />
              Resume
            </button>
          )}

          {isPaused && (
            <>
              <button
                type="button"
                onClick={() => navigate(`/focus/${task.id}`)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 h-8 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors",
                  isSubmitting && "opacity-50 pointer-events-none"
                )}
              >
                <Play className="h-3 w-3" />
                Resume
              </button>

              <button
                type="button"
                onClick={() => onSubmit?.(task.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 h-8 text-xs font-medium text-muted-foreground hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-colors",
                  isSubmitting && "opacity-50 pointer-events-none"
                )}
              >
                <Send className="h-3 w-3" />
                {isSubmitting ? 'Submit' : 'Submit'}
              </button>
            </>
          )}

          {isTerminal && (
            <button
              type="button"
              onClick={() => navigate(`/focus/${task.id}`)}
              aria-label="View details"
              className="inline-flex items-center justify-center rounded-md h-8 w-8 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <Eye className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </li>
  )
}