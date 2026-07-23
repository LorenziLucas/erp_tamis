import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'

// ── Tipos ──────────────────────────────────────────────────────────────────────

interface AuthContextValue {
  user:            User | null
  session:         Session | null
  isAuthenticated: boolean
  isAdmin:         boolean
  loading:         boolean
  login:           (email: string, password: string) => Promise<{ error: string | null }>
  logout:          () => Promise<void>
}

// ── Context ────────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null)

// ── Provider ───────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  // Sincroniza sessão (e o nível de acesso do analista vinculado) ao montar e a cada mudança de auth.
  // O loading só cai depois que a checagem de admin também terminar, para o menu não
  // "piscar" com a versão errada por um instante.
  useEffect(() => {
    async function syncSession(session: Session | null) {
      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user) {
        const { data } = await supabase
          .from('analistas')
          .select('tipo_acesso')
          .eq('auth_user_id', session.user.id)
          .maybeSingle()
        setIsAdmin(data?.tipo_acesso === 'admin')
      } else {
        setIsAdmin(false)
      }

      setLoading(false)
    }

    // Carrega sessão existente
    supabase.auth.getSession().then(({ data: { session } }) => {
      syncSession(session)
    })

    // Listener para login/logout/refresh
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      syncSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setLoading(false)
      return { error: error.message }
    }
    return { error: null }
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
    setIsAdmin(false)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isAuthenticated: !!user,
        isAdmin,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
  return ctx
}
