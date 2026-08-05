import { lazy } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/login'
import Register from './pages/register'
import ForgotPassword from './pages/forgot-password'
import ResetPassword from './pages/reset-password'
import ProtectedRoute from './components/auth/protected-route'
import TaskLayout from './components/layout/task-layout'
import AuthLayout from './components/layout/auth-layout'
import AppLayout from './components/layout/app-layout'
import { RouteSuspense } from './components/layout/route-suspense'

/*
  Các trang sau đăng nhập được lazy-load để chunk khởi động không kéo theo
  thư viện nặng: Garden gánh PixiJS (~1MB), Profile gánh react-easy-crop.
  Khách vào /login chỉ tải đúng phần auth. Fallback spinner nằm trong
  <RouteSuspense> đặt quanh <Outlet /> của từng layout.
*/
const Garden = lazy(() => import('./pages/garden'))
const Tasks = lazy(() => import('./pages/tasks'))
const Focus = lazy(() => import('./pages/focus'))
const MePage = lazy(() => import('./pages/profile'))

import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <TooltipProvider>
          <Routes>
            {/*
              /reset-password nằm NGOÀI ProtectedRoute: link recovery hỏng/hết hạn
              thì Supabase không dựng session, ProtectedRoute sẽ đá về /login và
              user không bao giờ thấy thông báo "link không hợp lệ".
            */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
            </Route>

            <Route element={<ProtectedRoute />}>
              
              <Route element={<TaskLayout />}>
                <Route path="/" element={<Navigate to="/garden" replace />} />
                <Route path="/tasks" element={<Tasks />} />
              </Route>

              {/* Thêm Route /me vào AppLayout */}
              <Route element={<AppLayout />}>
                <Route path="/garden" element={<Garden />} />
                <Route path="/profile/me" element={<MePage />} /> {/* <--- THÊM DÒNG NÀY */}
              </Route>
              
              {/* Route lẻ, không có layout → tự bọc Suspense */}
              <Route
                path="/focus/:taskId"
                element={
                  <RouteSuspense>
                    <Focus />
                  </RouteSuspense>
                }
              />
            </Route>
          </Routes>

          <Toaster richColors />
        </TooltipProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App