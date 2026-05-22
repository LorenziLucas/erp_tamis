/**
 * authStore — compatibilidade de interface mantida para não quebrar o App.tsx.
 * A autenticação real agora é feita via AuthContext + Supabase Auth.
 * Este store é um espelho reativo da sessão do Supabase.
 */
import { create } from 'zustand'
import { supabase } from '../lib/supabaseClient'

interface AuthState {
  isAuthenticated: boolean
  username: string
  loading: boolean
  /** @deprecated Use AuthContext.login() — mantido para compatibilidade */
  login: (email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => {
  // Sincroniza com o listener do Supabase Auth
  supabase.auth.onAuthStateChange((_event, session) => {
    set({
      isAuthenticated: !!session,
      username: session?.user?.email ?? '',
      loading: false,
    })
  })

  // Carrega sessão existente na inicialização
  supabase.auth.getSession().then(({ data: { session } }) => {
    set({
      isAuthenticated: !!session,
      username: session?.user?.email ?? '',
      loading: false,
    })
  })

  return {
    isAuthenticated: false,
    username: '',
    loading: true,

    login: async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return false
      return true
    },

    logout: async () => {
      await supabase.auth.signOut()
      set({ isAuthenticated: false, username: '' })
    },
  }
})
