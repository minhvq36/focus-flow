import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

export default function Sidebar() {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;
  
  const [isHovered, setIsHovered] = useState(false);

  const getBtnStyle = (active: boolean) => 
    `px-4 py-3 rounded-lg transition-all font-medium flex items-center gap-3 ${
        active 
        /* Active state: Flat design, deeper text tone, no shadow */
        ? 'bg-emerald-100/70 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400' 
        /* Hover & Default state: Muted tones, smooth transition */
        : 'text-sidebar-foreground/60 hover:bg-emerald-50/60 hover:text-emerald-800 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400'
    }`;

  return (
    <div
      className="absolute top-0 left-0 h-full z-40"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="absolute top-0 left-0 w-7 h-full bg-transparent z-10" />

      {/* Thẻ kéo (Nút mồi) */}
      <div 
        className={`absolute left-0 flex items-center justify-center bg-white/80 dark:bg-sidebar/80 backdrop-blur-sm border-y border-r border-sidebar-border shadow-sm text-sidebar-foreground/50 transition-all duration-300 z-0
          top-6
          w-6 h-7
          rounded-r-xs
          ${isHovered ? 'opacity-0 -translate-x-full' : 'opacity-100 translate-x-0'}
        `}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="12" x2="20" y2="12"></line>
          <line x1="4" y1="6" x2="20" y2="6"></line>
          <line x1="4" y1="18" x2="20" y2="18"></line>
        </svg>
      </div>

      {/* KHUNG SIDEBAR CHÍNH */}
      <aside
        // ĐIỀU CHỈNH NỀN: Dùng bg-white/95 để sáng sủa. Khi sang dark mode thì tự dùng bg-sidebar
        className={`absolute top-0 left-0 h-full w-64 bg-white/95 dark:bg-sidebar/95 backdrop-blur-md border-r border-sidebar-border shadow-2xl flex flex-col transition-transform duration-300 ease-in-out z-20 ${
          isHovered ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 flex flex-col gap-2 flex-1 mt-2">
          
          <button 
            onClick={() => console.log('Leaderboard coming soon...')}
            className={`text-left ${getBtnStyle(false)}`}
          >
            Leaderboard
          </button>

          <Link 
            to="/profile/me" 
            className={getBtnStyle(isActive('/profile/me'))}
          >
            My Profile
          </Link>

          <button 
            onClick={() => console.log('Friends coming soon...')}
            className={`text-left ${getBtnStyle(false)}`}
          >
            Friends
          </button>

          <button 
            onClick={() => console.log('World Chat coming soon...')}
            className={`text-left ${getBtnStyle(false)}`}
          >
            World Chat
          </button>

        </div>
      </aside>
    </div>
  )
}