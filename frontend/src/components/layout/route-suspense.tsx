import { Suspense, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

/**
 * Bọc quanh <Outlet /> của layout (hoặc quanh route lẻ không có layout).
 * Các trang được lazy-load sẽ hiện spinner TRONG vùng nội dung, header/sidebar
 * giữ nguyên không bị nháy trắng khi chunk đang tải.
 */
export function RouteSuspense({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex h-full w-full items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      {children}
    </Suspense>
  )
}
