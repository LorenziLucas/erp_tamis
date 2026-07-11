import { useEffect, useMemo, useState } from 'react'
import { Search, ChevronDown, ChevronRight as ArrowRight, X, ArrowRightCircle } from 'lucide-react'
import { useBoardPeritosStore } from '../../store/boardPeritosStore'
import { useToast } from '../../components/ui/Toast'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input, Select, FormField } from '../../components/ui/Input'
import { BOARD_STATUS } from '../../types/board'
import type { BoardPerito, BoardStatus } from '../../types/board'
import { cn } from '../../lib/utils'

const STATUS_COLORS: Record<BoardStatus, string> = {
  nao_ativo:    '#9AA4A0',
  ativo:        '#1B4D2E',
  analise_1:    '#534AB7',
  analise_2:    '#D85A30',
  padronizacao: '#185FA5',
  entrega:      '#1D9E75',
}

function regionBadgeClasses(regiao: string): string {
  const token = regiao.trim().split(/\s+/)[0] ?? regiao
  if (token === 'TRT4') return 'bg-[#EAF3ED] text-[#1B4D2E]'
  if (token === 'TRT6') return 'bg-amber-50 text-amber-700'
  if (token === 'TRT1') return 'bg-violet-50 text-violet-700'
  return 'bg-[#F4F6F4] text-[#5A6A5E]'
}

function initials(nome: string): string {
  const parts = nome.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// ── KPI ────────────────────────────────────────────────────────────────────────

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-right">
      <div className="text-lg font-bold text-[#1A1A1A] leading-tight">{value}</div>
      <div className="text-[10px] text-[#5A6A5E] uppercase tracking-wide">{label}</div>
    </div>
  )
}

// ── Barra de progresso ───────────────────────────────────────────────────────────

function ProgressBar({ entregue, provisionado }: { entregue: number; provisionado: number }) {
  const pct = provisionado > 0 ? Math.min(100, (entregue / provisionado) * 100) : 0
  return (
    <div className="w-24 h-1.5 bg-[#EEF1EE] rounded-full overflow-hidden shrink-0">
      <div className="h-full bg-[#1B4D2E] rounded-full transition-all" style={{ width: `${pct}%` }} />
    </div>
  )
}

// ── Linha de perito ──────────────────────────────────────────────────────────────

function PeritoRow({ perito, onOpen }: { perito: BoardPerito; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#F4F6F4] transition-colors text-left border-t border-[#EEF1EE] first:border-t-0"
    >
      <div className="w-7 h-7 rounded-full bg-[#1B4D2E]/10 text-[#1B4D2E] text-[11px] font-semibold flex items-center justify-center shrink-0">
        {initials(perito.nome)}
      </div>
      <div className="min-w-0 w-48 shrink-0">
        <div className="text-sm font-medium text-[#1A1A1A] truncate">{perito.nome}</div>
      </div>
      <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0', regionBadgeClasses(perito.regiao))}>
        {perito.regiao}
      </span>
      <span className="text-xs text-[#5A6A5E] w-32 shrink-0 truncate">{perito.analista ?? '—'}</span>
      <div className="flex-1 flex items-center justify-end gap-2 min-w-0">
        <ProgressBar entregue={perito.entregue} provisionado={perito.provisionado} />
        <span className="text-xs text-[#5A6A5E] w-14 text-right shrink-0">
          {perito.entregue}/{perito.provisionado}
        </span>
        <ArrowRightCircle size={15} className="text-[#9AA4A0] shrink-0" />
      </div>
    </button>
  )
}

// ── Seção de status ───────────────────────────────────────────────────────────────

