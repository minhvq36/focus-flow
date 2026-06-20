import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { WalletResponse, ShopItemResponse, SellableItemResponse } from '@/types/economy'

export function useWallet() {
  return useQuery({
    queryKey: ['economy', 'wallet'],
    queryFn: () => api.get<WalletResponse>('/api/economy/wallet'),
  })
}

export function useShopItems() {
  return useQuery({
    queryKey: ['economy', 'shop-buy'],
    queryFn: () => api.get<ShopItemResponse[]>('/api/economy/shop/buy'),
  })
}

export function useSellableItems() {
  return useQuery({
    queryKey: ['economy', 'shop-sell'],
    queryFn: () => api.get<SellableItemResponse[]>('/api/economy/shop/sell'),
  })
}