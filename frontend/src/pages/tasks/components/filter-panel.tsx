"use client"
import type { DateRange, FilterState, TaskStatus } from "@/types/task"
import { useState, useMemo } from "react"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import { ChevronUp, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface FilterPanelProps {
  value: FilterState
  onChange: (next: FilterState) => void
}

// ─── Helper: Create filter options from translations ──────────────────────────

interface FilterOptions {
  dateRange: { value: DateRange; label: string }[]
  status: {
    value: TaskStatus
    label: string
    dotClass: string
    badgeClass: string
  }[]
  dateLabel: Record<DateRange, string>
}

function createFilterOptions(t: TFunction<'tasks'>): FilterOptions {
  return {
    dateRange: [
      { value: "today", label: t('filter.today', { defaultValue: 'Today' }) },
      { value: "yesterday", label: t('filter.yesterday', { defaultValue: 'Yesterday' }) },
      { value: "7days", label: t('filter.7days', { defaultValue: '7 days' }) },
      { value: "30days", label: t('filter.30days', { defaultValue: '30 days' }) },
    ],
    status: [
      {
        value: "active",
        label: t('status.active'),
        dotClass: "bg-emerald-500",
        badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
      },
      {
        value: "paused",
        label: t('status.paused'),
        dotClass: "bg-amber-500",
        badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
      },
      {
        value: "submitted",
        label: t('status.submitted'),
        dotClass: "bg-primary",
        badgeClass: "border-primary/20 bg-primary/10 text-primary",
      },
      {
        value: "given_up",
        label: t('status.given_up'),
        dotClass: "bg-red-500",
        badgeClass: "border-red-200 bg-red-50 text-red-600",
      },
    ],
    dateLabel: {
      today: t('filter.today', { defaultValue: 'Today' }),
      yesterday: t('filter.yesterday', { defaultValue: 'Yesterday' }),
      "7days": t('filter.7days', { defaultValue: '7 days' }),
      "30days": t('filter.30days', { defaultValue: '30 days' }),
    },
  }
}

export function FilterPanel({ value, onChange }: FilterPanelProps) {
  const { t } = useTranslation('tasks')
  const [open, setOpen] = useState(false)

  // Memoize options - recreate only when translations change (i.e., language switch)
  const options = useMemo(() => createFilterOptions(t), [t])

  function setDateRange(range: DateRange) {
    onChange({ ...value, dateRange: range })
  }

  function toggleStatus(status: TaskStatus) {
    const next = new Set(value.statusFilters)
    if (next.has(status)) next.delete(status)
    else next.add(status)
    onChange({ ...value, statusFilters: next })
  }

  const activeStatusCount = value.statusFilters.size
  const Chevron = open ? ChevronUp : ChevronDown

  return (
    <aside
      aria-label="Filters"
      className="rounded-xl border border-border bg-card/80 shadow-sm backdrop-blur-sm overflow-hidden"
    >
      {/* ── Toggle header ── */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/40 transition-colors"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          {t('filter.title', { defaultValue: 'Filters' })}
          {!open && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-normal">
              <span className="text-foreground font-medium">
                {options.dateLabel[value.dateRange]}
              </span>
              {activeStatusCount > 0 && (
                <>
                  <span>&middot;</span>
                  <span>{activeStatusCount} {t('filter.status_indicator', { defaultValue: 'status' })}</span>
                </>
              )}
            </span>
          )}
        </span>
        <Chevron className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </button>

      {/* ── Expandable body ── */}
      {open && (
        <div className="flex flex-col gap-5 border-t border-border px-4 py-4">
          {/* Date range */}
          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              {t('filter.time_section', { defaultValue: 'Time' })}
            </p>
            <div className="grid grid-cols-2 gap-1.5" role="group" aria-label="Date range">
              {options.dateRange.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDateRange(opt.value)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium transition-colors text-center",
                    value.dateRange === opt.value
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-background text-muted-foreground hover:text-foreground hover:border-foreground/30"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              {t('filter.status_section', { defaultValue: 'Status' })}
            </p>
            <div className="flex flex-col gap-1.5" role="group" aria-label="Status filter">
              {options.status.map((opt) => {
                const active = value.statusFilters.has(opt.value)
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleStatus(opt.value)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors text-left",
                      active
                        ? opt.badgeClass
                        : "border-border bg-background text-muted-foreground hover:text-foreground hover:border-foreground/30"
                    )}
                  >
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full shrink-0",
                        active ? opt.dotClass : "bg-muted-foreground/30"
                      )}
                      aria-hidden="true"
                    />
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}