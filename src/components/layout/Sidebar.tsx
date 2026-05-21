import { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Table2, PlusCircle, Upload,
  Settings, ChevronLeft, ChevronRight, LogOut, User,
  ChevronDown, Layers, Wallet, Trash2, AlertTriangle,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { useLotesStore } from '../../store/lotesStore'
import { useAuthStore } from '../../store/authStore'

// ── Itens de cada grupo ───────────────────────────────────────────────────────
const LOTES_ITEMS = [
  { to: '/',               icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/lotes',          icon: Table2,          label: 'Lotes' },
  { to: '/lotes/novo',     icon: PlusCircle,      label: 'Novo Lote' },
  { to: '/lotes/importar', icon: Upload,          label: 'Importar XLS' },
]

interface Props {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: Props) {
  const count    = useLotesStore((s) => s.lotes.length)
  const username = useAuthStore((s) => s.username)
  const logout   = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  const clearAll = useLotesStore((s) => s.clearAll)

  // Gestão de Lotes começa aberta por padrão
  const [loteOpen,    setLoteOpen]    = useState(true)
  const [confirmClear, setConfirmClear] = useState(false)
  const location = useLocation()
  const isLoteActive = location.pathname === '/' || location.pathname.startsWith('/lotes')

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <aside
      className="fixed left-0 top-0 h-full bg-[#161b22] border-r border-[#30363d] flex flex-col z-40 transition-all duration-200"
      style={{ width: collapsed ? 56 : 224 }}
    >
      {/* ── Logo / toggle ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 h-14 border-b border-[#30363d] shrink-0">
        <div className="w-7 h-7 shrink-0 rounded-md bg-gradient-to-br from-emerald-500 to-white flex items-center justify-center text-[10px] font-black text-emerald-900">
          ERP
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-gray-100 leading-tight truncate">TAMIS</div>
            <div className="text-[10px] text-gray-600">Gestão de processos</div>
          </div>
        )}
        <button
          onClick={onToggle}
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          className={cn(
            'shrink-0 w-6 h-6 flex items-center justify-center rounded text-gray-600',
            'hover:text-gray-300 hover:bg-[#1c2333] transition-colors',
          )}
        >
          {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>
      </div>

      {/* ── Nav ────────────────────────────────────────────────────────────── */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        {collapsed ? (
          /* Sidebar recolhida: apenas os ícones de 1º nível (um por grupo) */
          <div className="flex flex-col items-center gap-1">
            {/* Grupo 1 — Gestão de Lotes: clica expande o sidebar */}
            <button
              onClick={onToggle}
              title="Gestão de Lotes"
              className={cn(
                'w-9 h-9 flex items-center justify-center rounded-md transition-colors',
                isLoteActive
                  ? 'bg-blue-600/20 text-blue-400'
                  : 'text-gray-500 hover:text-gray-200 hover:bg-[#1c2333]',
              )}
            >
              <Layers size={15} />
            </button>

            {/* Separador */}
            <div className="w-6 h-px bg-[#30363d] my-1" />

            {/* Grupo 2 — Gestão Financeira (em breve) */}
            <div
              title="Gestão Financeira (em breve)"
              className="w-9 h-9 flex items-center justify-center rounded-md cursor-not-allowed"
            >
              <Wallet size={15} className="text-gray-700" />
            </div>
          </div>
        ) : (
          /* Sidebar expandida: grupos com 2 níveis */
          <div className="space-y-1">

            {/* ── Grupo 1: Gestão de Lotes ─────────────────────────────────── */}
            <div>
              <button
                onClick={() => setLoteOpen((o) => !o)}
                className={cn(
                  'w-full flex items-center gap-2 px-2.5 py-2 rounded-md transition-colors',
                  'text-xs font-semibold uppercase tracking-wider',
                  'text-gray-400 hover:text-gray-200 hover:bg-[#1c2333]',
                )}
              >
                <Layers size={13} className="shrink-0 text-blue-400" />
                <span className="flex-1 text-left">Gestão de Lotes</span>
                <ChevronDown
                  size={12}
                  className={cn(
                    'text-gray-600 transition-transform duration-200',
                    loteOpen && 'rotate-180',
                  )}
                />
              </button>

              {/* Sub-itens */}
              {loteOpen && (
                <div className="mt-0.5 ml-4 pl-2.5 border-l border-[#30363d] space-y-0.5">
                  {LOTES_ITEMS.map(({ to, icon: Icon, label }) => (
                    <NavLink
                      key={to}
                      to={to}
                      end
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-blue-600/20 text-blue-400'
                            : 'text-gray-500 hover:text-gray-200 hover:bg-[#1c2333]',
                        )
                      }
                    >
                      <Icon size={14} className="shrink-0" />
                      {label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>

            {/* ── Grupo 2: Gestão Financeira (em breve) ─────────────────────── */}
            <div>
              <div
                className={cn(
                  'flex items-center gap-2 px-2.5 py-2 rounded-md',
                  'text-xs font-semibold uppercase tracking-wider',
                  'text-gray-700 cursor-not-allowed select-none',
                )}
                title="Em desenvolvimento"
              >
                <Wallet size={13} className="shrink-0" />
                <span className="flex-1 text-left">Gestão Financeira</span>
                <span className="text-[9px] font-medium bg-[#21262d] text-gray-600 rounded px-1.5 py-0.5 tracking-wide normal-case">
                  Em breve
                </span>
              </div>
            </div>

          </div>
        )}
      </nav>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div className={cn('border-t border-[#30363d] shrink-0', collapsed ? 'py-3 flex flex-col items-center gap-2' : 'px-4 py-3')}>
        {collapsed ? (
          <>
            <div className="w-7 h-7 rounded-full bg-blue-600/20 flex items-center justify-center" title={username}>
              <User size={13} className="text-blue-400" />
            </div>
            <button
              onClick={handleLogout}
              title="Sair"
              className="w-7 h-7 rounded-md flex items-center justify-center text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut size={13} />
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-blue-600/20 flex items-center justify-center shrink-0">
                <User size={11} className="text-blue-400" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-gray-400 truncate">{username}</div>
                <div className="text-[10px] text-gray-600">{count} lote{count !== 1 ? 's' : ''} cadastrado{count !== 1 ? 's' : ''}</div>
              </div>
            </div>

            <div className="flex items-center justify-between mb-2">
              <NavLink
                to="/configuracoes"
                className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-400 transition-colors"
              >
                <Settings size={11} /> Configurações
              </NavLink>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 text-xs text-gray-600 hover:text-red-400 transition-colors"
                title="Sair do sistema"
              >
                <LogOut size={11} /> Sair
              </button>
            </div>

            {/* Limpar base de dados */}
            {!confirmClear ? (
              <button
                onClick={() => setConfirmClear(true)}
                className="w-full flex items-center justify-center gap-1.5 text-xs text-gray-700 hover:text-red-400 hover:bg-red-500/8 border border-transparent hover:border-red-500/20 rounded-md py-1 transition-colors"
              >
                <Trash2 size={10} /> Limpar base de dados
              </button>
            ) : (
              <div className="bg-red-500/10 border border-red-500/30 rounded-md p-2 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[11px] text-red-400 font-medium">
                  <AlertTriangle size={11} /> Apagar todos os lotes?
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => { clearAll(); setConfirmClear(false) }}
                    className="flex-1 text-[11px] font-semibold bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded py-0.5 transition-colors"
                  >
                    Confirmar
                  </button>
                  <button
                    onClick={() => setConfirmClear(false)}
                    className="flex-1 text-[11px] text-gray-500 hover:text-gray-300 bg-[#21262d] rounded py-0.5 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  )
}
