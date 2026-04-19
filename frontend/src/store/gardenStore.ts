import { create } from 'zustand';

/**
 * Garden store - Zustand store for garden state
 */
export const useGardenStore = create((set) => ({
  items: [],
  setItems: (items) => set({ items }),
}));
