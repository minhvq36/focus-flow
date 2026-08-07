import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Sprout } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LanguageSwitcher } from '@/components/layout/language-switcher'
import { cn } from '@/lib/utils'

/**
 * Header landing là `fixed` chứ không `sticky`: nằm ngoài luồng thì hero mới bắt
 * đầu từ y=0 và ảnh núi tràn hết viền trên, không bị đẩy xuống 64px.
 *
 * Đổi lại, `fixed` sẽ đè lên nội dung khi cuộn -> chữ chồng chữ. Nên header đổi
 * hình dạng theo vị trí cuộn:
 *   - Ở đỉnh trang (trên hero): trong suốt hoàn toàn, không viền, không nền.
 *   - Đã cuộn: nền mờ + blur + viền dưới, đủ đục để chữ bên dưới trôi qua mà
 *     không lẫn vào chữ của header.
 * Hero tự chừa `pt-28` nên nội dung hero cũng không bị header che.
 */
export default function LandingHeader() {
  const { t } = useTranslation('landing')
  const { t: tc } = useTranslation('common')
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    // Đọc ngay lần đầu: user có thể quay lại trang khi trình duyệt đã khôi phục
    // vị trí cuộn giữa trang, lúc đó header phải ở trạng thái "đã cuộn" sẵn.
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300',
        scrolled
          ? 'border-border/60 bg-background/80 backdrop-blur-lg backdrop-saturate-150 shadow-sm'
          : 'border-transparent bg-transparent'
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-8">

        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
            <Sprout className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="text-lg font-semibold tracking-tight text-foreground">
            {tc('app_name')}
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />

          <Button asChild variant="ghost" size="lg" className="hidden sm:inline-flex px-4">
            <Link to="/login">{t('sign_in')}</Link>
          </Button>

          <Button asChild size="lg" className="px-5 shadow-sm">
            <Link to="/register">{t('get_started')}</Link>
          </Button>
        </div>

      </div>
    </header>
  )
}
