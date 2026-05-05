import { AlertTriangle } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { FilterPanel } from './filter-panel'
import type { FilterState } from './filter-panel'
import type { QuotaToday } from '@/types/task'

// ─── Garden placeholder ───────────────────────────────────────────────────────

function GardenPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-9">
      <svg viewBox="0 0 80 80" className="h-16 w-16" aria-hidden>
        <circle cx="40" cy="40" r="38" fill="var(--color-secondary)" />
        <line
          x1="40" y1="65" x2="40" y2="38"
          stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round"
        />
        <ellipse cx="32" cy="50" rx="9" ry="4.5" fill="var(--color-primary)" transform="rotate(-25 32 50)" />
        <ellipse cx="48" cy="45" rx="9" ry="4.5" fill="var(--color-primary)" transform="rotate(25 48 45)" />
        <circle cx="40" cy="34" r="5" fill="var(--color-chart-2)" />
      </svg>
      <p className="text-sm text-muted-foreground">Your garden awaits your focus</p>
    </div>
  )
}

// ─── TaskSidebar ──────────────────────────────────────────────────────────────

interface TaskSidebarProps {
  quota: QuotaToday
  filter: FilterState
  onFilterChange: (next: FilterState) => void
}

export function TaskSidebar({ quota, filter, onFilterChange }: TaskSidebarProps) {
  const quotaExceeded = quota.used >= quota.limit

  return (
    <div className="flex flex-col gap-4">
      {/* ── Quota alert — lives here, never affects left column layout ── */}
      {quotaExceeded && (
        <Alert variant="warning" className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span className="text-sm">
            Daily limit reached ({quota.used}/{quota.limit}). Resets tomorrow.
          </span>
        </Alert>
      )}

      {/* ── Filters ── */}
      <FilterPanel value={filter} onChange={onFilterChange} />

      {/* ── Focus summary card ── */}
      <div className="rounded-xl border border-border bg-card/60 p-6 backdrop-blur-sm">
        <p className="text-sm font-semibold text-foreground">Focus summary</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Complete tasks to grow plants in your garden.
        </p>
        <GardenPlaceholder />
      </div>
    </div>
  )
}