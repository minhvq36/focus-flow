import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { GardenListItem, GardenResponse, PlaceItemReq, MultiPlaceResponse } from '@/types/garden'
import { toast } from 'sonner'

// ============================================================
// GET /api/garden — list all gardens (meta only, no placements)
// ============================================================
export function useGardenList() {
  return useQuery({
    queryKey: ['garden'],
    queryFn: () => api.get<GardenListItem[]>('/api/garden'),
  })
}

// ============================================================
// GET /api/garden/:id — single garden + full placements
// ============================================================
export function useGarden(id: string | null) {
  return useQuery({
    queryKey: ['garden', id],
    queryFn: () => api.get<GardenResponse>(`/api/garden/${id}`),
    enabled: !!id,
    staleTime: 1000 * 60 * 3,
  })
}

// ============================================================
// localStorage: remember last visited garden
// ============================================================
const LAST_GARDEN_KEY = 'last_garden_id'

export function getLastGardenId(): string | null {
  return localStorage.getItem(LAST_GARDEN_KEY)
}

export function setLastGardenId(id: string): void {
  localStorage.setItem(LAST_GARDEN_KEY, id)
}

// ============================================================
// POST /api/garden/:id/placements/batch — Batch Place Items
// ============================================================
export function useBatchPlaceItems(gardenId: string | null) {
  return useMutation({
    mutationFn: async (payload: PlaceItemReq[]) => {
      return api.post<MultiPlaceResponse>(`/api/garden/${gardenId}/placements/batch`, {
        items: payload
      })
    },
    onSuccess: (data) => {
      // Chỉ lo toast thông báo kết quả
      // Rollback, refetch, restoreActiveItem đều do index.tsx xử lý
      const failedItems = data.results.filter(r => !r.success)
      const successItems = data.results.filter(r => r.success)
      if (failedItems.length > 0 && successItems.length === 0) {
        toast.error(`Unable to place ${failedItems.length} items.`)
      } else if (failedItems.length > 0) {
        toast.warning(`${successItems.length} items placed, unable to place ${failedItems.length} items (overlap).`)
      }
    },
    // onSettled đã chuyển sang index.tsx để tránh duplicate và đảm bảo đúng thứ tự
  })
}