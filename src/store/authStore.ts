import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** Credenciais locais fixas — adicione pares aqui para novos usuários */
const USERS: Record<string, string> = {
  TAMIS: 'gestaodelotes',
}

interface AuthState {
  isAuthenticated: boolean
  username: string
  login: (username: string, password: string) => boolean
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      username: '',

      login: (username, password) => {
        const key = username.trim().toUpperCase()
        const ok = USERS[key] === password
        if (ok) set({ isAuthenticated: true, username: key })
        return ok
      },

      logout: () => set({ isAuthenticated: false, username: '' }),
    }),
    { name: 'gestao-lotes-auth' }
  )
)
