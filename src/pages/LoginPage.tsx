import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, LogIn, ShieldCheck } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate  = useNavigate()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [shake,    setShake]    = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) {
      setError('Preencha e-mail e senha.')
      return
    }
    setLoading(true)
    setError('')

    const { error: authError } = await login(email.trim(), password)

    if (!authError) {
      navigate('/', { replace: true })
    } else {
      // Mensagem amigável — não expõe detalhes internos do Supabase
      setError('E-mail ou senha incorretos.')
      setShake(true)
      setTimeout(() => setShake(false), 600)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center px-4">
      {/* Background grid sutil */}
      <div
        className="fixed inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(#388bfd 1px, transparent 1px), linear-gradient(90deg, #388bfd 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div
        className={`
          relative w-full max-w-sm
          ${shake ? 'animate-[shake_0.5s_ease-in-out]' : ''}
        `}
      >
        {/* Logo / título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 mb-4 shadow-lg shadow-blue-500/20">
            <ShieldCheck size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-100">ERP Tamis</h1>
          <p className="text-sm text-gray-500 mt-1">Sistema pericial · TRT</p>
        </div>

        {/* Card do formulário */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-8 shadow-2xl">
          <h2 className="text-base font-semibold text-gray-200 mb-6">Acesso ao sistema</h2>

          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            {/* E-mail */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError('') }}
                placeholder="seu@email.com"
                autoFocus
                autoComplete="email"
                className="
                  w-full h-10 px-3 rounded-lg border text-sm text-gray-200 bg-[#0d1117]
                  placeholder-gray-600 outline-none transition-colors
                  border-[#30363d] focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40
                "
              />
            </div>

            {/* Senha */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError('') }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="
                    w-full h-10 px-3 pr-10 rounded-lg border text-sm text-gray-200 bg-[#0d1117]
                    placeholder-gray-600 outline-none transition-colors
                    border-[#30363d] focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40
                  "
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors"
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Erro */}
            {error && (
              <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                <span className="shrink-0">⚠</span>
                {error}
              </div>
            )}

            {/* Botão */}
            <button
              type="submit"
              disabled={loading}
              className="
                w-full h-10 mt-2 rounded-lg font-semibold text-sm
                flex items-center justify-center gap-2
                bg-blue-600 hover:bg-blue-500 text-white
                disabled:opacity-60 disabled:cursor-not-allowed
                transition-colors shadow-md shadow-blue-500/20
              "
            >
              {loading
                ? <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><LogIn size={15} /> Entrar</>}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-700 mt-6">
          Sistema de uso interno · Acesso restrito
        </p>
      </div>

      {/* CSS para shake animation */}
      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%      { transform: translateX(-8px); }
          40%      { transform: translateX(8px); }
          60%      { transform: translateX(-5px); }
          80%      { transform: translateX(5px); }
        }
      `}</style>
    </div>
  )
}
