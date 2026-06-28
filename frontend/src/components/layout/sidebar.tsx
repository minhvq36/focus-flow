import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

export default function Sidebar() {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;
  
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      /* Outer container managing the hover events */
      className="absolute top-0 left-0 h-full z-40"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="absolute top-0 left-0 w-7 h-full bg-transparent z-10" />

      <div 
        className={`absolute left-0 flex items-center justify-center bg-white/60 backdrop-blur-sm border-y border-r border-gray-200 shadow-sm text-gray-400 transition-all duration-300 z-0
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

      <aside
        className={`absolute top-0 left-0 h-full w-64 bg-white/95 backdrop-blur-md border-r shadow-2xl flex flex-col transition-transform duration-300 ease-in-out z-20 ${
          isHovered ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 flex flex-col gap-2 flex-1 mt-2">
          <button 
            onClick={() => console.log('Leaderboard coming soon...')}
            className="text-left px-4 py-3 rounded-lg transition-colors font-medium text-gray-600 hover:bg-gray-50"
          >
            Leaderboard
          </button>

          <Link 
            to="/profile/me" 
            className={`px-4 py-3 rounded-lg transition-colors font-medium ${
              isActive('/profile/me') ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            My Profile
          </Link>

          <button 
            onClick={() => console.log('Friends coming soon...')}
            className="text-left px-4 py-3 rounded-lg transition-colors font-medium text-gray-600 hover:bg-gray-50"
          >
            Friends
          </button>

          <button 
            onClick={() => console.log('World Chat coming soon...')}
            className="text-left px-4 py-3 rounded-lg transition-colors font-medium text-gray-600 hover:bg-gray-50"
          >
            World Chat
          </button>

        </div>
      </aside>
    </div>
  )
}