import { Link, useLocation } from 'react-router-dom'
import { useEffect, useState, useRef } from "react"
import { useTranslation } from 'react-i18next'
import { Sprout } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/hooks/use-language'

const tabs = (t: any) => [
  { path: '/garden', label: t('nav.garden') },
  { path: '/tasks',  label: t('nav.tasks')  },
]

function UtcClock() {
  const { currentLang } = useLanguage()
  
  // 2. CHỐNG CLS (Giật Layout): Khởi tạo state bằng string có độ dài chuẩn.
  // Tabular-nums sẽ giúp "00:00:00" chiếm đúng diện tích bằng giờ thật.
  const [timeStr, setTimeStr] = useState("00:00:00")
  const [dateStr, setDateStr] = useState("...") 
  const [isMounted, setIsMounted] = useState(false) // Dùng để làm hiệu ứng fade-in

  useEffect(() => {
    // 1. TỐI ƯU BỘ NHỚ: Tạo formatter dựa trên ngôn ngữ hiện tại
    // Khi ngôn ngữ thay đổi, formatter sẽ được tạo lại với locale đúng
    const locale = currentLang === 'vi' ? 'vi-VN' : 'en-US'
    const dateFormatter = new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    })

    let lastDateNum = -1

    function tick() {
      const now = new Date()

      // Vẫn giữ padStart cho time vì đây là thuật toán O(1) nhẹ nhất của JS
      const hh = String(now.getUTCHours()).padStart(2, "0")
      const mm = String(now.getUTCMinutes()).padStart(2, "0")
      const ss = String(now.getUTCSeconds()).padStart(2, "0")
      setTimeStr(`${hh}:${mm}:${ss}`)

      const currentUtcDate = now.getUTCDate()
      if (currentUtcDate !== lastDateNum) {
        lastDateNum = currentUtcDate
        // Dùng formatter đã cache ở ngoài để format
        setDateStr(dateFormatter.format(now))
      }
    }

    tick()
    setIsMounted(true) // Render xong lần 1 có data thật mới cho hiện
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
      // 3. UX ĐỈNH CAO: Dùng opacity-0 lúc init để giữ nguyên chỗ trống (chống đẩy Layout),
      // khi có data thì fade-in mượt mà với duration-300
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

  // Đóng khi click ra ngoài
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