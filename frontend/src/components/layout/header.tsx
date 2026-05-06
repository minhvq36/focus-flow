import { Link, useLocation } from 'react-router-dom'
import { useEffect, useState } from "react"
import { Sprout } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

const tabs = [
  { path: '/garden', label: 'My Garden' },
  { path: '/tasks',  label: 'My Tasks'  },
]

function UtcClock() {
  const [display, setDisplay] = useState<{ date: string; time: string } | null>(null)

  useEffect(() => {
    function tick() {
      const now = new Date()
      const date = now.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      })
      const hh = String(now.getUTCHours()).padStart(2, "0")
      const mm = String(now.getUTCMinutes()).padStart(2, "0")
      const ss = String(now.getUTCSeconds()).padStart(2, "0")
      setDisplay({ date, time: `${hh}:${mm}:${ss}` })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  if (!display) return null

  return (
    <div
      className="hidden items-center gap-2 rounded-md px-3 py-1.5 md:flex"
      title="Current date and time in UTC"
      aria-label={`UTC: ${display.date} ${display.time}`}
    >
      <span className="text-xs text-muted-foreground">{display.date}</span>
      <span className="h-3 w-px bg-border" aria-hidden="true" />
      <span className="font-mono text-xs font-medium tabular-nums text-foreground">{display.time}</span>
      <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">UTC</span>
    </div>
  )
}

export default function Header() {
  const { pathname } = useLocation()

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-[var(--header-bg)] backdrop-blur-lg backdrop-saturate-150">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">

        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Sprout className="h-4 w-4" aria-hidden="true" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-foreground">FocusFlow</span>
        </div>

        {/* Tab navigation */}
        <nav className="items-center gap-1 md:flex">
          {tabs.map(({ path, label }) => (
            <Link
              key={path}
              to={path}
              className={cn(
                'px-3 py-1.5 text-sm rounded-md transition-colors',
                pathname === path
                  ? 'bg-secondary text-secondary-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
              )}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Right */}
        <div className="flex items-center gap-2">
          <UtcClock />
          <span className="flex items-center gap-1 text-sm text-foreground/80">🪙 <strong>0</strong></span>
          <span className="flex items-center gap-1 text-sm text-foreground/80">💛 <strong>0</strong></span>

          <Avatar className="h-8 w-8 cursor-pointer">
            <AvatarFallback className="bg-secondary text-secondary-foreground text-xs font-medium">
              U
            </AvatarFallback>
          </Avatar>
        </div>

      </div>
    </header>
  )
}