import { X, Loader2, PackageOpen } from 'lucide-react'
import { useInventoryBag } from '../hooks/use-inventory'
import { getAssetUrl } from '@/lib/storage'
import { useEffect } from 'react'

interface InventoryModalProps {
  isOpen: boolean
  onClose: () => void
}

export function InventoryModal({ isOpen, onClose }: InventoryModalProps) {
  const { data: items, isLoading, error } = useInventoryBag()

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
      /* * OPTIMIZED: 
       * - Reduced width from 340px/400px to 310px/350px to save space.
       * - Positioned closer to the viewport edge (right-2 md:right-4).
       */
      className={`fixed top-24 right-2 md:right-4 z-40 w-[320px] sm:w-[380px] min-h-[300px] max-h-[calc(100vh-180px)] flex flex-col bg-background/90 backdrop-blur-xl border border-border rounded-2xl shadow-2xl transition-all duration-300 ease-in-out origin-top-right ${
        isOpen 
          ? 'opacity-100 scale-100 translate-y-0' 
          : 'opacity-0 scale-95 -translate-y-4 pointer-events-none'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30 rounded-t-2xl">
        <div className="flex items-center gap-2 text-lg font-bold">
          <PackageOpen size={24} className="text-amber-500" />
          Your Inventory
        </div>
        <button 
          onClick={onClose}
          className="p-1.5 hover:bg-destructive/10 hover:text-destructive text-muted-foreground rounded-lg transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Nội dung túi đồ */}
      <div className="p-4 overflow-y-auto flex-1 custom-scrollbar scroll-smooth [scrollbar-gutter:stable]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground min-h-[200px]">
            <Loader2 className="animate-spin mb-4" size={32} />
            <p>Loading inventory...</p>
          </div>
        ) : error ? (
          <div className="text-destructive text-center py-8 bg-destructive/10 rounded-xl">
            Error loading inventory
          </div>
        ) : items && items.length > 0 ? (
          /* * OPTIMIZED: 
           * - Added 'justify-center' to perfectly center the grid items inside the container.
           * - Set 'w-full' to ensure the grid leverages all available space minus padding.
           */
          <div className="grid grid-cols-4 gap-3 justify-center w-full">
            {items.map((item) => {
              const imageUrl = getAssetUrl(item.asset_key)

              return (
                <div 
                  key={item.item_id} 
                  /* * OPTIMIZED: 
                   * - Kept 'aspect-square' and added 'w-full' to let the grid dictate the width dynamically.
                   */
                  className="relative group w-full aspect-square bg-muted/40 border border-border rounded-xl flex items-center justify-center hover:bg-amber-500/10 hover:border-amber-400 transition-all cursor-pointer shadow-sm hover:shadow-md"
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
                  <div className="absolute -bottom-2 -right-2 bg-amber-500 text-white text-[11px] font-bold px-1.5 py-0.5 rounded-md border-2 border-background shadow-sm">
                    x{item.quantity}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-60 min-h-[200px]">
            <PackageOpen size={48} className="mb-4" />
            <p>Your inventory is empty</p>
          </div>
        )}
      </div>
    </div>
  )
}