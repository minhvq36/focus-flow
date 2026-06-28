import { Outlet } from 'react-router-dom'
import Header from '@/components/layout/header'
import Sidebar from '@/components/layout/sidebar'

export default function AppLayout() {
  return (
    <div className="relative flex flex-col h-screen overflow-hidden">
      <Header />
      <div className="relative flex-1 overflow-hidden flex w-full h-full">
        <Sidebar />
        <main className="flex-1 overflow-y-auto relative w-full h-full">
          <Outlet />
        </main>
      </div>
    </div>
  )
}