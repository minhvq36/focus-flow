import { X, Loader2, PackageOpen } from 'lucide-react'
import { useInventoryBag } from '../hooks/use-inventory'
import { getAssetUrl } from '@/lib/storage'
import { useEffect } from 'react'
import { usePlacementStore } from '@/store/placement-store'

interface InventoryModalProps {
  isOpen: boolean
  onClose: () => void
}

export function InventoryModal({ isOpen, onClose }: InventoryModalProps) {
  const { data: items, isLoading, error } = useInventoryBag()
  const { setActiveItem } = usePlacementStore()

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!isOpen) return
      const target = e.target as HTMLElement
      if (target.closest('button[title*="Túi đồ"]')) return
      if (!target.closest('#inventory-panel')) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose])

  return (
    <div 
      id="inventory-panel"
      /* CHỈNH SỬA: Nền trắng trong suốt (white/95), viền mảnh slate-200, bóng đổ mềm mại (soft shadow) */
      className={`fixed top-24 right-2 md:right-4 z-40 w-[320px] sm:w-[380px] min-h-[300px] max-h-[calc(100vh-180px)] flex flex-col bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-2xl shadow-[0_12px_40px_-12px_rgba(0,0,0,0.15)] transition-all duration-300 ease-in-out origin-top-right ${
        isOpen 
          ? 'opacity-100 scale-100 translate-y-0' 
          : 'opacity-0 scale-95 -translate-y-4 pointer-events-none'
      }`}
    >
      {/* Header */}
      {/* CHỈNH SỬA: Đổi màu nền header thành trắng tinh, text màu slate-800 đậm */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50 rounded-t-2xl">
        <div className="flex items-center gap-2 text-lg font-bold text-slate-800">
          <PackageOpen size={24} className="text-amber-500 drop-shadow-sm" />
          Your Inventory
        </div>
        <button 
          onClick={onClose}
          /* CHỈNH SỬA: Nút đóng khi hover sẽ có nền đỏ nhạt, icon đỏ */
          className="p-1.5 hover:bg-red-50 hover:text-red-500 text-slate-400 rounded-lg transition-colors focus:outline-none"
        >
          <X size={20} />
        </button>
      </div>

      {/* Nội dung túi đồ */}
      <div className="p-4 overflow-y-auto flex-1 custom-scrollbar scroll-smooth [scrollbar-gutter:stable]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 min-h-[200px]">
            <Loader2 className="animate-spin mb-4 text-amber-500" size={32} />
            <p className="font-medium">Loading inventory...</p>
          </div>
        ) : error ? (
          <div className="text-red-600 text-center py-6 bg-red-50 border border-red-100 rounded-xl font-medium">
            Error loading inventory!
          </div>
        ) : items && items.length > 0 ? (
          
          <div className="grid grid-cols-4 gap-3 justify-center w-full">
            {items.map((item) => {
              const imageUrl = getAssetUrl(item.asset_key)

              return (
                <div 
                  key={item.item_id} 
                  onClick={() => {
                    setActiveItem(item)
                  }}
                  className="relative group w-full aspect-square bg-slate-50/80 border border-slate-200 rounded-xl flex items-center justify-center hover:bg-amber-50 hover:border-amber-400 transition-all cursor-pointer shadow-sm hover:shadow-md"
                  title={`${item.name} (${item.width}x${item.height})`}
                >
                  <img 
                    src={imageUrl} 
                    alt={item.name}
                    className="w-[70%] h-[70%] object-contain group-hover:scale-110 transition-transform drop-shadow-md"
                    onError={(e) => {
                      const emptyImage = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=='
                      if (e.currentTarget.src !== emptyImage) {
                        e.currentTarget.src = emptyImage
                      }
                    }}
                  />
                  {/* CHỈNH SỬA: Viền ngoài của số lượng chuyển sang màu trắng tinh (border-white) để nổi bật trên nền */}
                  <div className="absolute -bottom-2 -right-2 bg-amber-500 text-white text-[11px] font-bold px-1.5 py-0.5 rounded-md border-2 border-white shadow-sm">
                    x{item.quantity}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-90 min-h-[200px]">
            <PackageOpen size={56} className="mb-4 text-slate-300" strokeWidth={1.5} />
            <p className="font-medium">Your inventory is empty</p>
          </div>
        )}
      </div>
    </div>
  )
}