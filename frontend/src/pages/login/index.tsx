import { useTranslation } from 'react-i18next'
import { Sprout } from 'lucide-react'
import { LoginForm } from '@/components/auth/login-form'

export default function Login() {
  const { t } = useTranslation('auth')

  return (
    <div className="w-full max-w-md mx-auto">
      
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
          <Sprout className="h-6 w-6" aria-hidden="true" />
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {t('welcome_title')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('welcome_subtitle')}
          </p>
        </div>
      </div>

      <LoginForm />

      <p className="mt-6 text-center text-xs text-muted-foreground">
        {t('terms_prefix')}{' '}
        <a href="#" className="underline underline-offset-2 hover:text-foreground transition-colors">
          {t('terms_of_service')}
        </a>{' '}
        {t('terms_and')}{' '}
        <a href="#" className="underline underline-offset-2 hover:text-foreground transition-colors">
          {t('privacy_policy')}
        </a>.
      </p>

    </div>
  )
}