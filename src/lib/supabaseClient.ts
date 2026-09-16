import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  as string
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnon) {
  throw new Error(
    '[supabaseClient] VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY devem estar definidos no .env'
  )
}

// Sessões persistidas antes da migração para sessionStorage devem ser descartadas,
// senão o usuário continuaria logado indefinidamente a partir do localStorage antigo.
try {
  window.localStorage.removeItem('sb-bkowencwuzniyiecefam-auth-token')
} catch {
  // localStorage indisponível (modo privado, etc.) — segue sem interromper o app
}

export const supabase = createClient(supabaseUrl, supabaseAnon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.sessionStorage,
  },
})
