import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, LogIn } from 'lucide-react'
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
      setError('E-mail ou senha incorretos.')
      setShake(true)
      setTimeout(() => setShake(false), 600)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#F4F6F4] flex items-center justify-center px-4">
      {/* Background grid sutil */}
      <div
        className="fixed inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(#1B4D2E 1px, transparent 1px), linear-gradient(90deg, #1B4D2E 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div
        className={`
          relative w-full max-w-sm
          ${shake ? 'animate-[shake_0.5s_ease-in-out]' : ''}
        `}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <img
              src="/logo-tamis.svg"
              alt="ERP Tamis"
              className="h-16 w-auto"
              onError={(e) => {
                const target = e.currentTarget
                target.style.display = 'none'
                const fallback = target.nextElementSibling as HTMLElement | null
                if (fallback) fallback.style.display = 'flex'
              }}
            />
            <div
              style={{ display: 'none' }}
              className="flex-col items-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-[#1B4D2E] flex items-center justify-center text-sm font-black text-white">
                ERP
              </div>
              <div className="text-xl font-bold text-[#1B4D2E] mt-2">TAMIS</div>
            </div>
          </div>
          <p className="text-sm text-[#5A6A5E]">Sistema pericial · TRT</p>
        </div>

        {/* Card do formulário */}
        <div className="bg-white border border-[#D4DAD6] rounded-xl p-8 shadow-sm">
          <h2 className="text-base font-semibold text-[#1A1A1A] mb-6">Acesso ao sistema</h2>

          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            {/* E-mail */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#5A6A5E] uppercase tracking-wider">
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
                  w-full h-10 px-3 rounded-lg border text-sm text-[#1A1A1A] bg-[#F8FAF8]
                  placeholder-[#9AA4A0] outline-none transition-colors
                  border-[#D4DAD6] focus:border-[#1B4D2E] focus:ring-1 focus:ring-[#1B4D2E]/30
                "
              />
            </div>

            {/* Senha */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#5A6A5E] uppercase tracking-wider">
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
                    w-full h-10 px-3 pr-10 rounded-lg border text-sm text-[#1A1A1A] bg-[#F8FAF8]
                    placeholder-[#9AA4A0] outline-none transition-colors
                    border-[#D4DAD6] focus:border-[#1B4D2E] focus:ring-1 focus:ring-[#1B4D2E]/30
                  "
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9AA4A0] hover:text-[#5A6A5E] transition-colors"
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Erro */}
            {error && (
              <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
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
                bg-[#1B4D2E] hover:bg-[#2D7A47] text-white
                disabled:opacity-60 disabled:cursor-not-allowed
                transition-colors shadow-sm
              "
            >
              {loading
                ? <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><LogIn size={15} /> Entrar</>}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-[#9AA4A0] mt-6">
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
