import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { InBagItem } from '@/types/inventory'

export function useInventoryBag() {
  return useQuery({
    queryKey: ['inventory', 'bag'],
    queryFn: () => api.get<InBagItem[]>('/api/inventory/bag'),
    staleTime: 1000 * 60 * 5,
  })
}