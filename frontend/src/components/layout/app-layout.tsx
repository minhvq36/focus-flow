import { Outlet } from 'react-router-dom'
import Header from '@/components/layout/header'
import Sidebar from '@/components/layout/sidebar'

export default function AppLayout() {
  return (
    <div className="relative h-screen w-full overflow-hidden bg-background">
      <div className="absolute top-0 left-0 right-0 z-50">
        <Header />
      </div>
      <Sidebar />
      <main className="relative z-10 h-full w-full overflow-y-auto pt-16">
        <Outlet />
      </main>
      
    </div>
  )
}