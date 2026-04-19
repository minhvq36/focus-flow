import { create } from 'zustand';

/**
 * Economy store - Zustand store for currency and economy
 */
export const useEconomyStore = create((set) => ({
  coins: 0,
  setCoins: (coins) => set({ coins }),
  addCoins: (amount) => set((state) => ({ coins: state.coins + amount })),
}));
