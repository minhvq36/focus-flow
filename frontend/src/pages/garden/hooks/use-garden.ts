import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { GardenListItem, GardenResponse, PlacementResponse } from '@/types/garden'

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

export function usePlaceItem(gardenId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { 
      inventory_id: string; grid_x: number; grid_y: number; rotation: number;
      // 3 trường này thêm vào chỉ để phục vụ Optimistic UI (Không gửi lên API)
      asset_key: string; item_width: number; item_height: number;
    }) => {
      // Bóc tách data, CHỈ GỬI đúng field mà backend cần
      const payload = {
        inventory_id: data.inventory_id,
        grid_x: data.grid_x,
        grid_y: data.grid_y,
        rotation: data.rotation
      }
      return api.post<PlacementResponse>(`/api/garden/${gardenId}/placements`, payload)
    },
    onMutate: async (variables) => {
      if (!gardenId) return
      await queryClient.cancelQueries({ queryKey: ['garden', gardenId] })
      const previousGarden = queryClient.getQueryData<GardenResponse>(['garden', gardenId])
      
      if (previousGarden) {
        const isRotated = variables.rotation === 90 || variables.rotation === 270
        
        const optimisticPlacement: PlacementResponse = {
          id: `temp_${Date.now()}`,
          inventory_id: variables.inventory_id,
          item_id: 'temp', 
          asset_key: variables.asset_key, // BÂY GIỜ ĐÃ CÓ ASSET KEY!
          grid_x: variables.grid_x,
          grid_y: variables.grid_y,
          item_width: variables.item_width, 
          item_height: variables.item_height,
          effective_width: isRotated ? variables.item_height : variables.item_width, 
          effective_height: isRotated ? variables.item_width : variables.item_height,
          rotation: variables.rotation,
          health_status: 'healthy',
          wilted_at: null,
          placed_at: new Date().toISOString(),
        }

        queryClient.setQueryData<GardenResponse>(['garden', gardenId], {
          ...previousGarden,
          placements: [...previousGarden.placements, optimisticPlacement],
        })
      }
      return { previousGarden }
    },
    onError: (err, _variables, context) => {
      if (context?.previousGarden && gardenId) {
        queryClient.setQueryData(['garden', gardenId], context.previousGarden)
      }
      console.error("Lỗi đặt đồ:", err)
    },
    onSettled: () => {
      if (gardenId) {
        queryClient.invalidateQueries({ queryKey: ['garden', gardenId] })
        queryClient.invalidateQueries({ queryKey: ['inventory'] })
      }
    },
  })
}