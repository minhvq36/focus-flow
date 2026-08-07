import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function HeroSection() {
  const { t } = useTranslation('landing')

  return (
    <section className="relative isolate overflow-hidden">
      {/*
        Ảnh nền phủ 1 lớp màu nền của app (bg-background/~72) thay vì hạ opacity
        chính tấm ảnh: giữ được ảnh sắc nét ở lớp dưới, chữ vẫn thừa tương phản,
        và lớp phủ tự đổi màu theo theme vì dùng token --background.
        Ảnh đã resize còn 1920px/~230KB nên đặt fetchPriority="high" cho LCP.
      */}
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <img
          src="/landing.jpg"
          alt=""
          className="h-full w-full object-cover object-center"
          fetchPriority="high"
          decoding="async"
        />
        <div className="absolute inset-0 bg-background/72 backdrop-blur-[1px]" />
        {/* Tan dần xuống nền trang để hero không cắt ngang một đường cứng */}
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent to-background" />
      </div>

      <div className="mx-auto flex min-h-[calc(100svh-4rem)] max-w-4xl flex-col items-center justify-center px-4 py-20 text-center md:px-8">

        <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/70 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm">
          <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          {t('hero.badge')}
        </span>

        <h1 className="mt-7 text-4xl font-bold leading-tight tracking-tight text-foreground md:text-6xl">
          {t('hero.title_line1')}{' '}
          <span className="text-primary">{t('hero.title_highlight')}</span>
        </h1>

        <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
          {t('hero.subtitle')}
        </p>

        <div className="mt-10 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row sm:gap-4">
          <Button asChild size="lg" className="h-12 w-full px-8 text-base sm:w-auto">
            <Link to="/register">
              {t('hero.cta_primary')}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>

          <Button asChild variant="outline" size="lg" className="h-12 w-full px-8 text-base sm:w-auto">
            <a href="#how">{t('hero.cta_secondary')}</a>
          </Button>
        </div>

        <p className="mt-5 text-xs text-muted-foreground">{t('hero.note')}</p>

      </div>
    </section>
  )
}
