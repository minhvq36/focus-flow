import { TimerIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Format seconds to mm:ss or mmm:ss
 * Handles cases where minutes > 60 without showing hours
 */
function formatSec(sec: number) {
  /* Calculate total minutes and remaining seconds directly */
  const m = Math.floor(sec / 60)
  const s = sec % 60
  
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

interface TimerRingProps {
  elapsedSec: number
  totalSec: number
  isReadOnly: boolean
  onReset?: () => void
}

export function TimerRing({ elapsedSec, totalSec, isReadOnly, onReset }: TimerRingProps) {
  /* 
     Apply cap logic: 
     The displayed elapsed time must not exceed the registered total time.
     This UI-only cap prevents the "active task indefinitely" bug visual.
  */
  const cappedElapsed = Math.min(elapsedSec, totalSec)
  
  const R = 92
  const STROKE = 7
  const SIZE = (R + STROKE) * 2
  const circumference = 2 * Math.PI * R
  
  /* Progress calculation based on capped value */
  const progress = totalSec > 0 ? Math.min(cappedElapsed / totalSec, 1) : 0
  const dashOffset = circumference * (1 - progress)

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative flex items-center justify-center">
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="-rotate-90"
          aria-hidden="true"
        >
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke="currentColor"
            strokeWidth={STROKE}
            className="text-border"
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke="currentColor"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className={cn(
              "transition-all duration-500",
              isReadOnly ? "text-muted-foreground/50" : "text-primary"
            )}
          />
        </svg>

        {/* 
            Using DM Mono as requested. 
            Ensure "DM Mono" is imported in your global CSS or tailwind config.
        */}
        <div className="absolute flex flex-col items-center gap-0.5">
          <span
            className="tabular-nums text-foreground"
            style={{ 
              fontFamily: "'DM Mono', monospace",
              fontSize: "clamp(2rem, 5vw, 3rem)", 
              fontWeight: 500, 
              lineHeight: 1.1 
            }}
          >
            {formatSec(cappedElapsed)}
          </span>
          <span 
            className="text-sm tabular-nums text-muted-foreground"
            style={{ fontFamily: "'DM Mono', monospace" }}
          >
            / {formatSec(totalSec)}
          </span>
          {isReadOnly && (
            <span className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
              <TimerIcon className="h-3 w-3" />
              actual time used
            </span>
          )}
        </div>
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="absolute bottom-8 text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors"
            aria-label="Reset timer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}