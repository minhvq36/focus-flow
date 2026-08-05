import { useEffect, useImperativeHandle, useRef, type Ref } from 'react'
import { useUserStore } from '@/store/user-store'
import { TURNSTILE_SITE_KEY, turnstileEnabled } from '@/lib/turnstile'

/**
 * Cloudflare Turnstile (explicit render, không thêm dependency).
 *
 * BẬT/TẮT bằng env: thiếu VITE_TURNSTILE_SITE_KEY -> `turnstileEnabled=false`,
 * widget không render, form submit KHÔNG kèm captchaToken (Supabase chỉ đòi
 * token khi Dashboard bật Captcha Protection — hai bên phải bật/tắt cùng nhau).
 * FocusFlow hiện CHƯA bật captcha, nên mặc định widget này là no-op.
 *
 * CHIẾN LƯỢC "CHỜ ỔN ĐỊNH" (chống lỗi thất bại ở lần submit đầu):
 *   Lúc mở trang, user-store còn đang gọi getSession() (loading=true). Khi
 *   getSession xong, state đổi -> React re-render. Nếu Turnstile được dựng NGAY
 *   lúc mount, vòng re-render/remount này khiến Cloudflare huỷ token đầu và sinh
 *   token mới, nhưng lúc user bấm submit code vẫn ôm token cũ đã chết -> siteverify
 *   fail lần 1, bấm lại mới trúng token mới. Cách chặn tận gốc: CHỈ dựng widget
 *   SAU KHI loading=false (cây React đã đứng yên) -> token sinh đúng 1 lần.
 *   Nút submit vẫn disable tới khi có token nên không thể gửi khi chưa sẵn sàng.
 */

interface TurnstileRenderOptions {
  sitekey: string
  callback?: (token: string) => void
  'expired-callback'?: () => void
  'error-callback'?: () => void
  'timeout-callback'?: () => void
  theme?: 'light' | 'dark' | 'auto'
  size?: 'normal' | 'flexible' | 'compact'
  language?: string
  /** Không chèn input hidden vào form (token đã lấy qua callback). */
  'response-field'?: boolean
  /** Tự thử lại khi lỗi lấy token (mặc định "auto"). */
  retry?: 'auto' | 'never'
  'retry-interval'?: number
  /** Token hết hạn -> tự lấy token mới (giữ token luôn "tươi"). */
  'refresh-expired'?: 'auto' | 'manual' | 'never'
  /** Interactive challenge quá hạn chưa giải -> tự làm mới. */
  'refresh-timeout'?: 'auto' | 'manual' | 'never'
}

interface TurnstileApi {
  render: (el: HTMLElement, opts: TurnstileRenderOptions) => string | undefined
  reset: (widgetId?: string) => void
  remove: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

let loader: Promise<TurnstileApi> | null = null

/** Nạp script Turnstile đúng 1 lần cho cả app (share giữa Login/Register/Forgot). */
function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  loader ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement('script')
    script.src =
      'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.onload = () => {
      if (window.turnstile) resolve(window.turnstile)
      else reject(new Error('Turnstile script không khởi tạo được'))
    }
    script.onerror = () => {
      loader = null // cho phép thử nạp lại ở lần mount sau
      reject(new Error('Không tải được Cloudflare Turnstile'))
    }
    document.head.appendChild(script)
  })
  return loader
}

export interface TurnstileHandle {
  /** Token Turnstile dùng 1 lần — gọi sau mỗi lần submit thất bại để lấy token mới. */
  reset: () => void
}

interface TurnstileWidgetProps {
  /** Nhận token khi user vượt challenge; null khi token hết hạn/lỗi/reset. */
  onToken: (token: string | null) => void
  ref?: Ref<TurnstileHandle>
}

export function TurnstileWidget({ onToken, ref }: TurnstileWidgetProps) {
  // Tín hiệu "ổn định": user-store khôi phục session ban đầu xong -> hết re-render.
  const authLoading = useUserStore(s => s.loading)

  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  // "Latest ref": callback Turnstile bắn bất đồng bộ sau khi mount, luôn cần bản
  // onToken mới nhất mà KHÔNG được dựng lại widget mỗi lần prop đổi. Đồng bộ
  // trong effect (không phải lúc render) — useRef đã khởi tạo đúng giá trị đầu.
  const onTokenRef = useRef(onToken)
  useEffect(() => {
    onTokenRef.current = onToken
  })

  useImperativeHandle(
    ref,
    () => ({
      reset: () => {
        onTokenRef.current(null)
        if (widgetIdRef.current !== null)
          window.turnstile?.reset(widgetIdRef.current)
      },
    }),
    []
  )

  useEffect(() => {
    if (!turnstileEnabled || !TURNSTILE_SITE_KEY) return
    // CHỜ ỔN ĐỊNH: chưa xong getSession thì chưa dựng widget (tránh remount huỷ token).
    if (authLoading) return
    let cancelled = false
    loadTurnstile()
      .then(turnstile => {
        if (cancelled || !containerRef.current || widgetIdRef.current) return
        widgetIdRef.current =
          turnstile.render(containerRef.current, {
            sitekey: TURNSTILE_SITE_KEY,
            theme: 'auto',
            size: 'flexible',
            'response-field': false,
            // RETRY BẰNG CƠ CHẾ CÓ SẴN của Turnstile (không tự viết vòng retry
            // để tránh chồng chéo/ghi đè token): lỗi tạm thời -> tự thử lại sau
            // 3s; token hết hạn / interactive quá giờ -> tự làm mới. Chỉ khi
            // KHÔNG thể lấy token thật sự widget mới rơi về trạng thái lỗi hiển
            // thị — đó là fallback cuối, không phải phản ứng đầu.
            retry: 'auto',
            'retry-interval': 3000,
            'refresh-expired': 'auto',
            'refresh-timeout': 'auto',
            callback: token => onTokenRef.current(token),
            // Hết hạn/lỗi/timeout: bỏ token (nút submit tự disable). KHÔNG báo lỗi
            // cho user ở đây — để Turnstile tự retry lấy token mới trong nền.
            'expired-callback': () => onTokenRef.current(null),
            'error-callback': () => onTokenRef.current(null),
            'timeout-callback': () => onTokenRef.current(null),
          }) ?? null
      })
      .catch(() => {
        // Script bị chặn (adblock/mạng): widget trống, submit sẽ bị Supabase
        // từ chối nếu server đang bật captcha — không crash form.
      })
    return () => {
      cancelled = true
      if (widgetIdRef.current !== null) {
        window.turnstile?.remove(widgetIdRef.current)
        widgetIdRef.current = null
      }
    }
  }, [authLoading])

  if (!turnstileEnabled) return null
  // Div giữ chỗ luôn hiện diện (layout không nhảy); widget render vào sau khi ổn định.
  return <div ref={containerRef} className="min-h-16" />
}
