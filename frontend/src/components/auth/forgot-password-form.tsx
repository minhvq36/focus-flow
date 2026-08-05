import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation, Trans } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, MailCheck } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TurnstileWidget, type TurnstileHandle } from '@/components/auth/turnstile-widget'
import { turnstileEnabled } from '@/lib/turnstile'

/**
 * Bước 1 flow quên mật khẩu (Supabase recovery):
 * gửi email chứa link recovery -> user bấm link -> Supabase redirect về
 * /reset-password kèm session recovery (bước 2 ở reset-password-form).
 */
export function ForgotPasswordForm() {
  const { t } = useTranslation('auth')
  const [submitting, setSubmitting] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const turnstileRef = useRef<TurnstileHandle>(null)

  const schema = useMemo(
    () => z.object({ email: z.email(t('error_email_invalid')) }),
    [t]
  )
  type FormValues = z.infer<typeof schema>

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true)
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/reset-password`,
      captchaToken: captchaToken ?? undefined,
    })
    if (error) {
      // Chỉ lộ lỗi kỹ thuật (rate limit, captcha...) — Supabase không tiết lộ
      // email có tồn tại hay không, FE cũng vậy.
      toast.error(t('reset_email_failed'), { description: error.message })
      turnstileRef.current?.reset()
      setSubmitting(false)
      return
    }
    setSentTo(values.email)
  }

  if (sentTo) {
    return (
      <div className="rounded-2xl border border-border bg-card shadow-sm p-8 flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <MailCheck className="h-5 w-5 text-primary" aria-hidden="true" />
            {t('check_inbox_title')}
          </h2>
          <p className="text-sm text-muted-foreground">
            <Trans
              t={t}
              i18nKey="check_inbox_desc"
              values={{ email: sentTo }}
              components={{ strong: <span className="font-medium text-foreground" /> }}
            />
          </p>
        </div>
        <Button asChild variant="outline" size="lg" className="w-full">
          <Link to="/login">{t('back_to_login')}</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm p-8 flex flex-col gap-5">

      {/* Handler tạo trong event, không phải lúc render — xem chú thích ở login-form. */}
      <form onSubmit={e => void handleSubmit(onSubmit)(e)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium">{t('email')}</label>
          <Input
            id="email"
            type="email"
            placeholder={t('email_placeholder')}
            autoComplete="email"
            aria-invalid={!!errors.email}
            disabled={submitting}
            {...register('email')}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        <TurnstileWidget ref={turnstileRef} onToken={setCaptchaToken} />

        <Button
          type="submit"
          size="lg"
          className="w-full mt-1"
          disabled={submitting || (turnstileEnabled && !captchaToken)}
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {t('send_reset_link')}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {t('remembered_password')}{' '}
        <Link
          to="/login"
          className="font-medium text-primary underline-offset-2 hover:underline transition-colors"
        >
          {t('sign_in')}
        </Link>
      </p>

    </div>
  )
}
