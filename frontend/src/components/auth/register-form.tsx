import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/auth/password-input'
import { GoogleButton, AuthDivider } from '@/components/auth/google-button'
import { TurnstileWidget, type TurnstileHandle } from '@/components/auth/turnstile-widget'
import { turnstileEnabled } from '@/lib/turnstile'

/**
 * KHÔNG thu thập tên hiển thị ở đây: trigger `handle_new_auth_user` (migration
 * 003) đặt display_name = phần trước @ của email và KHÔNG đọc raw_user_meta_data,
 * nên tên nhập ở form sẽ bị bỏ qua. Người dùng đổi tên sau trong Profile.
 */
export function RegisterForm() {
  const navigate = useNavigate()
  const { t } = useTranslation('auth')
  const [submitting, setSubmitting] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const turnstileRef = useRef<TurnstileHandle>(null)

  const schema = useMemo(
    () =>
      z.object({
        email: z.email(t('error_email_invalid')),
        password: z.string().min(6, t('error_password_min')),
      }),
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
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: { captchaToken: captchaToken ?? undefined },
    })
    if (error) {
      toast.error(t('register_failed'), { description: error.message })
      turnstileRef.current?.reset() // token dùng 1 lần -> lấy token mới
      setSubmitting(false)
      return
    }
    // Bật xác nhận email trên Supabase -> chưa có session, phải verify trước.
    if (!data.session) {
      toast.success(t('confirm_email_sent'), {
        description: t('confirm_email_sent_desc'),
      })
      navigate('/login', { replace: true })
      return
    }
    navigate('/garden', { replace: true })
  }

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm p-8 flex flex-col gap-5">

      <AuthDivider label={t('sign_up_with_email')} />

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

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm font-medium">{t('password')}</label>
          <PasswordInput
            id="password"
            placeholder="••••••••"
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            disabled={submitting}
            {...register('password')}
          />
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
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
          {t('sign_up')}
        </Button>
      </form>

      <GoogleButton label={t('sign_up_with_google')} disabled={submitting} />

      <p className="text-center text-sm text-muted-foreground">
        {t('have_account')}{' '}
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
