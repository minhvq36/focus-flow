import { Outlet } from 'react-router-dom'
import { BackgroundCurves } from "@/components/layout/background-curves"
import Header from './header'

export default function AppLayout() {
  return (
    <div className="flex flex-col min-h-screen">
      <BackgroundCurves />
      <Header />
      <main>
        <Outlet />
      </main>
    </div>
  )
}