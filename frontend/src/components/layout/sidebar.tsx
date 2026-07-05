import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

export default function Sidebar() {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;
  
  const [isHovered, setIsHovered] = useState(false);

  const getBtnStyle = (active: boolean) => 
    `px-4 py-3 rounded-lg transition-all font-medium flex items-center gap-3 ${
        active 
        ? 'bg-emerald-100/70 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400' 
        : 'text-sidebar-foreground/60 hover:bg-emerald-50/60 hover:text-emerald-800 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400'
    }`;

  return (
    <div
      // UPGRADE CHÍNH LÀ Ở ĐÂY: Dùng top-16 và bottom-0 để Sidebar lọt thỏm ngay dưới Header
      className="absolute top-16 bottom-0 left-0 z-40"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="absolute top-0 left-0 w-8 h-full bg-transparent z-10" />

      {/* Tay kéo (Giữ nguyên top-6, vì bây giờ nó cách đỉnh của Sidebar chứ không bị che nữa) */}
      <div 
        className={`absolute left-2 top-6 flex items-center justify-center w-8 h-12 rounded-full bg-white/50 dark:bg-sidebar/50 backdrop-blur-lg backdrop-saturate-150 border border-border/60 shadow-md text-foreground/50 transition-all duration-300 ease-out z-0
          ${isHovered ? 'opacity-0 -translate-x-8 scale-90' : 'opacity-100 translate-x-0 scale-100'}
        `}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </div>

      {/* Khung Sidebar */}
      <aside
        className={`absolute top-0 left-0 h-full w-64 bg-white/50 dark:bg-sidebar/50 backdrop-blur-lg backdrop-saturate-150 border-r border-border/60 shadow-2xl flex flex-col transition-transform duration-300 ease-out z-20 ${
          isHovered ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 flex flex-col gap-2 flex-1 mt-2">
          
          <button onClick={() => console.log('Leaderboard')} className={`text-left ${getBtnStyle(false)}`}>
            Leaderboard
          </button>

          <Link to="/profile/me" className={getBtnStyle(isActive('/profile/me'))}>
            My Profile
          </Link>

          <button onClick={() => console.log('Friends')} className={`text-left ${getBtnStyle(false)}`}>
            Friends
          </button>

          <button onClick={() => console.log('World Chat')} className={`text-left ${getBtnStyle(false)}`}>
            World Chat
          </button>

        </div>
      </aside>
    </div>
  )
}