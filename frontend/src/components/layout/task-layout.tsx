import { Outlet } from 'react-router-dom'
import { BackgroundCurves } from "@/components/layout/background-curves"
import Header from './header'

export default function TaskLayout() {
  return (
    <div className="relative flex min-h-screen flex-col">
      {/* Background in the bottom */}
      <BackgroundCurves />
      <div className="relative z-10 flex flex-1 flex-col">
        <Header />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}