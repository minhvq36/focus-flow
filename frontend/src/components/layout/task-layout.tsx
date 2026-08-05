import { Outlet } from 'react-router-dom'
import { BackgroundCurves } from "@/components/layout/background-curves"
import Header from '@/components/layout/header'
import Sidebar from '@/components/layout/sidebar'
import { RouteSuspense } from '@/components/layout/route-suspense'

export default function TaskLayout() {
  return (
    <div className="relative h-screen w-full overflow-hidden">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <BackgroundCurves />
      </div>
      <div className="absolute top-0 left-0 right-0 z-50">
        <Header />
      </div>
      <Sidebar />
      <main className="relative z-10 h-full w-full overflow-y-auto pt-16">
        <RouteSuspense>
          <Outlet />
        </RouteSuspense>
      </main>
      
    </div>
  )
}