import { TimerIcon } from "lucide-react"
import { cn } from "@/lib/utils"

function formatSec(sec: number) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

interface TimerRingProps {
  elapsedSec: number
  totalSec: number
  isReadOnly: boolean
}

export function TimerRing({ elapsedSec, totalSec, isReadOnly }: TimerRingProps) {
  const R = 88
  const STROKE = 7
  const SIZE = (R + STROKE) * 2
  const circumference = 2 * Math.PI * R
  const progress = Math.min(elapsedSec / totalSec, 1)
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

        <div className="absolute flex flex-col items-center gap-0.5">
          <span
            className="font-mono tabular-nums text-foreground"
            style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 500, lineHeight: 1.1 }}
          >
            {formatSec(elapsedSec)}
          </span>
          <span className="font-mono text-sm tabular-nums text-muted-foreground">
            / {formatSec(totalSec)}
          </span>
          {isReadOnly && (
            <span className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
              <TimerIcon className="h-3 w-3" />
              actual time used
            </span>
          )}
        </div>
      </div>
    </div>
  )
}