import { Outlet } from 'react-router-dom'
import Header from './header'

export default function AppLayout() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main>
        <Outlet />
      </main>
    </div>
  )
}