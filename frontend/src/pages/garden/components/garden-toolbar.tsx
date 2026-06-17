import { MousePointer2, Shovel, Backpack, Store } from 'lucide-react'
import { useState, useEffect } from 'react'
import { InventoryModal } from './inventory-modal'
import { usePlacementStore } from '@/store/placement-store'

export function GardenToolbar() {
  const { activeTool, setTool } = usePlacementStore()
  const [isInventoryOpen, setIsInventoryOpen] = useState(false)

  // Xử lý phím tắt
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if ((e.target as HTMLElement)?.isContentEditable) return

      if (e.code === 'KeyE') {
        setIsInventoryOpen(prev => !prev) // Toggle túi đồ
      }
      if (e.code === 'KeyD') {
        setTool('shovel')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <>
      {/* Gọi Modal ở ngoài cùng */}
      <InventoryModal 
        isOpen={isInventoryOpen} 
        onClose={() => setIsInventoryOpen(false)} 
      />

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 bg-background/80 backdrop-blur-md border border-border rounded-2xl shadow-xl z-10">
        
        {/* KHU VỰC CÔNG CỤ */}
        <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl">
          <ToolButton 
            icon={<MousePointer2 size={24} />} 
            label="Cursor" 
            isActive={activeTool === 'cursor'} 
            onClick={() => setTool('cursor')} 
          />
          <ToolButton 
            icon={<Shovel size={24} />} 
            label="Shovel" 
            isActive={activeTool === 'shovel'} 
            onClick={() => setTool('shovel')}
            shortcut="D" 
          />
        </div>

        {/* Vạch chia cách */}
        <div className="w-[2px] h-10 bg-border mx-1 rounded-full" />

        {/* KHU VỰC MENU */}
        <div className="flex items-center gap-1 p-1">
          <MenuButton 
            icon={<Backpack size={24} />} 
            label="Inventory" 
            onClick={() => setIsInventoryOpen(!isInventoryOpen)} 
            shortcut="E"
          />
          <MenuButton 
            icon={<Store size={24} />} 
            label="Shop" 
            onClick={() => console.log('Mở Shop')} 
            shortcut="S"
          />
        </div>
      </div>
    </>
  )
}

// --- Các Component nhỏ gọn hỗ trợ giao diện ---
// (Giữ nguyên như cũ của bạn)
function ToolButton({ icon, label, isActive, onClick, shortcut }: { icon: React.ReactNode, label: string, isActive: boolean, onClick: () => void, shortcut?: string }) {
  return (
    <button
      onClick={onClick}
      title={`${label} ${shortcut ? `(${shortcut})` : ''}`}
      className={`group relative p-3 rounded-xl transition-all duration-200 ease-in-out flex items-center justify-center
        ${isActive 
          ? 'bg-primary text-primary-foreground shadow-inner scale-95' 
          : 'bg-background text-foreground hover:bg-muted hover:-translate-y-1 shadow-sm' 
        }
      `}
    >
      {icon}
      
      {/* Thêm khối này để render huy hiệu phím tắt (badge) giống như MenuButton */}
      {shortcut && (
        <span className="absolute -bottom-2 -right-2 bg-background text-muted-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-md border border-border shadow-sm group-hover:scale-110 transition-transform">
          {shortcut}
        </span>
      )}
    </button>
  )
}

function MenuButton({ icon, label, onClick, shortcut }: { icon: React.ReactNode, label: string, onClick: () => void, shortcut?: string }) {
  return (
    <button
      onClick={onClick}
      title={`${label} ${shortcut ? `(${shortcut})` : ''}`}
      className="group relative p-3 rounded-xl bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-white transition-all duration-200 hover:-translate-y-1 shadow-sm border border-amber-500/20"
    >
      {icon}
      {shortcut && (
        <span className="absolute -bottom-2 -right-2 bg-background text-muted-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-md border border-border shadow-sm group-hover:scale-110 transition-transform">
          {shortcut}
        </span>
      )}
    </button>
  )
}