import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { GardenListItem, GardenResponse, PlacementResponse } from '@/types/garden'
import type { InBagItem } from '@/types/inventory' // Đảm bảo import type này

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

export function usePlaceItem(gardenId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { 
      inventory_id: string; grid_x: number; grid_y: number; rotation: number;
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

      // 1. Dừng mọi refetch đang dở dang để tránh đè cache
      await queryClient.cancelQueries({ queryKey: ['garden', gardenId] })
      await queryClient.cancelQueries({ queryKey: ['inventory', 'bag'] }) // CHÚ Ý DÒNG NÀY

      // 2. Lưu lại State cũ của cả 2 nơi để dự phòng Rollback
      const previousGarden = queryClient.getQueryData<GardenResponse>(['garden', gardenId])
      const previousInventory = queryClient.getQueryData<InBagItem[]>(['inventory', 'bag'])

      // 3. OPTIMISTIC UPDATE CHO VƯỜN (Garden)
      if (previousGarden) {
        const isRotated = variables.rotation === 90 || variables.rotation === 270
        
        const optimisticPlacement: PlacementResponse = {
          id: `temp_${Date.now()}`,
          inventory_id: variables.inventory_id,
          item_id: 'temp', 
          asset_key: variables.asset_key,
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

      // 4. OPTIMISTIC UPDATE CHO TÚI ĐỒ (Inventory) - [GIẢI QUYẾT TẬN GỐC VẤN ĐỀ 1]
      if (previousInventory) {
        queryClient.setQueryData<InBagItem[]>(['inventory', 'bag'], (oldBag) => {
          if (!oldBag) return []
          
          return oldBag.map(item => {
            // So khớp đúng loại item vừa đặt xuống (dùng asset_key)
            if (item.asset_key === variables.asset_key) {
              
              // Giả định backend của bạn nhóm các inventory_id vào 1 mảng (VD: inventory_ids: string[])
              // Ta cần LỌC BỎ cái ID vừa dùng ra khỏi mảng để lượt click tiếp theo lấy ID mới.
              const newInventoryIds = item.instance_ids 
                ? item.instance_ids.filter(id => id !== variables.inventory_id) 
                : []

              return { 
                ...item, 
                quantity: item.quantity - 1,          // Trừ số lượng đi 1
                instance_ids: newInventoryIds        // Cập nhật lại mảng ID
              }
            }
            return item
          }).filter(item => item.quantity > 0) // NGUYÊN TẮC: Nếu số lượng = 0 thì xóa luôn khỏi túi
        })
      }

      // Trả về context để lỡ lỗi thì rollback
      return { previousGarden, previousInventory }
    },
    onError: (err, _variables, context) => {
      // NẾU BACKEND SẬP HOẶC BÁO LỖI: ROLLBACK LẠI NHƯ CŨ
      if (gardenId && context?.previousGarden) {
        queryClient.setQueryData(['garden', gardenId], context.previousGarden)
      }
      if (context?.previousInventory) {
        queryClient.setQueryData(['inventory', 'bag'], context.previousInventory)
      }
      console.error("Lỗi đặt đồ:", err)
    },
    onSettled: () => {
      // Dù thành công hay thất bại, cuối cùng cũng đồng bộ lại data chuẩn từ Server
      if (gardenId) {
        queryClient.invalidateQueries({ queryKey: ['garden', gardenId] })
        queryClient.invalidateQueries({ queryKey: ['inventory', 'bag'] }) // Đồng bộ tên key cho chuẩn
      }
    },
  })
}