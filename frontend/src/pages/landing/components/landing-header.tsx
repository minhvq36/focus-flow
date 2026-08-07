import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Sprout } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LanguageSwitcher } from '@/components/layout/language-switcher'

export default function LandingHeader() {
  const { t } = useTranslation('landing')
  const { t: tc } = useTranslation('common')

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/70 backdrop-blur-lg backdrop-saturate-150">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-8">

        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
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

          <Button asChild size="lg" className="px-5">
            <Link to="/register">{t('get_started')}</Link>
          </Button>
        </div>

      </div>
    </header>
  )
}
