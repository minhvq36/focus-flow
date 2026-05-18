import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/login'
import ProtectedRoute from './components/auth/protected-route'
import AppLayout from './components/layout/app-layout'
import AuthLayout from './components/layout/auth-layout'
import GardenLayout from './components/layout/garden-layout'
import Garden from './pages/garden'
import Tasks from './pages/tasks'
import Focus from './pages/focus'
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
              {/* Standard pages — có header + layout */}
              <Route element={<AppLayout />}>
                <Route path="/" element={<Navigate to="/garden" replace />} /> {/* TODO: Nono, here is the starting page, no navigate */}
                <Route path="/tasks" element={<Tasks />} />
              </Route>

              {/* Fullscreen pages — không có AppLayout */}
              <Route element={<GardenLayout />}>
                <Route path="/garden" element={<Garden />} />
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