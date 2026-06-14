import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
    staleTime: 1000 * 60 * 5,
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
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: PlaceItemReq[]) => {
      // Gửi mảng Items lên server
      return api.post<MultiPlaceResponse>(`/api/garden/${gardenId}/placements/batch`, {
        items: payload
      })
    },
    onSuccess: (data) => {
      // Xử lý Partial Success (Thành công 1 phần do bị vướng đồ)
      const failedItems = data.results.filter(r => !r.success)
      if (failedItems.length > 0) {
        toast.error(`Có ${failedItems.length} vật phẩm không thể đặt được.`)
      }
    },
    // Chú ý: Việc Rollback khi onError sẽ được thực hiện ở index.tsx (nơi giữ Snapshot)
    onSettled: () => {
      // ĐŨA PHÉP THUẬT: Dù thành công, lỗi 1 phần hay sập mạng. Cuối cùng vẫn force fetch lại data chuẩn từ DB.
      if (gardenId) {
        queryClient.invalidateQueries({ queryKey: ['garden', gardenId] })
        queryClient.invalidateQueries({ queryKey: ['inventory', 'bag'] })
      }
    },
  })
}