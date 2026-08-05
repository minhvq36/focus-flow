/**
 * Cấu hình Cloudflare Turnstile, tách khỏi component để react-refresh chỉ thấy
 * component trong turnstile-widget.tsx (rule react-refresh/only-export-components).
 *
 * Thiếu VITE_TURNSTILE_SITE_KEY -> turnstileEnabled = false: widget không render
 * và form auth không gửi captchaToken. Supabase chỉ đòi token khi Dashboard bật
 * Captcha Protection, nên hai bên phải bật/tắt cùng nhau.
 */
export const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY

export const turnstileEnabled =
  typeof TURNSTILE_SITE_KEY === 'string' && TURNSTILE_SITE_KEY.trim() !== ''
