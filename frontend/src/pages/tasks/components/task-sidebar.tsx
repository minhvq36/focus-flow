import { useTranslation } from 'react-i18next'
import { FilterPanel } from './filter-panel'
import type { FilterState } from '@/types/task'

// ─── Garden placeholder ───────────────────────────────────────────────────────

function GardenPlaceholder() {
  const { t } = useTranslation('tasks')

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
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
      <p className="text-sm text-muted-foreground">{t('sidebar.garden_awaits', { defaultValue: 'Your garden awaits your focus' })}</p>
    </div>
  )
}

// ─── TaskSidebar ──────────────────────────────────────────────────────────────

interface TaskSidebarProps {
  filter: FilterState
  onFilterChange: (next: FilterState) => void
}

export function TaskSidebar({ filter, onFilterChange }: TaskSidebarProps) {
  const { t } = useTranslation('tasks')

  return (
    <div className="flex flex-col gap-4">

      {/* ── Filters ── */}
      <FilterPanel value={filter} onChange={onFilterChange} />

      {/* ── Focus summary card ── */}
      <div className="rounded-xl border border-border bg-card/60 p-5 backdrop-blur-sm">
        <p className="text-sm font-semibold text-foreground">{t('sidebar.summary_title', { defaultValue: 'Focus summary' })}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {t('sidebar.summary_desc', { defaultValue: 'Complete tasks to grow plants in your garden.' })}
        </p>
        <GardenPlaceholder />
      </div>
    </div>
  )
}