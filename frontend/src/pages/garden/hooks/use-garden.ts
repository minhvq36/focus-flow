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
    mutationFn: async (data: { inventory_id: string; grid_x: number; grid_y: number; rotation: number }) => {
      // Gọi API thực tế của backend bạn
      return api.post<PlacementResponse>(`/api/garden/${gardenId}/placements`, data)
    },
    // KHI BẮT ĐẦU GỌI API -> CẬP NHẬT UI NGAY LẬP TỨC
    onMutate: async (variables) => {
      if (!gardenId) return
      
      // Hủy các request get garden đang dở dang
      await queryClient.cancelQueries({ queryKey: ['garden', gardenId] })
      
      // Lưu lại state cũ để lỡ lỗi thì Rollback
      const previousGarden = queryClient.getQueryData<GardenResponse>(['garden', gardenId])
      
      // Bơm data ảo (Optimistic) vào cache
      if (previousGarden) {
        // Giả lập tính toán effective width/height tạm thời
        // LƯU Ý: Frontend cần biết width/height gốc, ở đây mình tạm fake 1x1, 
        // Lát nữa API trả về thật nó sẽ đè lên data đúng.
        const isRotated = variables.rotation === 90 || variables.rotation === 270
        
        const optimisticPlacement: PlacementResponse = {
          id: `temp_${Date.now()}`,
          inventory_id: variables.inventory_id,
          item_id: 'temp', // Lẽ ra truyền từ UI vào, nhưng temp cũng ko sao
          asset_key: '',   // Tạm thời bỏ qua hoặc truyền từ component vào
          grid_x: variables.grid_x,
          grid_y: variables.grid_y,
          item_width: 1, 
          item_height: 1,
          effective_width: isRotated ? 1 : 1, 
          effective_height: isRotated ? 1 : 1,
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
    // NẾU API LỖI -> TRẢ LẠI TRẠNG THÁI CŨ
    onError: (err, _variables, context) => {
      if (context?.previousGarden && gardenId) {
        queryClient.setQueryData(['garden', gardenId], context.previousGarden)
      }
      console.error("Lỗi đặt đồ:", err)
    },
    // DÙ THÀNH CÔNG HAY THẤT BẠI -> REFETCH BACKGROUND ĐỂ ĐỒNG BỘ DATA THẬT
    onSettled: () => {
      if (gardenId) {
        queryClient.invalidateQueries({ queryKey: ['garden', gardenId] })
        queryClient.invalidateQueries({ queryKey: ['inventory'] }) // Refresh lại túi đồ
      }
    },
  })
}