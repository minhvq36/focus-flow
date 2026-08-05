import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

/**
 * GUARD LUỒNG RECOVERY (đặt lại mật khẩu):
 * Chụp URL hash NGAY LÚC NẠP MODULE — trước khi supabase-js (detectSessionInUrl,
 * chạy async) kịp xử lý token rồi XÓA hash khỏi URL. Link recovery hợp lệ luôn
 * mang `type=recovery` trong hash; link hỏng/hết hạn chỉ mang `error_code=...`.
 *
 * KHÔNG dùng event PASSWORD_RECOVERY của onAuthStateChange: event đó bắn trong
 * lúc client khởi tạo — thường TRƯỚC khi trang reset kịp mount và subscribe, và
 * không được phát lại cho subscriber đến muộn -> race chập chờn. Chụp hash đồng
 * bộ tại đây thì kết quả xác định 100%.
 */
let recoveryPending = window.location.hash.includes('type=recovery')

/** Phiên hiện tại có phải vừa đến từ link recovery không (trang /reset-password dùng). */
export const isRecoveryPending = () => recoveryPending

/**
 * Tiêu thụ cờ recovery: gọi sau khi đổi mật khẩu xong hoặc khi đăng xuất —
 * để user khác đăng nhập cùng tab SPA không "thừa hưởng" cờ và thấy form reset.
 */
export const clearRecoveryPending = () => {
  recoveryPending = false
}
