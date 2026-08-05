import { create } from 'zustand'
import type { InBagItem } from '@/types/inventory'

interface PlacementStore {
  activeItem: InBagItem | null
  rotation: number // 0, 90, 180, 270
  setActiveItem: (item: InBagItem | null) => void
  rotateItem: () => void
  clearPlacement: () => void
  consumeActiveItem: () => void 
  restoreActiveItem: (item: InBagItem | null) => void // ✅ Đã thêm khai báo hàm này
  activeTool: 'cursor' | 'shovel'                 // <-- THÊM DÒNG NÀY
  setTool: (tool: 'cursor' | 'shovel') => void    // <-- THÊM DÒNG NÀY
}

export const usePlacementStore = create<PlacementStore>((set) => ({
  activeTool: 'cursor',
  activeItem: null,
  rotation: 0,

  setTool: (tool) => set(() => {
    if (tool === 'shovel') {
      return { activeTool: tool, activeItem: null, rotation: 0 }
    }
    return { activeTool: tool }
  }),
  
  setActiveItem: (item) => set({ activeItem: item, rotation: 0, activeTool: 'cursor' }),
  
  rotateItem: () => set((state) => ({ 
    rotation: (state.rotation + 90) % 360 
  })),
  
  clearPlacement: () => set({ activeItem: null, rotation: 0, activeTool: 'cursor' }),

  // Hàm này sẽ được gọi ngay khi người dùng click chuột để đặt đồ
  consumeActiveItem: () => set((state) => {
    // Nếu không cầm đồ hoặc data lỗi thì bỏ qua
    if (!state.activeItem || !state.activeItem.instance_ids) return state

    // Cắt bỏ ID đầu tiên (vừa được gửi lên API)
    const remainingIds = state.activeItem.instance_ids.slice(1)
    const newQuantity = state.activeItem.quantity - 1

    // Nếu vừa đặt xuống là hết đồ luôn -> dọn dẹp sạch sẽ
    if (newQuantity <= 0 || remainingIds.length === 0) {
      return { activeItem: null, rotation: 0 }
    }

    // Nếu vẫn còn đồ -> cập nhật lại mảng ID và quantity cho lần click tiếp theo
    return {
      activeItem: {
        ...state.activeItem,
        quantity: newQuantity,
        instance_ids: remainingIds
      }
    }
  }),

  // ✅ HÀM MỚI: Dùng để trả lại đồ vào tay người dùng khi API từ chối (Rollback)
  restoreActiveItem: (item) => set({ activeItem: item })
}))