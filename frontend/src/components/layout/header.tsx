import { Link, useLocation } from 'react-router-dom'
import { useEffect, useState, useRef } from "react"
import { useTranslation } from 'react-i18next'
import { Sprout, Coins, CircleDollarSign } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/hooks/use-language'
import { useWallet } from '@/pages/garden/hooks/use-economy'

const tabs = (t: any) => [
  { path: '/garden', label: t('nav.garden') },
  { path: '/tasks',  label: t('nav.tasks')  },
]

// ==========================================
// COMPONENT PHỤ: COIN PILE ICON VỚI FALLBACK
// ==========================================
function CoinIcon({ type, className = "" }: { type: 'silver' | 'gold', className?: string }) {
  const [imgError, setImgError] = useState(false)

  if (imgError) {
    return type === 'gold' 
      ? <Coins size={16} className={`text-amber-500 drop-shadow-sm ${className}`} /> 
      : <CircleDollarSign size={16} className={`text-slate-500 ${className}`} />
  }

  return (
    <img 
      src={`/coins/${type}-pile.png`}
      alt={`${type} pile`} 
      className={`object-contain drop-shadow-sm ${className}`}
      onError={() => setImgError(true)} 
    />
  )
}

function UtcClock() {
  const { currentLang } = useLanguage()
  const [timeStr, setTimeStr] = useState("00:00:00")
  const [dateStr, setDateStr] = useState("...") 
  const [isMounted, setIsMounted] = useState(false) 

  useEffect(() => {
    const locale = currentLang === 'vi' ? 'vi-VN' : 'en-US'
    const dateFormatter = new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    })

    let lastDateNum = -1

    function tick() {
      const now = new Date()

      const hh = String(now.getUTCHours()).padStart(2, "0")
      const mm = String(now.getUTCMinutes()).padStart(2, "0")
      const ss = String(now.getUTCSeconds()).padStart(2, "0")
      setTimeStr(`${hh}:${mm}:${ss}`)

      const currentUtcDate = now.getUTCDate()
      if (currentUtcDate !== lastDateNum) {
        lastDateNum = currentUtcDate
        setDateStr(dateFormatter.format(now))
      }
    }

    tick()
    setIsMounted(true) 
    const id = setInterval(tick, 1000)

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") tick()
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      clearInterval(id)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [currentLang])

  return (
    <div
      className={cn(
        "hidden items-center gap-2 rounded-md px-3 py-1.5 md:flex transition-opacity duration-300",
        isMounted ? "opacity-100" : "opacity-0"
      )}
      title="Current date and time in UTC"
      aria-label={`UTC: ${dateStr} ${timeStr}`}
    >
      <span className="text-xs text-muted-foreground">{dateStr}</span>
      <span className="h-3 w-px bg-border" aria-hidden="true" />
      <span className="font-mono text-xs font-medium tabular-nums text-foreground">{timeStr}</span>
      <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">UTC</span>
    </div>
  )
}

function LanguageSwitcher() {
  const { currentLang, setLanguage, languages } = useLanguage()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const current = languages.find(l => l.code === currentLang)

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(prev => !prev)}
        className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors py-1.5"
      >
        {current?.shortLabel}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 min-w-[120px] rounded-md border border-border bg-popover shadow-md">
          {languages.map(lang => (
            <button
              key={lang.code}
              onClick={() => { setLanguage(lang.code); setOpen(false) }}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-secondary',
                currentLang === lang.code
                  ? 'text-foreground font-medium'
                  : 'text-muted-foreground'
              )}
            >
              <span className="font-mono text-[10px] tracking-widest">{lang.shortLabel}</span>
              <span>{lang.nativeLabel}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Header() {
  const { pathname } = useLocation()
  const { t } = useTranslation('common')
  const tabsConfig = tabs(t)
  
  // TODO: IMPORTANT: Use other endpoint, like user private
  const { data: wallet } = useWallet()

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-[var(--header-bg)] backdrop-blur-lg backdrop-saturate-150">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">

        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Sprout className="h-4 w-4" aria-hidden="true" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-foreground">{t('app_name')}</span>
        </div>

        {/* Tab navigation */}
        <nav className="items-center gap-1 md:flex">
          {tabsConfig.map(({ path, label }) => (
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
          <LanguageSwitcher />

          {/* Ví Tiền Gọn Gàng - Chỉ cách nhau bằng gap, không có hộp viền */}
          <div className="flex items-center gap-1 ml-1">
            <span className="flex items-center gap-1 text-sm text-foreground/80">
              <CoinIcon type="silver" className="w-[18px] h-[18px]" />
              <strong>{wallet?.silver_balance ?? 0}</strong>
            </span>
            <span className="flex items-center gap-1 text-sm text-amber-600">
              <CoinIcon type="gold" className="w-[18px] h-[18px]" />
              <strong>{wallet?.gold_balance ?? 0}</strong>
            </span>
          </div>

          <Avatar className="h-8 w-8 cursor-pointer ml-1">
            <AvatarFallback className="bg-secondary text-secondary-foreground text-xs font-medium">
              U
            </AvatarFallback>
          </Avatar>
        </div>

      </div>
    </header>
  )
}