"use client"
import type { DateRange, FilterState, TaskStatus } from "@/types/task"
import { useState } from "react"
import { ChevronUp, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface FilterPanelProps {
  value: FilterState
  onChange: (next: FilterState) => void
}

const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: "today",     label: "Today"     },
  { value: "yesterday", label: "Yesterday" },
  { value: "7days",     label: "7 days"    },
  { value: "30days",    label: "30 days"   },
]

const STATUS_OPTIONS: {
  value: TaskStatus
  label: string
  dotClass: string
  badgeClass: string
}[] = [
  {
    value: "active",
    label: "Active",
    dotClass:   "bg-emerald-500",
    badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  {
    value: "paused",
    label: "Paused",
    dotClass:   "bg-amber-500",
    badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
  },
  {
    value: "submitted",
    label: "Submitted",
    dotClass:   "bg-primary",
    badgeClass: "border-primary/20 bg-primary/10 text-primary",
  },
  {
    value: "given_up",
    label: "Given up",
    dotClass:   "bg-red-500",
    badgeClass: "border-red-200 bg-red-50 text-red-600",
  },
]

const DATE_LABEL: Record<DateRange, string> = {
  today:     "Today",
  yesterday: "Yesterday",
  "7days":   "7 days",
  "30days":  "30 days",
}

export function FilterPanel({ value, onChange }: FilterPanelProps) {
  const [open, setOpen] = useState(false)

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
          Filters
          {!open && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-normal">
              <span className="text-foreground font-medium">
                {DATE_LABEL[value.dateRange]}
              </span>
              {activeStatusCount > 0 && (
                <>
                  <span>&middot;</span>
                  <span>{activeStatusCount} status</span>
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
              Time
            </p>
            <div className="grid grid-cols-2 gap-1.5" role="group" aria-label="Date range">
              {DATE_RANGE_OPTIONS.map((opt) => (
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
              Status
            </p>
            <div className="flex flex-col gap-1.5" role="group" aria-label="Status filter">
              {STATUS_OPTIONS.map((opt) => {
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