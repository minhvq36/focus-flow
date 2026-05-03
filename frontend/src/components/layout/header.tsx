import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'

const tabs = [
    // TODO: Check if we need Icons for these tabs
  { path: '/garden', label: 'My Garden' },
  { path: '/tasks',  label: 'My Tasks'  },
]

export default function Header() {
  const { pathname } = useLocation()

  return (
    <header className="h-16 border-b border-border/60 bg-ff-header-bg flex items-center justify-between px-6 shrink-0">
      
      {/* Logo */}
      <span className="text-sm font-bold text-primary">FocusFlow</span>

      {/* Tab navigation */}
      <nav className="flex items-center gap-1">
        {tabs.map(({ path, label }) => (
          <Link
            key={path}
            to={path}
            className={cn(
                'px-4 py-1.5 text-sm rounded-md transition-colors border border-transparent',
                pathname === path
                ? 'bg-ff-tab-active-bg text-ff-tab-active-fg font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            {label}
          </Link>
        ))}
      </nav>

      {/* Right: economy + user */}
      <div className="flex items-center gap-4">
        {/* TODO: Check we need to replace this with a proper icon */}
        <span className="text-sm">🪙 <strong>0</strong></span>
        {/* TODO: Check we need to replace this with a proper icon */}
        <span className="text-sm">💛 <strong>0</strong></span>
        {/* TODO: Check if need a specific CSS, currently reusing tab active styles */}
        <div className="w-8 h-8 rounded-full bg-ff-tab-active-bg flex items-center justify-center text-sm cursor-pointer shadow-sm hover:shadow transition-shadow">
          U
        </div>
      </div>

    </header>
  )
}