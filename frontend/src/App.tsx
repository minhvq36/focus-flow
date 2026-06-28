import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/login'
import ProtectedRoute from './components/auth/protected-route'
import TaskLayout from './components/layout/task-layout'
import AuthLayout from './components/layout/auth-layout'
import AppLayout from './components/layout/app-layout'
import Garden from './pages/garden'
import Tasks from './pages/tasks'
import Focus from './pages/focus'
// Import thêm trang Profile của chúng ta
import MePage from './pages/profile' 

import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <TooltipProvider>
          <Routes>
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<Login />} />
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
              
              <Route path="/focus/:taskId" element={<Focus />} />
            </Route>
          </Routes>

          <Toaster richColors />
        </TooltipProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App