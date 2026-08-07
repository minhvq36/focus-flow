import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Sprout } from 'lucide-react'
import { LanguageSwitcher } from '@/components/layout/language-switcher'

export default function LandingFooter() {
  const { t } = useTranslation('landing')
  const { t: tc } = useTranslation('common')

  const linkClass = 'text-sm text-muted-foreground hover:text-foreground transition-colors'

  return (
    <footer className="border-t border-border/60 bg-secondary/25">
      <div className="mx-auto max-w-6xl px-4 py-14 md:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">

          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Sprout className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="text-base font-semibold tracking-tight text-foreground">
                {tc('app_name')}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{t('footer.tagline')}</p>
          </div>

          <nav className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-foreground">{t('footer.product')}</h3>
            <a href="#features" className={linkClass}>{t('footer.features')}</a>
            <a href="#how" className={linkClass}>{t('footer.how_it_works')}</a>
          </nav>

          <nav className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-foreground">{t('footer.account')}</h3>
            <Link to="/login" className={linkClass}>{t('footer.sign_in')}</Link>
            <Link to="/register" className={linkClass}>{t('footer.sign_up')}</Link>
          </nav>

          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-foreground">{t('footer.language')}</h3>
            <LanguageSwitcher />
          </div>

        </div>

        <p className="mt-12 border-t border-border/60 pt-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} {tc('app_name')}. {t('footer.rights')}
        </p>
      </div>
    </footer>
  )
}
