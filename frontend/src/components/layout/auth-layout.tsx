import { Outlet } from 'react-router-dom'

export default function AuthLayout() {
  return (
    <div className="relative min-h-screen flex items-center justify-center px-4">
      {/* Background in the bottom */}
      <div className="relative z-10 flex flex-1 flex-col">
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
