import { MousePointer2, Shovel, Backpack, Store } from 'lucide-react'
import { useState } from 'react'

export function GardenToolbar() {
  // Tạm thời đặt state ở đây để test layout, sau này sẽ move (lift state up) 
  // lên hook hoặc context để điều khiển logic trong PixiJS.
  const [activeTool, setActiveTool] = useState<'cursor' | 'shovel'>('cursor')

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 bg-background/80 backdrop-blur-md border border-border rounded-2xl shadow-xl z-10">
      
      {/* KHU VỰC CÔNG CỤ (Thay đổi chế độ click chuột trên grid) */}
      <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl">
        <ToolButton 
          icon={<MousePointer2 size={24} />} 
          label="Con trỏ" 
          isActive={activeTool === 'cursor'} 
          onClick={() => setActiveTool('cursor')} 
        />
        <ToolButton 
          icon={<Shovel size={24} />} 
          label="Nhổ cây" 
          isActive={activeTool === 'shovel'} 
          onClick={() => setActiveTool('shovel')} 
        //   TODO: Add shortcut key D
        />
      </div>

      {/* Vạch chia cách */}
      <div className="w-[2px] h-10 bg-border mx-1 rounded-full" />

      {/* KHU VỰC MENU (Mở Modal/Popup) */}
      <div className="flex items-center gap-1 p-1">
        <MenuButton 
          icon={<Backpack size={24} />} 
          label="Túi đồ" 
          onClick={() => console.log('Mở Inventory')} 
          shortcut="E"
        />
        <MenuButton 
          icon={<Store size={24} />} 
          label="Cửa hàng" 
          onClick={() => console.log('Mở Shop')} 
          shortcut="S"
        />
      </div>
    </div>
  )
}

// --- Các Component nhỏ gọn hỗ trợ giao diện ---

function ToolButton({ icon, label, isActive, onClick }: { icon: React.ReactNode, label: string, isActive: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`relative p-3 rounded-xl transition-all duration-200 ease-in-out flex items-center justify-center
        ${isActive 
          ? 'bg-primary text-primary-foreground shadow-inner scale-95' // Trạng thái đang chọn (lún xuống)
          : 'bg-background text-foreground hover:bg-muted hover:-translate-y-1 shadow-sm' // Trạng thái bình thường
        }
      `}
    >
      {icon}
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
      {/* Phím tắt (Bắt chước kiểu game) */}
      {shortcut && (
        <span className="absolute -bottom-2 -right-2 bg-background text-muted-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-md border border-border shadow-sm group-hover:scale-110 transition-transform">
          {shortcut}
        </span>
      )}
    </button>
  )
}