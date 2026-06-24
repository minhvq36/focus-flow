import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { WalletResponse, ShopItemResponse, SellableItemResponse, BuyRequest, SellBatchRequest } from '@/types/economy'

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

export function useBuyItem() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: BuyRequest) => api.post('/api/economy/shop/buy', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['economy', 'wallet'] })
      queryClient.invalidateQueries({ queryKey: ['economy', 'shop-sell'] })
    },
  })
}

export function useSellItem() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: SellBatchRequest) => api.post('/api/economy/shop/sell', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['economy', 'wallet'] })
      queryClient.invalidateQueries({ queryKey: ['economy', 'shop-sell'] })
    },
  })
}