import { useState, useEffect } from 'react'
import { X, Loader2, Store, ShoppingCart, Coins, CircleDollarSign } from 'lucide-react'
import { toast } from 'sonner'
import { 
  useWallet, 
  useShopItems, 
  useSellableItems, 
  useBuyItem, 
  useSellItem 
} from '../hooks/use-economy'
import { getAssetUrl } from '@/lib/storage'
import { formatCurrency } from '@/lib/utils'
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
// COMPONENT PHỤ: DIALOG CHỌN SỐ LƯỢNG & CONFIRM
// ==========================================
type TxType = 'buy' | 'sell_silver' | 'sell_gold'

interface TransactionDialogProps {
  isOpen: boolean
  isProcessing: boolean 
  type: TxType
  item: ShopItemResponse | SellableItemResponse | null
  maxQuantity: number
  onClose: () => void
  onConfirm: (quantity: number) => void
}

function TransactionDialog({ isOpen, isProcessing, type, item, maxQuantity, onClose, onConfirm }: TransactionDialogProps) {
  const [amountStr, setAmountStr] = useState<string>('1')

  useEffect(() => {
    if (isOpen) setAmountStr('1')
  }, [isOpen])

  if (!isOpen || !item) return null

  const isGold = type === 'sell_gold'
  const isBuy = type === 'buy'
  const isSingleGoldSell = isGold && maxQuantity === 1

  const itemName = item.name
  const price = isBuy 
    ? (item as ShopItemResponse).silver_price 
    : isGold 
      ? (item as SellableItemResponse).buyback_gold 
      : (item as SellableItemResponse).buyback_silver

  const handleAmountChange = (val: string) => {
    const numericVal = val.replace(/\D/g, '')
    if (numericVal === '') {
      setAmountStr('')
      return
    }
    
    let num = parseInt(numericVal, 10)
    if (num > maxQuantity) num = maxQuantity
    if (num < 1 && val !== '') num = 1
    
    setAmountStr(num.toString())
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (["e", "E", "+", "-", "."].includes(e.key)) {
      e.preventDefault()
    }
  }

  const handleConfirm = () => {
    const finalAmount = parseInt(amountStr, 10) || 1
    onConfirm(finalAmount)
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center">
      {/* Không cho click ra ngoài khi đang processing */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={!isProcessing ? onClose : undefined} />
      
      <div className="relative bg-white p-6 rounded-2xl shadow-2xl border border-slate-200 w-80 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
        
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          {isBuy ? 'Purchase Item' : 'Sell Item'}
        </h3>

        <div className="text-slate-600 text-sm">
          {isBuy 
            ? `How many ${itemName}s do you want to buy?` 
            : `How many ${itemName}s do you want to sell?`}
        </div>

        {!isSingleGoldSell && (
          <div className="flex flex-col gap-1">
            <div className={`flex items-center justify-between border-2 rounded-xl overflow-hidden transition-colors ${isProcessing ? 'border-slate-100 opacity-60' : 'border-slate-200 focus-within:border-amber-400'}`}>
              <button 
                onClick={() => handleAmountChange(String(Math.max(1, parseInt(amountStr || '0') - 1)))}
                disabled={isProcessing}
                className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold disabled:cursor-not-allowed"
              >-</button>
              
              <input 
                type="text"
                value={amountStr}
                onChange={(e) => handleAmountChange(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isProcessing}
                className="w-full text-center font-bold text-lg focus:outline-none disabled:bg-white"
              />
              
              <button 
                onClick={() => handleAmountChange(String(Math.min(maxQuantity, parseInt(amountStr || '0') + 1)))}
                disabled={isProcessing}
                className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold disabled:cursor-not-allowed"
              >+</button>
            </div>
            <div className="text-xs text-slate-400 text-right">Max: {maxQuantity}</div>
          </div>
        )}

        {isGold && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3 rounded-none shadow-sm">
            You are about to sell this item for <b>Gold</b>. This action cannot be undone. Proceed?
          </div>
        )}

        <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
          <span className="text-sm font-bold text-slate-500">Total:</span>
          <div className="flex items-center gap-1.5 font-bold text-lg">
            <CoinIcon type={isBuy || !isGold ? 'silver' : 'gold'} className="w-5 h-5" />
            {formatCurrency(parseInt(amountStr || '0', 10) * price)}
          </div>
        </div>

        <div className="flex gap-2 mt-2">
          <button 
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 py-2 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button 
            onClick={handleConfirm}
            disabled={!amountStr || parseInt(amountStr) < 1 || isProcessing}
            className={`flex-1 py-2 rounded-xl font-bold text-white transition-colors disabled:opacity-80 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
              isBuy ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-amber-500 hover:bg-amber-600'
            }`}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}

// ==========================================
// COMPONENT CHÍNH: SHOP MODAL
// ==========================================
export function ShopModal({ isOpen, onClose }: ShopModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('buy')

  const [txState, setTxState] = useState<{
    isOpen: boolean;
    type: TxType;
    item: ShopItemResponse | SellableItemResponse | null;
    maxQty: number;
  }>({
    isOpen: false,
    type: 'buy',
    item: null,
    maxQty: 1
  })

  const { data: wallet } = useWallet()
  const { data: buyItems, isLoading: loadingBuy } = useShopItems()
  const { data: sellItems, isLoading: loadingSell } = useSellableItems()

  const buyMutation = useBuyItem()
  const sellMutation = useSellItem()

  const isLoadingData = activeTab === 'buy' ? loadingBuy : loadingSell
  const isProcessing = buyMutation.isPending || sellMutation.isPending
  const items = activeTab === 'buy' ? buyItems : sellItems

  const openTransaction = (type: TxType, item: ShopItemResponse | SellableItemResponse) => {
    let maxQty = 1;

    if (type === 'buy') {
      const bItem = item as ShopItemResponse;
      const affordable = wallet ? Math.floor(wallet.silver_balance / bItem.silver_price) : 0
      maxQty = Math.min(affordable, 99) 
      
      if (maxQty < 1) return 
    } else {
      const sItem = item as SellableItemResponse;
      maxQty = sItem.quantity;

      // Single Silver bypass
      if (type === 'sell_silver' && maxQty === 1) {
        executeSell(sItem, 1, 'silver')
        return
      }
    }

    setTxState({ isOpen: true, type, item, maxQty })
  }

  const executeSell = (sellItem: SellableItemResponse, qty: number, currency: 'silver'|'gold') => {
    const idsToSell = sellItem.instance_ids.slice(0, qty)
    
    sellMutation.mutate(
      { inventory_ids: idsToSell, receive_currency: currency },
      {
        onSuccess: () => {
          toast.success(`Sold ${qty}x ${sellItem.name} for ${currency === 'gold' ? 'Gold' : 'Silver'}!`)
          setTxState(prev => ({ ...prev, isOpen: false }))
        },
        onError: (err: any) => {
          toast.error(err?.response?.data?.message || 'Failed to sell item!')
          setTxState(prev => ({ ...prev, isOpen: false }))
        }
      }
    )
  }

  const handleTransactionConfirm = (quantity: number) => {
    if (!txState.item) return

    if (txState.type === 'buy') {
      const buyItem = txState.item as ShopItemResponse
      buyMutation.mutate(
        { item_id: buyItem.id, quantity },
        {
          onSuccess: () => {
            toast.success(`Purchased ${quantity}x ${buyItem.name}!`)
            setTxState(prev => ({ ...prev, isOpen: false }))
          },
          onError: (err: any) => {
            toast.error(err?.response?.data?.message || 'Transaction failed!')
            setTxState(prev => ({ ...prev, isOpen: false }))
          }
        }
      )
    } else {
      const sellItem = txState.item as SellableItemResponse
      const currency = txState.type === 'sell_gold' ? 'gold' : 'silver'
      executeSell(sellItem, quantity, currency)
    }
  }

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
        isOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
      }`}
    >
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />

      <div 
        className={`relative w-full max-w-5xl h-[80vh] min-h-[500px] flex flex-col bg-white/95 backdrop-blur-xl border border-slate-200 rounded-3xl shadow-2xl transition-transform duration-300 ease-out overflow-hidden ${
          isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-8'
        }`}
      >
        
        {/* ======================================================= */}
        {/* LỚP PHỦ LOADING ĐƠN GIẢN, TRẮNG MỜ, BAO TRÙM TOÀN BỘ MODAL */}
        {/* ======================================================= */}
        {isProcessing && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-[70] flex flex-col items-center justify-center rounded-3xl animate-in fade-in duration-200">
            {/* Vòng load custom: nhỏ (36px), mỏng (1.5), đầu vót tròn, màu xanh lá */}
            <svg 
              className="animate-spin text-emerald-500 mb-3" 
              width="36" 
              height="36" 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" className="opacity-20" />
              <path d="M12 2A10 10 0 0 1 22 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            
            {/* Chữ nhỏ lại (text-base thay vì text-2xl), bớt lố */}
            <span className="font-bold text-slate-700 text-base shadow-white drop-shadow-md">
              Processing transaction...
            </span>
          </div>
        )}

        <TransactionDialog 
          isOpen={txState.isOpen}
          isProcessing={isProcessing}
          type={txState.type}
          item={txState.item}
          maxQuantity={txState.maxQty}
          onClose={() => setTxState(prev => ({ ...prev, isOpen: false }))}
          onConfirm={handleTransactionConfirm}
        />

        <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50/80 rounded-t-3xl relative z-10">
          <div className="flex items-center gap-3 text-xl font-extrabold text-slate-800">
            <Store size={28} className="text-amber-500 drop-shadow-sm" />
            Garden Shop
          </div>

          {wallet && (
            <div className="hidden sm:flex items-center gap-4 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-1.5 font-bold text-slate-700">
                <CoinIcon type="silver" variant="pile" className="w-6 h-6" />
                {formatCurrency(wallet.silver_balance)}
              </div>
              <div className="w-px h-4 bg-slate-200"></div>
              <div className="flex items-center gap-1.5 font-bold text-amber-600">
                <CoinIcon type="gold" variant="pile" className="w-6 h-6" />
                {formatCurrency(wallet.gold_balance)}
              </div>
            </div>
          )}

          <button 
            onClick={onClose}
            disabled={isProcessing || txState.isOpen}
            className="p-2 hover:bg-red-50 hover:text-red-500 text-slate-400 rounded-xl transition-colors focus:outline-none disabled:opacity-50"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex p-4 gap-2 bg-white/50 border-b border-slate-100 relative z-10">
          <button
            onClick={() => setActiveTab('buy')}
            disabled={isProcessing || txState.isOpen}
            className={`flex-1 py-2.5 rounded-xl font-bold transition-all focus:outline-none disabled:opacity-70 disabled:cursor-not-allowed ${
              activeTab === 'buy' 
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' 
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            Buy Items
          </button>
          <button
            onClick={() => setActiveTab('sell')}
            disabled={isProcessing || txState.isOpen}
            className={`flex-1 py-2.5 rounded-xl font-bold transition-all focus:outline-none disabled:opacity-70 disabled:cursor-not-allowed ${
              activeTab === 'sell' 
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20' 
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            Sell to Shop
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 custom-scrollbar scroll-smooth relative z-0">
          {isLoadingData ? (
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

                const canAffordOne = isBuy && wallet ? wallet.silver_balance >= buyItem.silver_price : true

                return (
                  <div 
                    key={isBuy ? buyItem.id : sellItem.item_id} 
                    className={`relative group bg-slate-50 border border-slate-200 rounded-2xl p-3 flex flex-col items-center gap-2 transition-all shadow-sm ${
                      !canAffordOne && isBuy ? 'opacity-60 grayscale-[50%]' : 'hover:bg-white hover:shadow-lg'
                    } ${isBuy ? 'hover:border-emerald-400' : 'hover:border-amber-400'}`}
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
                      
                      {!isBuy && sellItem.quantity > 0 && (
                        <div className="absolute -bottom-2 -right-2 bg-amber-500 text-white text-[11px] font-bold px-1.5 py-0.5 rounded-md border-2 border-white shadow-sm z-10">
                          x{sellItem.quantity}
                        </div>
                      )}
                    </div>
                    
                    <div className="text-sm font-bold text-slate-700 text-center line-clamp-1 w-full" title={item.name}>
                      {item.name}
                    </div>

                    <div className="w-full flex gap-1.5 mt-auto relative z-10">
                      {isBuy ? (
                        <button 
                          disabled={isProcessing || !canAffordOne || txState.isOpen}
                          onClick={(e) => {
                            e.stopPropagation()
                            openTransaction('buy', buyItem)
                          }}
                          className={`group/btn flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 text-sm font-bold border transition-colors focus:outline-none disabled:cursor-not-allowed ${
                            canAffordOne 
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-500 hover:text-white hover:border-emerald-500' 
                              : 'bg-slate-100 border-slate-200 text-slate-400'
                          }`}
                        >
                          <CoinIcon type="silver" className={`w-4 h-4 ${canAffordOne ? 'group-hover/btn:scale-110 group-hover/btn:brightness-110' : 'opacity-50'}`} />
                          {buyItem.silver_price}
                        </button>
                      ) : (
                        <>
                          {sellItem.buyback_gold > 0 && (
                            <button 
                              disabled={isProcessing || txState.isOpen}
                              onClick={(e) => {
                                e.stopPropagation()
                                openTransaction('sell_gold', sellItem)
                              }}
                              className="group/btn flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 text-sm font-bold border bg-violet-50 border-violet-300 text-violet-800 hover:bg-violet-600 hover:text-white hover:border-violet-600 transition-colors focus:outline-none shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <CoinIcon type="gold" className="w-4 h-4 group-hover/btn:scale-110 group-hover/btn:brightness-110" />
                              {sellItem.buyback_gold}
                            </button>
                          )}

                          {(sellItem.buyback_silver > 0 || sellItem.buyback_gold === 0) && (
                            <button 
                              disabled={isProcessing || txState.isOpen}
                              onClick={(e) => {
                                e.stopPropagation()
                                openTransaction('sell_silver', sellItem)
                              }}
                              className="group/btn flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 text-sm font-bold border bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-400 hover:text-white hover:border-amber-400 transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
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