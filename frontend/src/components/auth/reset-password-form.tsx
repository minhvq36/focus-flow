import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import { supabase, isRecoveryPending, clearRecoveryPending } from '@/lib/supabase'
import { useUserStore } from '@/store/user-store'
import { Button } from '@/components/ui/button'
import { PasswordInput } from '@/components/auth/password-input'

/**
 * Bước 2 flow quên mật khẩu: user bấm link trong email -> Supabase redirect về
 * đây kèm token trong URL hash -> supabase-js (detectSessionInUrl) tự đổi thành
 * session recovery (user-store thấy user đăng nhập). Trang này chỉ việc
 * updateUser({password}) trên session đó.
 *
 * GUARD: chỉ hiện form khi PHIÊN ĐẾN TỪ LINK RECOVERY (isRecoveryPending — hash
 * lúc boot có type=recovery) VÀ session đã dựng xong. KHÔNG được dùng mỗi điều
 * kiện "có user đăng nhập": link hỏng/hết hạn thì Supabase không swap session,
 * account đang đăng nhập sẵn (nếu có) vẫn ngồi đó — hiện form lúc này là cho
 * user đổi NHẦM mật khẩu của account đó thay vì báo link lỗi.
 */
export function ResetPasswordForm() {
  const navigate = useNavigate()
  const { t } = useTranslation('auth')
  const user = useUserStore(s => s.user)
  const loading = useUserStore(s => s.loading)
  const [submitting, setSubmitting] = useState(false)

  const schema = useMemo(
    () =>
      z
        .object({
          password: z.string().min(6, t('error_password_min')),
          confirm: z.string(),
        })
        .refine(v => v.password === v.confirm, {
          path: ['confirm'],
          error: t('error_password_mismatch'),
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
    const { error } = await supabase.auth.updateUser({
      password: values.password,
      // Supabase không thêm identity `email` khi set mật khẩu qua recovery ->
      // tự đánh dấu để sau này card "Bảo mật" trong Profile biết tài khoản ĐÃ
      // có mật khẩu (quan trọng với tài khoản Google dùng quên-mật-khẩu để tạo
      // mật khẩu lần đầu). FocusFlow chưa có card đó, cờ này để dành.
      data: { has_password: true },
    })
    if (error) {
      toast.error(t('reset_password_failed'), { description: error.message })
      setSubmitting(false)
      return
    }
    clearRecoveryPending() // dùng xong luồng recovery, quay lại trang này sẽ báo link hết hiệu lực
    toast.success(t('password_changed'), { description: t('password_changed_desc') })
    navigate('/garden', { replace: true })
  }

  // Chờ khôi phục session từ URL hash (restoreSession của user-store).
  if (loading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (!isRecoveryPending() || !user) {
    return (
      <div className="rounded-2xl border border-border bg-card shadow-sm p-8 flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <ShieldAlert className="h-5 w-5 text-destructive" aria-hidden="true" />
            {t('invalid_link_title')}
          </h2>
          <p className="text-sm text-muted-foreground">{t('invalid_link_desc')}</p>
        </div>
        <div className="flex flex-col gap-2">
          <Button asChild size="lg" className="w-full">
            <Link to="/forgot-password">{t('resend_reset_link')}</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link to="/login">{t('back_to_login')}</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm p-8 flex flex-col gap-5">

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm font-medium">{t('new_password')}</label>
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

        <div className="flex flex-col gap-1.5">
          <label htmlFor="confirm" className="text-sm font-medium">{t('confirm_password')}</label>
          <PasswordInput
            id="confirm"
            placeholder="••••••••"
            autoComplete="new-password"
            aria-invalid={!!errors.confirm}
            disabled={submitting}
            {...register('confirm')}
          />
          {errors.confirm && (
            <p className="text-xs text-destructive">{errors.confirm.message}</p>
          )}
        </div>

        <Button type="submit" size="lg" className="w-full mt-1" disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {t('change_password')}
        </Button>
      </form>

    </div>
  )
}
