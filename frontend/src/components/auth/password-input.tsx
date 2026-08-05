import { useState, type ComponentProps } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface PasswordInputProps extends Omit<ComponentProps<'input'>, 'type'> {
  /** Class cho wrapper ngoài — dùng khi layout cha cần định vị (vd grid-area). */
  containerClassName?: string
}

/**
 * Ô nhập mật khẩu kèm nút con mắt hiện/ẩn — dùng chung Login/Register/Reset.
 * - Toggle type text/password bằng state cục bộ, không đụng form bên ngoài.
 * - Nút type="button" (không submit form), có aria-label + aria-pressed cho
 *   screen reader.
 * - tabIndex=-1: RÚT nút khỏi chuỗi Tab (mật khẩu -> Tab -> thẳng field kế,
 *   không vướng con mắt). KHÁC tabIndex dương — không reorder gì nên không
 *   loạn; nút vẫn trong accessibility tree, SR browse mode vẫn đọc/bấm được.
 *   Đánh đổi: người dùng bàn phím thuần không Tab tới được (dùng chuột/chạm).
 */
export function PasswordInput({
  containerClassName,
  className,
  ...props
}: PasswordInputProps) {
  const { t } = useTranslation('auth')
  const [visible, setVisible] = useState(false)

  return (
    <div className={cn('relative', containerClassName)}>
      <Input
        type={visible ? 'text' : 'password'}
        className={cn('pr-10', className)}
        {...props}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisible(v => !v)}
        aria-label={visible ? t('hide_password') : t('show_password')}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-muted-foreground transition-colors hover:text-foreground"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}
