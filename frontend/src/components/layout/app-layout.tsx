import { Outlet } from 'react-router-dom'
import Header from './header'

export default function AppLayout() {
  return (
    <div className="flex flex-col h-screen">
      <Header />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}