import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from "react"
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Sprout, Coins, CircleDollarSign, User, LogOut } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn, formatCurrency } from '@/lib/utils'
import { useLanguage } from '@/hooks/use-language'
import { LanguageSwitcher } from '@/components/layout/language-switcher'
import { useWallet } from '@/pages/garden/hooks/use-economy'
import { useProfile } from '@/pages/profile/hooks/use-profile'
import { useUserStore } from '@/store/user-store'

const tabs = (t: TFunction<'common'>) => [
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

  // Giữ 1 state duy nhất là mốc thời gian; chuỗi hiển thị derive lúc render.
  // Khởi tạo lazy để ngay frame đầu đã đúng giờ, không cần placeholder + fade-in.
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const tick = () => setNow(new Date())
    const id = setInterval(tick, 1000)

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") tick()
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      clearInterval(id)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [])

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(currentLang === 'vi' ? 'vi-VN' : 'en-US', {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
    [currentLang]
  )

  const hh = String(now.getUTCHours()).padStart(2, "0")
  const mm = String(now.getUTCMinutes()).padStart(2, "0")
  const ss = String(now.getUTCSeconds()).padStart(2, "0")
  const timeStr = `${hh}:${mm}:${ss}`
  const dateStr = dateFormatter.format(now)

  return (
    <div
      className="hidden items-center gap-2 rounded-md px-3 py-1.5 md:flex"
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

// ==========================================
// MENU TÀI KHOẢN
// ==========================================
function UserMenu() {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const logout = useUserStore(s => s.logout)
  const user = useUserStore(s => s.user)

  /*
    Dùng CHUNG query key ['profile','me'] với trang Profile, nên sau khi đổi ảnh
    ở đó (`setQueryData` trong use-profile-update) avatar trên header đổi ngay,
    không cần refetch. URL ảnh đã được `uploadUserImage` gắn `?t=` nên trình
    duyệt cũng không giữ ảnh cũ trong cache.
  */
  const { data: profile } = useProfile()

  const displayName = profile?.display_name ?? user?.email ?? ''
  const initial = displayName.charAt(0).toUpperCase() || 'U'

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/', { replace: true })
      // Query key hiện chưa gắn user id (xem SPEC-FE §5.1) -> phải xoá sạch cache,
      // nếu không tài khoản đăng nhập sau trong cùng tab sẽ thấy dữ liệu người trước.
      queryClient.clear()
      toast.success(t('menu.logout_success'))
    } catch {
      toast.error(t('menu.logout_failed'))
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="ml-1 inline-flex rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label={t('menu.account')}
        >
          {/* Hào quang vàng — bật cho MỌI tài khoản, không gắn với gói cước */}
          <Avatar className="h-8 w-8 cursor-pointer ring-2 ring-amber-400/90 ring-offset-2 ring-offset-background shadow-[0_0_12px_2px_rgba(251,191,36,0.5)]">
            {profile?.avatar_url && (
              <AvatarImage src={profile.avatar_url} alt={displayName} />
            )}
            <AvatarFallback className="bg-secondary text-secondary-foreground text-xs font-medium">
              {initial}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate">{displayName}</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link to="/profile/me" className="cursor-pointer">
            <User aria-hidden="true" />
            {t('menu.my_profile')}
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem
          variant="destructive"
          className="cursor-pointer"
          onSelect={() => void handleLogout()}
        >
          <LogOut aria-hidden="true" />
          {t('menu.logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
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

          <div className="flex items-center gap-1 ml-1">
            <span className="flex items-center gap-1 text-sm text-foreground/80">
              <CoinIcon type="silver" className="w-[18px] h-[18px]" />
              <strong>{formatCurrency(wallet?.silver_balance ?? 0)}</strong>
            </span>
            <span className="flex items-center gap-1 text-sm text-amber-600">
              <CoinIcon type="gold" className="w-[18px] h-[18px]" />
              <strong>{formatCurrency(wallet?.gold_balance ?? 0)}</strong>
            </span>
          </div>

          <UserMenu />
        </div>

      </div>
    </header>
  )
}
