import { X, Loader2, PackageOpen } from 'lucide-react'
import { useInventoryBag } from '../hooks/use-inventory'
import { getAssetUrl } from '@/lib/storage' // <-- Import hàm dùng chung ở đây

interface InventoryModalProps {
  isOpen: boolean
  onClose: () => void
}

export function InventoryModal({ isOpen, onClose }: InventoryModalProps) {
  const { data: items, isLoading, error } = useInventoryBag()

  if (!isOpen) return null

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-auto">
      <div className="bg-background border border-border w-[500px] max-w-[90vw] rounded-2xl shadow-2xl flex flex-col max-h-[80vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2 text-lg font-bold">
            <PackageOpen size={24} className="text-amber-500" />
            Your Inventory
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-muted rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body / Item Grid */}
        <div className="p-4 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <Loader2 className="animate-spin mb-2" size={32} />
              <p>Loading your inventory...</p>
            </div>
          ) : error ? (
            <div className="text-destructive text-center py-8">
              Error loading inventory
            </div>
          ) : items && items.length > 0 ? (
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
              {items.map((item) => {
                // Tận dụng getAssetUrl từ thư viện chung
                // *Lưu ý: Nếu hàm getAssetUrl của bạn chưa tự gắn đuôi .png thì truyền item.asset_key + '.png'
                const imageUrl = getAssetUrl(item.asset_key) || getAssetUrl(`${item.asset_key}.png`)

                return (
                  <div 
                    key={item.item_id} 
                    className="relative group aspect-square bg-muted/30 border border-border rounded-xl flex items-center justify-center hover:bg-muted/80 hover:border-amber-400/50 transition-all cursor-pointer"
                    title={`${item.name} (${item.width}x${item.height})`}
                  >
                    <img 
                        src={imageUrl} 
                        alt={item.name}
                        className="w-3/4 h-3/4 object-contain group-hover:scale-110 transition-transform drop-shadow-md"
                        onError={(e) => {
                            // Dùng GIF trong suốt 1x1 pixel (Siêu nhẹ, không tốn resource, không request mạng)
                            const emptyImage = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=='
                            
                            // Chặn loop vô hạn
                            if (e.currentTarget.src !== emptyImage) {
                            e.currentTarget.src = emptyImage
                            
                            // Mẹo nhỏ: Bạn có thể giảm opacity của ô này xuống 50% để biểu thị là "đang lỗi ảnh" 
                            // e.currentTarget.style.opacity = '0.5' 
                            }
                        }}
                    />
                    {/* Badge Số lượng */}
                    <div className="absolute -bottom-2 -right-2 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md border border-background shadow-sm">
                      x{item.quantity}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <p>Your inventory is empty</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}