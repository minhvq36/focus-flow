import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/login'
import ProtectedRoute from './components/auth/protected-route'
import AppLayout from './components/layout/app-layout'
import Garden from './pages/garden'
import Tasks from './pages/tasks'
import Focus from './pages/focus'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/garden" replace />} />
            <Route path="/garden" element={<Garden />} />
            <Route path="/tasks" element={<Tasks />} />
          </Route>
          {/* Focus DONOT have sidebar/header — full screen */}
          <Route path="/focus/:taskId" element={<Focus />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App