import { Navigate, Outlet } from 'react-router-dom'
import { useUserStore } from '@/store/userStore'

export default function ProtectedRoute() {
  const { user, loading } = useUserStore()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}