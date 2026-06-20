import { useState } from 'react'
import { X, Loader2, Store, ShoppingCart, Coins, CircleDollarSign } from 'lucide-react'
import { useWallet, useShopItems, useSellableItems } from '../hooks/use-economy'
import { getAssetUrl } from '@/lib/storage'

interface ShopModalProps {
  isOpen: boolean
  onClose: () => void
}

type TabType = 'buy' | 'sell'

export function ShopModal({ isOpen, onClose }: ShopModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('buy')

  // Fetch Data
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
      {/* Backdrop mờ phía sau để focus vào Shop */}
      <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={onClose} />

      {/* Main Panel - Rộng rãi hơn Inventory (w-full max-w-3xl) */}
      <div 
        className={`relative w-full max-w-3xl h-[80vh] min-h-[500px] flex flex-col bg-white/95 backdrop-blur-xl border border-slate-200 rounded-3xl shadow-2xl transition-transform duration-300 ease-out ${
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
            className={`flex-1 py-2.5 rounded-xl font-bold transition-all ${
              activeTab === 'buy' 
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20' 
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            Buy Items
          </button>
          <button
            onClick={() => setActiveTab('sell')}
            className={`flex-1 py-2.5 rounded-xl font-bold transition-all ${
              activeTab === 'sell' 
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' 
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
              <Loader2 className="animate-spin mb-4 text-amber-500" size={40} />
              <p className="font-medium text-lg">Loading items...</p>
            </div>
          ) : !items || items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-90">
              <ShoppingCart size={64} className="mb-4 text-slate-300" strokeWidth={1.5} />
              <p className="font-medium text-lg">Nothing to show here</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
              {/* @ts-ignore - Ignore type warning temporarily since items can be Buy or Sell type */}
              {items.map((item: any) => {
                const imageUrl = getAssetUrl(item.asset_key)
                const isBuy = activeTab === 'buy'

                return (
                  <div 
                    key={isBuy ? item.id : item.inventory_id} 
                    className="relative group bg-slate-50 border border-slate-200 rounded-2xl p-3 flex flex-col items-center gap-2 hover:bg-white hover:border-amber-400 transition-all cursor-pointer shadow-sm hover:shadow-lg"
                  >
                    {/* Image Area */}
                    <div className="w-full aspect-square bg-slate-100/50 rounded-xl flex items-center justify-center p-2 mb-1">
                      <img 
                        src={imageUrl} 
                        alt={item.name}
                        className="w-[80%] h-[80%] object-contain group-hover:scale-110 transition-transform duration-300 drop-shadow-md"
                      />
                    </div>
                    
                    {/* Item Name */}
                    <div className="text-sm font-bold text-slate-700 text-center line-clamp-1 w-full">
                      {item.name}
                    </div>

                    {/* Price Badge */}
                    <div className={`w-full py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 text-sm font-bold border ${
                      isBuy ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    }`}>
                      <CircleDollarSign size={16} />
                      {isBuy ? item.silver_price : item.buyback_silver}
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