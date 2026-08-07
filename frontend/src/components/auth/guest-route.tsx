import { Navigate, Outlet } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useUserStore } from '@/store/user-store'

/**
 * Đối xứng với ProtectedRoute, dùng cho trang công khai KHÔNG nên hiện lại khi
 * đã đăng nhập — hiện chỉ có `/` (landing): có session thì vào thẳng /garden.
 *
 * CỐ Ý không bọc /login, /register, /reset-password: luồng recovery cần vào
 * /reset-password NGAY CẢ khi Supabase vừa dựng session từ link, bọc vào đây sẽ
 * đá user đi mất trước khi kịp đổi mật khẩu.
 */
export default function GuestRoute() {
  const { user, loading } = useUserStore()

  // Chưa biết có session hay không -> chờ, tránh nháy landing rồi mới nhảy /garden.
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (user) {
    return <Navigate to="/garden" replace />
  }

  return <Outlet />
}
