import { useTranslation } from 'react-i18next'
import { Sprout } from 'lucide-react'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'

export default function ForgotPassword() {
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
            {t('forgot_title')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('forgot_subtitle')}
          </p>
        </div>
      </div>

      <ForgotPasswordForm />

    </div>
  )
}
