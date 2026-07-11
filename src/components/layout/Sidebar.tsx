import { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Table2,
  Settings, ChevronLeft, ChevronRight, LogOut, User,
  ChevronDown, Layers, Wallet, Trash2, AlertTriangle, ReceiptText, BookUser, FolderOpen, MapPin,
  KanbanSquare, UserCog,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { useLotesStore } from '../../store/lotesStore'
import { useAuth } from '../../contexts/AuthContext'

const LOTES_ITEMS = [
  { to: '/',      icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/lotes', icon: Table2,          label: 'Lotes' },
]

interface Props {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: Props) {
  const count    = useLotesStore((s) => s.lotes.length)
  const { user, logout } = useAuth()
  const username = user?.email ?? ''
  const navigate = useNavigate()

  const clearAll = useLotesStore((s) => s.clearAll)

  const location = useLocation()
  const isLoteActive       = location.pathname === '/' || location.pathname.startsWith('/lotes')
  const isFinanceiroActive = location.pathname.startsWith('/financeiro')
  const isCadastrosActive  = location.pathname.startsWith('/cadastros')
  const isBoardActive      = location.pathname.startsWith('/board')

  // Visibilidade temporária durante a construção do módulo — remover quando liberado para todos.
  const isBoardVisible = user?.id === 'f220fe11-3324-4b2d-8687-18a1261daa50'

  const [loteOpen,       setLoteOpen]       = useState(true)
  const [financeiroOpen, setFinanceiroOpen] = useState(() => location.pathname.startsWith('/financeiro'))
  const [cadastrosOpen,  setCadastrosOpen]  = useState(() => location.pathname.startsWith('/cadastros'))
  const [confirmClear,   setConfirmClear]   = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <aside
      className="fixed left-0 top-0 h-full bg-[#1B4D2E] border-r border-black/20 flex flex-col z-40 transition-all duration-200"
      style={{ width: collapsed ? 56 : 224 }}
    >
      {/* ── Logo / toggle ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 h-14 border-b border-white/10 shrink-0">
        <div className="w-7 h-7 shrink-0 rounded-md bg-white/15 flex items-center justify-center text-[10px] font-black text-white">
          ERP
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-white leading-tight truncate">TAMIS</div>
            <div className="text-[10px] text-white/40">Gestão de processos</div>
          </div>
        )}
        <button
          onClick={onToggle}
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          className={cn(
            'shrink-0 w-6 h-6 flex items-center justify-center rounded text-white/40',
            'hover:text-white hover:bg-white/10 transition-colors',
          )}
        >
          {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>
      </div>

      {/* ── Nav ────────────────────────────────────────────────────────────── */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        {collapsed ? (
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={onToggle}
              title="Gestão de Lotes"
              className={cn(
                'w-9 h-9 flex items-center justify-center rounded-md transition-colors',
                isLoteActive
                  ? 'bg-white/20 text-[#F5C518]'
                  : 'text-white/50 hover:text-white hover:bg-white/10',
              )}
            >
              <Layers size={15} />
            </button>

            <div className="w-6 h-px bg-white/10 my-1" />

            <button
              onClick={onToggle}
              title="Gestão Financeira"
              className={cn(
                'w-9 h-9 flex items-center justify-center rounded-md transition-colors',
                isFinanceiroActive
                  ? 'bg-white/20 text-[#F5C518]'
                  : 'text-white/50 hover:text-white hover:bg-white/10',
              )}
            >
              <Wallet size={15} />
            </button>

            <div className="w-6 h-px bg-white/10 my-1" />

            <button
              onClick={onToggle}
              title="Cadastros"
              className={cn(
                'w-9 h-9 flex items-center justify-center rounded-md transition-colors',
                isCadastrosActive
                  ? 'bg-white/20 text-[#F5C518]'
                  : 'text-white/50 hover:text-white hover:bg-white/10',
              )}
            >
              <FolderOpen size={15} />
            </button>

            {isBoardVisible && (
              <>
                <div className="w-6 h-px bg-white/10 my-1" />
                <button
                  onClick={onToggle}
                  title="Gestão de Peritos"
                  className={cn(
                    'w-9 h-9 flex items-center justify-center rounded-md transition-colors',
                    isBoardActive
                      ? 'bg-white/20 text-[#F5C518]'
                      : 'text-white/50 hover:text-white hover:bg-white/10',
                  )}
                >
                  <KanbanSquare size={15} />
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-1">

            {/* ── Grupo 1: Gestão de Lotes ─────────────────────────────────── */}
            <div>
              <button
                onClick={() => setLoteOpen((o) => !o)}
                className={cn(
                  'w-full flex items-center gap-2 px-2.5 py-2 rounded-md transition-colors',
                  'text-xs font-semibold uppercase tracking-wider',
                  'text-white/50 hover:text-white hover:bg-white/10',
                )}
              >
                <Layers size={13} className="shrink-0 text-[#F5C518]" />
                <span className="flex-1 text-left">Gestão de Lotes</span>
                <ChevronDown
                  size={12}
                  className={cn(
                    'text-white/30 transition-transform duration-200',
                    loteOpen && 'rotate-180',
                  )}
                />
              </button>

              {loteOpen && (
                <div className="mt-0.5 ml-4 pl-2.5 border-l border-white/10 space-y-0.5">
                  {LOTES_ITEMS.map(({ to, icon: Icon, label }) => (
                    <NavLink
                      key={to}
                      to={to}
                      end
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-[#2D7A47] text-white'
                            : 'text-white/60 hover:text-white hover:bg-white/10',
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

            {/* ── Grupo 2: Gestão Financeira ────────────────────────────────── */}
            <div>
              <button
                onClick={() => setFinanceiroOpen((o) => !o)}
                className={cn(
                  'w-full flex items-center gap-2 px-2.5 py-2 rounded-md transition-colors',
                  'text-xs font-semibold uppercase tracking-wider',
                  isFinanceiroActive
                    ? 'text-[#F5C518] bg-white/10'
                    : 'text-white/50 hover:text-white hover:bg-white/10',
                )}
              >
                <Wallet size={13} className={cn('shrink-0', isFinanceiroActive ? 'text-[#F5C518]' : 'text-[#F5C518]/60')} />
                <span className="flex-1 text-left">Gestão Financeira</span>
                <ChevronDown
                  size={12}
                  className={cn(
                    'text-white/30 transition-transform duration-200',
                    financeiroOpen && 'rotate-180',
                  )}
                />
              </button>

              {financeiroOpen && (
                <div className="mt-0.5 ml-4 pl-2.5 border-l border-white/10 space-y-0.5">
                  <NavLink
                    to="/financeiro/cobrancas"
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-[#2D7A47] text-white'
                          : 'text-white/60 hover:text-white hover:bg-white/10',
                      )
                    }
                  >
                    <ReceiptText size={14} className="shrink-0" />
                    Cobranças
                  </NavLink>
                </div>
              )}
            </div>

            {/* ── Grupo 3: Cadastros ────────────────────────────────────────── */}
            <div>
              <button
                onClick={() => setCadastrosOpen((o) => !o)}
                className={cn(
                  'w-full flex items-center gap-2 px-2.5 py-2 rounded-md transition-colors',
                  'text-xs font-semibold uppercase tracking-wider',
                  isCadastrosActive
                    ? 'text-[#F5C518] bg-white/10'
                    : 'text-white/50 hover:text-white hover:bg-white/10',
                )}
              >
                <FolderOpen size={13} className={cn('shrink-0', isCadastrosActive ? 'text-[#F5C518]' : 'text-[#F5C518]/60')} />
                <span className="flex-1 text-left">Cadastros</span>
                <ChevronDown
                  size={12}
                  className={cn('text-white/30 transition-transform duration-200', cadastrosOpen && 'rotate-180')}
                />
              </button>

              {cadastrosOpen && (
                <div className="mt-0.5 ml-4 pl-2.5 border-l border-white/10 space-y-0.5">
                  <NavLink
                    to="/cadastros/peritos"
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-[#2D7A47] text-white'
                          : 'text-white/60 hover:text-white hover:bg-white/10',
                      )
                    }
                  >
                    <BookUser size={14} className="shrink-0" />
                    Peritos
                  </NavLink>
                  <NavLink
                    to="/cadastros/trts"
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-[#2D7A47] text-white'
                          : 'text-white/60 hover:text-white hover:bg-white/10',
                      )
                    }
                  >
                    <MapPin size={14} className="shrink-0" />
                    TRTs
                  </NavLink>
                  <NavLink
                    to="/cadastros/analistas"
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-[#2D7A47] text-white'
                          : 'text-white/60 hover:text-white hover:bg-white/10',
                      )
                    }
                  >
                    <UserCog size={14} className="shrink-0" />
                    Analistas
                  </NavLink>
                </div>
              )}
            </div>

            {/* ── Grupo 4: Gestão de Peritos (visível apenas durante a construção) ── */}
            {isBoardVisible && (
              <div>
                <NavLink
                  to="/board/peritos"
                  className={({ isActive }) =>
                    cn(
                      'w-full flex items-center gap-2 px-2.5 py-2 rounded-md transition-colors',
                      'text-xs font-semibold uppercase tracking-wider',
                      isActive
                        ? 'text-[#F5C518] bg-white/10'
                        : 'text-white/50 hover:text-white hover:bg-white/10',
                    )
                  }
                >
                  <KanbanSquare size={13} className={cn('shrink-0', isBoardActive ? 'text-[#F5C518]' : 'text-[#F5C518]/60')} />
                  <span className="flex-1 text-left">Gestão de Peritos</span>
                </NavLink>
              </div>
            )}

          </div>
        )}
      </nav>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div className={cn('border-t border-white/10 shrink-0', collapsed ? 'py-3 flex flex-col items-center gap-2' : 'px-4 py-3')}>
        {collapsed ? (
          <>
            <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center" title={username}>
              <User size={13} className="text-white/60" />
            </div>
            <button
              onClick={handleLogout}
              title="Sair"
              className="w-7 h-7 rounded-md flex items-center justify-center text-white/40 hover:text-red-300 hover:bg-red-500/15 transition-colors"
            >
              <LogOut size={13} />
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <User size={11} className="text-white/60" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-white/60 truncate">{username}</div>
                <div className="text-[10px] text-white/30">{count} lote{count !== 1 ? 's' : ''} cadastrado{count !== 1 ? 's' : ''}</div>
              </div>
            </div>

            <div className="flex items-center justify-between mb-2">
              <NavLink
                to="/configuracoes"
                className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
              >
                <Settings size={11} /> Configurações
              </NavLink>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 text-xs text-white/40 hover:text-red-300 transition-colors"
                title="Sair do sistema"
              >
                <LogOut size={11} /> Sair
              </button>
            </div>

            {!confirmClear ? (
              <button
                onClick={() => setConfirmClear(true)}
                className="w-full flex items-center justify-center gap-1.5 text-xs text-white/25 hover:text-red-300 hover:bg-red-500/15 border border-transparent hover:border-red-400/20 rounded-md py-1 transition-colors"
              >
                <Trash2 size={10} /> Limpar base de dados
              </button>
            ) : (
              <div className="bg-red-500/15 border border-red-400/30 rounded-md p-2 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[11px] text-red-300 font-medium">
                  <AlertTriangle size={11} /> Apagar todos os lotes?
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => { clearAll(); setConfirmClear(false) }}
                    className="flex-1 text-[11px] font-semibold bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded py-0.5 transition-colors"
                  >
                    Confirmar
                  </button>
                  <button
                    onClick={() => setConfirmClear(false)}
                    className="flex-1 text-[11px] text-white/50 hover:text-white/70 bg-white/10 rounded py-0.5 transition-colors"
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