function StatusSection({
  status,
  label,
  items,
  collapsed,
  onToggle,
  onOpenPerito,
}: {
  status: BoardStatus
  label: string
  items: BoardPerito[]
  collapsed: boolean
  onToggle: () => void
  onOpenPerito: (id: string) => void
}) {
  return (
    <div className="bg-white border border-[#D4DAD6] rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2.5 px-4 py-3 hover:bg-[#F4F6F4] transition-colors"
      >
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLORS[status] }} />
        <span className="text-sm font-semibold text-[#1A1A1A]">{label}</span>
        <span className="text-xs text-[#5A6A5E]">({items.length})</span>
        <span className="flex-1" />
        {collapsed ? <ArrowRight size={14} className="text-[#9AA4A0]" /> : <ChevronDown size={14} className="text-[#9AA4A0]" />}
      </button>

      {!collapsed && items.length > 0 && (
        <div>
          {items.map((p) => (
            <PeritoRow key={p.id} perito={p} onOpen={() => onOpenPerito(p.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Painel de detalhe ──────────────────────────────────────────────────────────────

function DetailModal({
  perito,
  onClose,
}: {
  perito: BoardPerito
  onClose: () => void
}) {
  const { updateItem } = useBoardPeritosStore()
  const { success, error: toastError } = useToast()

  const [provisionadoStr, setProvisionadoStr] = useState(String(perito.provisionado))
  const [entregueStr, setEntregueStr] = useState(String(perito.entregue))
  const [analista, setAnalista] = useState(perito.analista ?? '')
  const [regiao, setRegiao] = useState(perito.regiao)
  const [statusChanging, setStatusChanging] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setProvisionadoStr(String(perito.provisionado))
    setEntregueStr(String(perito.entregue))
    setAnalista(perito.analista ?? '')
    setRegiao(perito.regiao)
  }, [perito.id, perito.provisionado, perito.entregue, perito.analista, perito.regiao])

  async function handleStatusChange(newStatus: BoardStatus) {
    if (newStatus === perito.status) return
    setStatusChanging(true)
    try {
      await updateItem(perito.id, { status: newStatus })
      success('Status atualizado')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao atualizar status')
    } finally {
      setStatusChanging(false)
    }
  }

  async function handleSave() {
    const provisionado = Number(provisionadoStr)
    const entregue = Number(entregueStr)

    if (!Number.isFinite(provisionado) || provisionado < 0 || !Number.isInteger(provisionado)) {
      toastError('Provisionado deve ser um número inteiro maior ou igual a 0')
      return
    }
    if (!Number.isFinite(entregue) || entregue < 0 || !Number.isInteger(entregue)) {
      toastError('Entregue deve ser um número inteiro maior ou igual a 0')
      return
    }
    if (entregue > provisionado) {
      toastError('Entregue não pode ser maior que Provisionado')
      return
    }

    setSaving(true)
    try {
      await updateItem(perito.id, {
        provisionado,
        entregue,
        analista: analista.trim() || null,
        regiao: regiao.trim(),
      })
      success('Perito atualizado')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao salvar perito')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={perito.nome} size="sm">
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#1B4D2E]/10 text-[#1B4D2E] text-sm font-semibold flex items-center justify-center shrink-0">
            {initials(perito.nome)}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-[#1A1A1A] truncate">{perito.nome}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-medium', regionBadgeClasses(perito.regiao))}>
                {perito.regiao}
              </span>
              <span className="text-xs text-[#5A6A5E]">{perito.analista ?? 'Sem analista'}</span>
            </div>
          </div>
        </div>

        <FormField label="Mover para">
          <Select
            value={perito.status}
            disabled={statusChanging}
            onChange={(e) => handleStatusChange(e.target.value as BoardStatus)}
          >
            {BOARD_STATUS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </Select>
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Provisionado">
            <Input
              type="number"
              min={0}
              value={provisionadoStr}
              onChange={(e) => setProvisionadoStr(e.target.value)}
            />
          </FormField>
          <FormField label="Entregue">
            <Input
              type="number"
              min={0}
              value={entregueStr}
              onChange={(e) => setEntregueStr(e.target.value)}
            />
          </FormField>
        </div>

        <FormField label="Analista">
          <Input
            value={analista}
            onChange={(e) => setAnalista(e.target.value)}
            placeholder="Sem analista"
          />
        </FormField>

        <FormField label="Região">
          <Input
            value={regiao}
            onChange={(e) => setRegiao(e.target.value)}
          />
        </FormField>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>Fechar</Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Página ───────────────────────────────────────────────────────────────────────

export default function BoardPeritosPage() {
  const { items, loading, error, fetchBoard } = useBoardPeritosStore()

  const [query, setQuery] = useState('')
  const [activeRegions, setActiveRegions] = useState<Set<string>>(new Set())
  const [collapsedStatuses, setCollapsedStatuses] = useState<Set<BoardStatus>>(new Set())
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    fetchBoard()
  }, [fetchBoard])

  const regions = useMemo(() => {
    const set = new Set(items.map((i) => i.regiao).filter(Boolean))
    return Array.from(set).sort()
  }, [items])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter((i) => {
      if (activeRegions.size > 0 && !activeRegions.has(i.regiao)) return false
      if (q && !i.nome.toLowerCase().includes(q)) return false
      return true
    })
  }, [items, query, activeRegions])

  const grouped = useMemo(() => {
    return BOARD_STATUS.map((s) => ({
      status: s.value,
      label: s.label,
      items: filtered.filter((i) => i.status === s.value).sort((a, b) => a.ordem - b.ordem),
    }))
  }, [filtered])

  const kpis = useMemo(() => {
    const total = items.length
    const emAnalise = items.filter((i) => i.status === 'analise_1' || i.status === 'analise_2').length
    const entregueTotal = items.reduce((sum, i) => sum + i.entregue, 0)
    const pendenteTotal = items.reduce((sum, i) => sum + Math.max(i.provisionado - i.entregue, 0), 0)
    return { total, emAnalise, entregueTotal, pendenteTotal }
  }, [items])

  const selected = useMemo(() => items.find((i) => i.id === selectedId) ?? null, [items, selectedId])

  function toggleRegion(regiao: string) {
    setActiveRegions((prev) => {
      const next = new Set(prev)
      if (next.has(regiao)) next.delete(regiao)
      else next.add(regiao)
      return next
    })
  }

  function toggleSection(status: BoardStatus) {
    setCollapsedStatuses((prev) => {
      const next = new Set(prev)
      if (next.has(status)) next.delete(status)
      else next.add(status)
      return next
    })
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">

      {/* ── Cabeçalho ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1A1A1A]">Gestão de Peritos</h1>
          <p className="text-sm text-[#5A6A5E] mt-0.5">
            {items.length} perito{items.length !== 1 ? 's' : ''} cadastrado{items.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-6">
          <Kpi label="Total" value={kpis.total} />
          <Kpi label="Em análise" value={kpis.emAnalise} />
          <Kpi label="Entregues" value={kpis.entregueTotal} />
          <Kpi label="Pendentes" value={kpis.pendenteTotal} />
        </div>
      </div>

      {error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {/* ── Barra de ferramentas ──────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9AA4A0] pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome do perito…"
            className="w-full pl-8 pr-8 h-9 bg-white border border-[#D4DAD6] rounded-lg text-sm text-[#1A1A1A] placeholder-[#9AA4A0] focus:outline-none focus:border-[#1B4D2E] focus:ring-1 focus:ring-[#1B4D2E]/30 transition-colors"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9AA4A0] hover:text-[#5A6A5E] transition-colors"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {regions.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {regions.map((regiao) => {
              const active = activeRegions.has(regiao)
              return (
                <button
                  key={regiao}
                  onClick={() => toggleRegion(regiao)}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                    active
                      ? 'bg-[#1B4D2E] text-white border-[#1B4D2E]'
                      : 'bg-white text-[#5A6A5E] border-[#D4DAD6] hover:border-[#1B4D2E]/40',
                  )}
                >
                  {regiao}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Estado de carregamento ────────────────────────────────────────── */}
      {loading && items.length === 0 && (
        <div className="text-sm text-[#5A6A5E] text-center py-10">Carregando peritos…</div>
      )}

      {/* ── Seções por status ──────────────────────────────────────────────── */}
      {(!loading || items.length > 0) && (
        <div className="space-y-3">
          {grouped.map((g) => (
            <StatusSection
              key={g.status}
              status={g.status}
              label={g.label}
              items={g.items}
              collapsed={collapsedStatuses.has(g.status)}
              onToggle={() => toggleSection(g.status)}
              onOpenPerito={setSelectedId}
            />
          ))}
        </div>
      )}

      {selected && (
        <DetailModal perito={selected} onClose={() => setSelectedId(null)} />
      )}
    </div>
  )
}
