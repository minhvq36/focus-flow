import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

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
      set({ user: session?.user ?? null })
    })
  },

  logout: async () => {
    await supabase.auth.signOut()
    set({ user: null })
  },
}))