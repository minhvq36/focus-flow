import { useState } from 'react'
import { X, Loader2, Store, ShoppingCart, Coins, CircleDollarSign } from 'lucide-react'
import { useWallet, useShopItems, useSellableItems } from '../hooks/use-economy'
import { getAssetUrl } from '@/lib/storage'
import type { ShopItemResponse, SellableItemResponse } from '@/types/economy'

interface ShopModalProps {
  isOpen: boolean
  onClose: () => void
}

type TabType = 'buy' | 'sell'

export function ShopModal({ isOpen, onClose }: ShopModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('buy')

  // Fetch Data trực tiếp từ Backend (Không cần useMemo nữa vì BE đã gom sẵn)
  const { data: wallet } = useWallet()
  const { data: buyItems, isLoading: loadingBuy } = useShopItems()
  const { data: sellItems, isLoading: loadingSell } = useSellableItems()

  const isLoading = activeTab === 'buy' ? loadingBuy : loadingSell
  const items = activeTab === 'buy' ? buyItems : sellItems

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
        isOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
      }`}
    >
      <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={onClose} />

      <div 
        className={`relative w-full max-w-5xl h-[80vh] min-h-[500px] flex flex-col bg-white/95 backdrop-blur-xl border border-slate-200 rounded-3xl shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-8'
        }`}
      >
        {/* === HEADER === */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50/80 rounded-t-3xl">
          <div className="flex items-center gap-3 text-xl font-extrabold text-slate-800">
            <Store size={28} className="text-amber-500 drop-shadow-sm" />
            Garden Shop
          </div>

          {/* User Wallet Display */}
          {wallet && (
            <div className="hidden sm:flex items-center gap-4 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-1.5 font-bold text-slate-700">
                <CircleDollarSign size={18} className="text-slate-400" />
                {wallet.silver_balance}
              </div>
              <div className="w-px h-4 bg-slate-200"></div>
              <div className="flex items-center gap-1.5 font-bold text-amber-600">
                <Coins size={18} className="text-amber-500" />
                {wallet.gold_balance}
              </div>
            </div>
          )}

          <button 
            onClick={onClose}
            className="p-2 hover:bg-red-50 hover:text-red-500 text-slate-400 rounded-xl transition-colors focus:outline-none"
          >
            <X size={24} />
          </button>
        </div>

        {/* === TABS === */}
        <div className="flex p-4 gap-2 bg-white/50 border-b border-slate-100">
          <button
            onClick={() => setActiveTab('buy')}
            className={`flex-1 py-2.5 rounded-xl font-bold transition-all focus:outline-none ${
              activeTab === 'buy' 
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' 
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            Buy Items
          </button>
          <button
            onClick={() => setActiveTab('sell')}
            className={`flex-1 py-2.5 rounded-xl font-bold transition-all focus:outline-none ${
              activeTab === 'sell' 
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20' 
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            Sell to Shop
          </button>
        </div>

        {/* === CONTENT GRID === */}
        <div className="p-4 overflow-y-auto flex-1 custom-scrollbar scroll-smooth">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <Loader2 className="animate-spin mb-4 text-emerald-500" size={40} />
              <p className="font-medium text-lg">Loading items...</p>
            </div>
          ) : !items || items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-90">
              <ShoppingCart size={64} className="mb-4 text-slate-300" strokeWidth={1.5} />
              <p className="font-medium text-lg">Nothing to show here</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
              {items.map((item) => {
                const isBuy = activeTab === 'buy'
                
                // Ép kiểu để TypeScript gợi ý code chuẩn xác
                const buyItem = item as ShopItemResponse
                const sellItem = item as SellableItemResponse
                
                const imageUrl = getAssetUrl(item.asset_key)

                return (
                  <div 
                    key={isBuy ? buyItem.id : sellItem.item_id} 
                    className={`relative group bg-slate-50 border border-slate-200 rounded-2xl p-3 flex flex-col items-center gap-2 hover:bg-white transition-all cursor-pointer shadow-sm hover:shadow-lg ${
                      isBuy ? 'hover:border-emerald-400' : 'hover:border-amber-400'
                    }`}
                  >
                    {/* Ảnh và xử lý lỗi */}
                    <div className="w-full aspect-square bg-slate-100/50 rounded-xl flex items-center justify-center p-2 mb-1 relative">
                      <img 
                        src={imageUrl} 
                        alt={item.name}
                        className="w-[80%] h-[80%] object-contain group-hover:scale-110 transition-transform duration-300 drop-shadow-md"
                        onError={(e) => {
                          const emptyImage = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=='
                          if (e.currentTarget.src !== emptyImage) {
                            e.currentTarget.src = emptyImage
                          }
                        }}
                      />
                      
                      {/* Badge số lượng (Sử dụng trực tiếp sellItem.quantity từ Backend) */}
                      {!isBuy && sellItem.quantity > 1 && (
                        <div className="absolute -bottom-2 -right-2 bg-amber-500 text-white text-[11px] font-bold px-1.5 py-0.5 rounded-md border-2 border-white shadow-sm z-10">
                          x{sellItem.quantity}
                        </div>
                      )}
                    </div>
                    
                    {/* Item Name */}
                    <div className="text-sm font-bold text-slate-700 text-center line-clamp-1 w-full" title={item.name}>
                      {item.name}
                    </div>

                    {/* Price Badge */}
                    <div className={`w-full py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 text-sm font-bold border ${
                      isBuy ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'
                    }`}>
                      <CircleDollarSign size={16} />
                      {isBuy ? buyItem.silver_price : sellItem.buyback_silver}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}