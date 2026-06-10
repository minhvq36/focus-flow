import { create } from 'zustand'
import type { InBagItem } from '@/types/inventory'

interface PlacementStore {
  activeItem: InBagItem | null
  rotation: number // 0, 90, 180, 270
  setActiveItem: (item: InBagItem | null) => void
  rotateItem: () => void
  clearPlacement: () => void
  updateActiveItemInstances: (newInstances: string[]) => void
}

export const usePlacementStore = create<PlacementStore>((set) => ({
  activeItem: null,
  rotation: 0,
  
  setActiveItem: (item) => set({ activeItem: item, rotation: 0 }),
  
  rotateItem: () => set((state) => ({ 
    rotation: (state.rotation + 90) % 360 
  })),
  
  clearPlacement: () => set({ activeItem: null, rotation: 0 }),

  // Dùng để trừ bớt instance_id khi người dùng giữ Shift đặt nhiều cái
  updateActiveItemInstances: (newInstances) => set((state) => ({
    activeItem: state.activeItem ? { ...state.activeItem, instance_ids: newInstances } : null
  }))
}))