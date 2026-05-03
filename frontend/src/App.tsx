import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import AppLayout from './components/layout/app-layout'
import Garden from './pages/Garden'
import Tasks from './pages/Tasks'
import Focus from './pages/Focus'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        {/* Focus DONOT have sidebar/header — full screen */}
        <Route path="/focus/:taskId" element={<Focus />} />

        {/* TODO: To check these pages using same AppLayout */}
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/garden" replace />} />
          <Route path="/garden" element={<Garden />} />
          <Route path="/tasks" element={<Tasks />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App