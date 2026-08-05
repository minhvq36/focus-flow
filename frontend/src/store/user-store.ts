import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'
import { supabase, clearRecoveryPending } from '@/lib/supabase'

interface UserStore {
  user: User | null
  loading: boolean
  setUser: (user: User | null) => void
  restoreSession: () => Promise<void>
  logout: () => Promise<void>
}

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  loading: true,

  setUser: (user) => set({ user }),

  restoreSession: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    set({ user: session?.user ?? null, loading: false })

    supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null
      // Hết phiên -> cờ recovery (nếu còn) không thuộc về người đăng nhập sau.
      if (!nextUser) clearRecoveryPending()
      set({ user: nextUser })
    })
  },

  logout: async () => {
    await supabase.auth.signOut()
    clearRecoveryPending()
    set({ user: null })
  },
}))