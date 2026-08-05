import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

function GoogleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 shrink-0">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}

interface GoogleButtonProps {
  /** Câu chữ khác nhau giữa Đăng nhập / Đăng ký — luồng OAuth là một. */
  label: string
  /** Vô hiệu hoá khi form email đang submit (tránh chạy 2 luồng auth song song). */
  disabled?: boolean
}

/**
 * Nút OAuth Google dùng chung cho Login/Register.
 * Redirect về /garden sau khi Google trả session (detectSessionInUrl đã bật
 * trong lib/supabase.ts; user-store.onAuthStateChange tự cập nhật user).
 */
export function GoogleButton({ label, disabled }: GoogleButtonProps) {
  const { t } = useTranslation('auth')
  const [loading, setLoading] = useState(false)

  // Bấm Google -> redirect sang Google (loading=true). Nếu user bấm Back, trình
  // duyệt khôi phục trang từ bfcache với state cũ (loading=true) -> nút kẹt spin,
  // che luôn form. Sự kiện pageshow.persisted=true báo trang về từ bfcache -> reset.
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) setLoading(false)
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [])

  const signIn = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/garden` },
    })
    if (error) {
      toast.error(t('google_failed'), { description: error.message })
      setLoading(false)
    }
    // Thành công -> trình duyệt tự chuyển sang trang Google, không cần reset state.
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className="w-full gap-3 font-medium"
      onClick={signIn}
      disabled={loading || disabled}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
      {label}
    </Button>
  )
}

/** Divider có nhãn giữa các khối của form auth. */
export function AuthDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <Separator className="flex-1" />
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <Separator className="flex-1" />
    </div>
  )
}
