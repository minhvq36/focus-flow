import { create } from 'zustand';

/**
 * User store - Zustand store for user state
 */
export const useUserStore = create((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  logout: () => set({ user: null }),
}));
