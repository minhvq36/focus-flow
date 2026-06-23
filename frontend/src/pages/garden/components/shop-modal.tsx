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

// ==========================================
// COMPONENT PHỤ: COIN ICON VỚI FALLBACK
// ==========================================
function CoinIcon({ 
  type, 
  variant = 'single', 
  className = "" 
}: { 
  type: 'silver' | 'gold', 
  variant?: 'single' | 'pile', 
  className?: string 
}) {
  const [imgError, setImgError] = useState(false)

  if (imgError) {
    return type === 'gold' 
      ? <Coins size={16} className={`text-amber-500 drop-shadow-sm ${className}`} /> 
      : <CircleDollarSign size={16} className={`text-slate-500 ${className}`} />
  }

  return (
    <img 
      src={`/coins/${type}-${variant}.png`}
      alt={`${type} ${variant}`} 
      className={`object-contain drop-shadow-sm transition-transform ${className}`}
      onError={() => setImgError(true)} 
    />
  )
}

// ==========================================
// COMPONENT CHÍNH: SHOP MODAL
// ==========================================
export function ShopModal({ isOpen, onClose }: ShopModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('buy')

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

          {/* User Wallet Display (Dùng variant="pile") */}
          {wallet && (
            <div className="hidden sm:flex items-center gap-4 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-1.5 font-bold text-slate-700">
                <CoinIcon type="silver" variant="pile" className="w-6 h-6" />
                {wallet.silver_balance}
              </div>
              <div className="w-px h-4 bg-slate-200"></div>
              <div className="flex items-center gap-1.5 font-bold text-amber-600">
                <CoinIcon type="gold" variant="pile" className="w-6 h-6" />
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
                      
                      {!isBuy && sellItem.quantity > 1 && (
                        <div className="absolute -bottom-2 -right-2 bg-amber-500 text-white text-[11px] font-bold px-1.5 py-0.5 rounded-md border-2 border-white shadow-sm z-10">
                          x{sellItem.quantity}
                        </div>
                      )}
                    </div>
                    
                    <div className="text-sm font-bold text-slate-700 text-center line-clamp-1 w-full" title={item.name}>
                      {item.name}
                    </div>

                    {/* === KHU VỰC HIỂN THỊ NÚT MUA/BÁN === */}
                    <div className="w-full flex gap-1.5 mt-auto">
                      {isBuy ? (
                        // TAB MUA
                        <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            console.log('Mua item:', buyItem.id)
                          }}
                          className="group/btn flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 text-sm font-bold border bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-colors focus:outline-none"
                        >
                          <CoinIcon type="silver" className="w-4 h-4 group-hover/btn:scale-110 group-hover/btn:brightness-110" />
                          {buyItem.silver_price}
                        </button>
                      ) : (
                        // TAB BÁN
                        <>
                          {/* NÚT BÁN LẤY VÀNG (Màu Blue Premium) */}
                          {sellItem.buyback_gold > 0 && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation()
                                console.log('Bán lấy Vàng item:', sellItem.item_id)
                              }}
                              className="group/btn flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 text-sm font-bold border bg-violet-50 border-violet-300 text-violet-800 hover:bg-violet-600 hover:text-white hover:border-violet-600 transition-colors focus:outline-none shadow-sm"
                            >
                              <CoinIcon type="gold" className="w-4 h-4 group-hover/btn:scale-110 group-hover/btn:brightness-110" />
                              {sellItem.buyback_gold}
                            </button>
                          )}

                          {/* NÚT BÁN LẤY BẠC */}
                          {(sellItem.buyback_silver > 0 || sellItem.buyback_gold === 0) && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation()
                                console.log('Bán lấy Bạc item:', sellItem.item_id)
                              }}
                              className="group/btn flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 text-sm font-bold border bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-400 hover:text-white hover:border-amber-400 transition-colors focus:outline-none"
                            >
                              <CoinIcon type="silver" className="w-4 h-4 group-hover/btn:scale-110 group-hover/btn:brightness-110" />
                              {sellItem.buyback_silver}
                            </button>
                          )}
                        </>
                      )}
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