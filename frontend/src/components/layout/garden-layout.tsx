import { Outlet } from 'react-router-dom'
import Header from '@/components/layout/header'

// Garden có header giống AppLayout nhưng không có max-width wrapper,
// không có padding — để canvas bên trong tự fullscreen bên dưới header.
export default function GardenLayout() {
  return (
    <div className="relative flex flex-col h-screen overflow-hidden">
      <Header />
      {/* Canvas + overlay sẽ fill phần còn lại */}
      <div className="relative flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  )
}