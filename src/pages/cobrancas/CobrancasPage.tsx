import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend,
  type TooltipItem,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import {
  DollarSign, TrendingUp, Clock, FileWarning,
  PlusCircle, Pencil, Trash2, FileText,
  Search, ChevronUp, ChevronDown, ChevronRight, ChevronsUpDown, X,
} from 'lucide-react'

import { useCobrancasStore, selectPeritoNames } from '../../store/cobrancasStore'
import { useLotesStore } from '../../store/lotesStore'
import { KpiCard } from '../../components/ui/Card'
import { ChartCard } from '../../components/dashboard/ChartCard'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Input'
import { Modal, ConfirmDialog } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/Toast'
import { cn, formatCurrency, formatDate, formatMonthYear } from '../../lib/utils'
import { CobrancaForm, type CobrancaSubmitData } from './CobrancaForm'
import type { Cobranca } from '../../types/cobrancas'

type GroupedCobranca =
  | { grouped: false; cobranca: Cobranca }
  | {
      grouped: true
      key: string
      perito: string
      regiao: string
      mesRef: string | null
      recebido: boolean
      valorTotal: number
      comissao: Cobranca
      lote: Cobranca
      dataEnvio: string | null
      notaFiscal: string
      linkPdf: string | null
    }

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend)

const DARK = { grid: '#D4DAD6', text: '#5A6A5E', font: "'Segoe UI', Arial, sans-serif" }
const C = { green: '#2D7A47', blue: '#2563EB', orange: '#d29922', purple: '#9B5CF6' }

type SortKey = keyof Cobranca
type SortDir = 'asc' | 'desc'

function cobrancaSearchable(c: Cobranca): string {
  return [
    c.perito, c.cpfPerito ?? '', c.regiao,
    c.mesRef ?? '', c.dataEnvio ?? '',
    String(c.valor), c.tipo,
    c.recebido ? 'recebido sim' : 'pendente não',
    c.notaFiscal,
  ].join(' ').toLowerCase()
}

const MONTHS_SHORT = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
function abrevMes(yyyymm: string) {
  const [y, m] = yyyymm.split('-')
  return `${MONTHS_SHORT[Number(m) - 1]}/${y.slice(2)}`
}

const CHART_BASE = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: DARK.text, font: { family: DARK.font, size: 11 }, boxWidth: 10 } },
  },
}

// Seletor estável em nível de módulo — seletores inline causam re-renders infinitos
// no Zustand v5 porque criam nova referência de função a cada render.
const selectLotes = (s: { lotes: { perito: string }[] }) => s.lotes

// ── Helpers ──────────────────────────────────────────────────────────────────

function mesRefLabel(iso: string | null): string {
  if (!iso) return '—'
  return formatMonthYear(iso)
}

function buildMonthlyData(cobrancas: Cobranca[]) {
  const map: Record<string, { comissao: number; lote: number }> = {}
  for (const c of cobrancas) {
    if (!c.mesRef) continue
    const key = c.mesRef.substring(0, 7)
    if (!map[key]) map[key] = { comissao: 0, lote: 0 }
    if (c.tipo === 'Comissão') map[key].comissao += c.valor
    else                       map[key].lote     += c.valor
  }
  const sorted = Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
  return {
    labels:   sorted.map(([k]) => formatMonthYear(`${k}-01`)),
    comissao: sorted.map(([, v]) => v.comissao),
    lote:     sorted.map(([, v]) => v.lote),
  }
}

const REGIAO_COLORS = ['#2D7A47', '#2563EB', '#9B5CF6', '#39d0d8', '#f85149', '#e879f9']

function buildRegiaoData(cobrancas: Cobranca[]) {
  const monthsSet = new Set<string>()
  const regioesSet = new Set<string>()
  for (const c of cobrancas) {
    if (!c.mesRef) continue
    monthsSet.add(c.mesRef.substring(0, 7))
    regioesSet.add(c.regiao || 'Sem Região')
  }
  const months  = [...monthsSet].sort()
  const regioes = [...regioesSet].sort()
  const map: Record<string, Record<string, number>> = {}
  for (const c of cobrancas) {
    if (!c.mesRef) continue
    const month  = c.mesRef.substring(0, 7)
    const regiao = c.regiao || 'Sem Região'
    if (!map[month]) map[month] = {}
    map[month][regiao] = (map[month][regiao] ?? 0) + c.valor
  }
  return {
    labels:  months.map((m) => formatMonthYear(`${m}-01`)),
    regioes,
    data:    regioes.map((r) => months.map((m) => map[m]?.[r] ?? 0)),
    totals:  months.map((m) => Object.values(map[m] ?? {}).reduce((s, v) => s + v, 0)),
  }
}

function groupCobrancas(cobrancas: Cobranca[]): GroupedCobranca[] {
  const used = new Set<string>()
  const result: GroupedCobranca[] = []

  for (const c of cobrancas) {
    if (used.has(c.id)) continue

    const pair = cobrancas.find(
      (o) =>
        !used.has(o.id) &&
        o.id !== c.id &&
        o.perito === c.perito &&
        o.regiao === c.regiao &&
        o.mesRef === c.mesRef &&
        o.recebido === c.recebido &&
        ((c.tipo === 'Comissão' && o.tipo === 'Lote') ||
          (c.tipo === 'Lote' && o.tipo === 'Comissão')),
    )

    if (pair) {
      used.add(c.id)
      used.add(pair.id)
      const comissao = c.tipo === 'Comissão' ? c : pair
      const lote     = c.tipo === 'Lote'     ? c : pair
      result.push({
        grouped: true,
        key: `${c.id}-${pair.id}`,
        perito: c.perito,
        regiao: c.regiao,
        mesRef: c.mesRef,
        recebido: c.recebido,
        valorTotal: c.valor + pair.valor,
        comissao,
        lote,
        dataEnvio:   comissao.dataEnvio ?? lote.dataEnvio ?? null,
        notaFiscal:  comissao.notaFiscal,
        linkPdf:     comissao.linkPdf ?? lote.linkPdf ?? null,
      })
    } else {
      used.add(c.id)
      result.push({ grouped: false, cobranca: c })
    }
  }

  return result
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CobrancasPage() {
  const { cobrancas, peritos, loading, error, fetchAll, addCobranca, updateCobranca, deleteCobranca, saveCpf } =
    useCobrancasStore()
  const lotes = useLotesStore(selectLotes)
  const lotesPeritos = useMemo(
    () => [...new Set(lotes.map((l) => l.perito))].sort(),
    [lotes],
  )
  const { success: toastSuccess, error: toastError } = useToast()

  const [modalOpen,   setModalOpen]   = useState(false)
  const [editTarget,  setEditTarget]  = useState<Cobranca | null>(null)
  const [deleteId,    setDeleteId]    = useState<string | null>(null)
  const [saving,      setSaving]      = useState(false)

  // Filters
  const [fRegiao,     setFRegiao]     = useState('')
  const [fPerito,     setFPerito]     = useState('')
  const [fMesInicio,  setFMesInicio]  = useState('')
  const [fMesFim,     setFMesFim]     = useState('')
  const [fTipo,       setFTipo]       = useState('')
  const [fRecebido,   setFRecebido]   = useState('')
  const [query,       setQuery]       = useState('')
  const [sortKey,     setSortKey]     = useState<SortKey>('mesRef')
  const [sortDir,     setSortDir]     = useState<SortDir>('desc')

  const handleSort = useCallback((key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }, [sortKey])

  useEffect(() => { fetchAll() }, [fetchAll])

  const peritoNames = useMemo(
    () => selectPeritoNames(lotesPeritos, peritos, cobrancas),
    [lotesPeritos, peritos, cobrancas],
  )

  const peritoNamesFiltrados = useMemo(() => {
    if (!fRegiao) return peritoNames
    const nomes = new Set(cobrancas.filter((c) => c.regiao === fRegiao).map((c) => c.perito))
    return peritoNames.filter((n) => nomes.has(n))
  }, [peritoNames, cobrancas, fRegiao])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return cobrancas.filter((c) => {
      if (fRegiao   && c.regiao !== fRegiao) return false
      if (fPerito   && c.perito !== fPerito) return false
      const mes = c.mesRef?.substring(0, 7) ?? ''
      if (fMesInicio && mes < fMesInicio) return false
      if (fMesFim    && mes > fMesFim)    return false
      if (fTipo     && c.tipo !== fTipo) return false
      if (fRecebido === 'sim' && !c.recebido) return false
      if (fRecebido === 'nao' && c.recebido)  return false
      if (q && !cobrancaSearchable(c).includes(q)) return false
      return true
    })
  }, [cobrancas, fRegiao, fPerito, fMesInicio, fMesFim, fTipo, fRecebido, query])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const va = a[sortKey]
      const vb = b[sortKey]
      let cmp = 0
      if (typeof va === 'boolean') cmp = Number(va) - Number(vb)
      else if (typeof va === 'number') cmp = va - (vb as number)
      else cmp = (va ?? '').toString().localeCompare((vb ?? '').toString())
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set())

  const groupedRows = useMemo(() => groupCobrancas(sorted), [sorted])

  function toggleExpand(key: string) {
    setExpandedKeys((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  // KPIs (baseados no filtrado)
  const totalCobrado  = filtered.reduce((s, c) => s + c.valor, 0)
  const totalRecebido = filtered.filter((c) => c.recebido).reduce((s, c) => s + c.valor, 0)
  const totalPendente = filtered.filter((c) => !c.recebido).reduce((s, c) => s + c.valor, 0)

  // Contagens por linhas agrupadas (par Comissão+Lote = 1 cobrança)
  const { qtdRecebido, qtdNaoRecebido, totalLinhas } = useMemo(() => {
    let rec = 0, nao = 0
    for (const row of groupedRows) {
      if (row.grouped ? row.recebido : row.cobranca.recebido) rec++
      else nao++
    }
    return { qtdRecebido: rec, qtdNaoRecebido: nao, totalLinhas: groupedRows.length }
  }, [groupedRows])

  const taxaRecebimento = totalLinhas > 0
    ? Math.round((qtdRecebido / totalLinhas) * 100)
    : 0

  const totalLinhasGlobal = useMemo(() => groupCobrancas(cobrancas).length, [cobrancas])

  // Chart data (baseado no filtrado)
  const monthly = useMemo(() => buildMonthlyData(filtered), [filtered])
  const regiao  = useMemo(() => buildRegiaoData(filtered),  [filtered])

  const monthlyChartData = {
    labels: monthly.labels,
    datasets: [
      {
        label: 'Comissão',
        data: monthly.comissao,
        backgroundColor: `${C.green}99`,
        borderColor: C.green,
        borderWidth: 1,
        borderRadius: 4,
        yAxisID: 'y',
      },
      {
        label: 'Lote',
        data: monthly.lote,
        backgroundColor: `${C.blue}99`,
        borderColor: C.blue,
        borderWidth: 1,
        borderRadius: 4,
        yAxisID: 'y',
      },
      {
        type: 'line' as const,
        label: 'Total',
        data: monthly.comissao.map((v, i) => v + monthly.lote[i]),
        borderColor: C.orange,
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: C.orange,
        tension: 0.3,
        yAxisID: 'y2',
      },
    ],
  }

  const regiaoChartData = {
    labels: regiao.labels,
    datasets: [
      ...regiao.regioes.map((r, i) => ({
        label: r,
        data: regiao.data[i],
        backgroundColor: `${REGIAO_COLORS[i % REGIAO_COLORS.length]}99`,
        borderColor: REGIAO_COLORS[i % REGIAO_COLORS.length],
        borderWidth: 1,
        borderRadius: 4,
        yAxisID: 'y',
      })),
      {
        type: 'line' as const,
        label: 'Total',
        data: regiao.totals,
        borderColor: C.orange,
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: C.orange,
        tension: 0.3,
        yAxisID: 'y2',
      },
    ],
  }

  const barOptions = {
    ...CHART_BASE,
    scales: {
      x: { grid: { color: DARK.grid }, ticks: { color: DARK.text } },
      y: { grid: { color: DARK.grid }, ticks: { color: DARK.text, callback: (v: number | string) => `R$${(Number(v)/1000).toFixed(0)}k` } },
      y2: { position: 'right' as const, grid: { display: false }, ticks: { color: C.orange, callback: (v: number | string) => `R$${(Number(v)/1000).toFixed(0)}k` } },
    },
    plugins: {
      ...CHART_BASE.plugins,
      tooltip: {
        callbacks: {
          label: (ctx: TooltipItem<'bar'>) =>
            ` ${ctx.dataset.label}: ${formatCurrency((ctx.parsed as { y?: number }).y ?? 0)}`,
        },
      },
    },
  }


  const uniqueRegioes    = [...new Set(cobrancas.map((c) => c.regiao).filter(Boolean))].sort()
  const availableMonths  = [...new Set(cobrancas.map((c) => c.mesRef?.substring(0, 7)).filter(Boolean) as string[])].sort()

  async function handleSubmit(items: CobrancaSubmitData[]) {
    if (items.length === 0) return
    setSaving(true)

    // Persiste CPF no cadastro de peritos uma única vez
    const first = items[0]
    if (first.cpfPerito) await saveCpf(first.perito, first.cpfPerito)

    for (const data of items) {
      const payload = {
        perito:          data.perito,
        cpfPerito:       data.cpfPerito || null,
        regiao:          data.regiao,
        mesRef:          data.mesRef || null,
        dataEnvio:       data.dataEnvio || null,
        valor:           data.valor,
        tipo:            data.tipo,
        recebido:        data.recebido,
        dataRecebimento: data.dataRecebimento || null,
        notaFiscal:      data.notaFiscal,
        linkPdf:         data.linkPdf || null,
      }

      const err = editTarget
        ? await updateCobranca(editTarget.id, payload)
        : await addCobranca(payload)

      if (err) {
        setSaving(false)
        toastError(err)
        return
      }
    }

    setSaving(false)
    toastSuccess(
      items.length > 1
        ? `${items.length} cobranças cadastradas!`
        : editTarget ? 'Cobrança atualizada!' : 'Cobrança cadastrada!'
    )
    setModalOpen(false)
    setEditTarget(null)
  }

  function openNew() { setEditTarget(null); setModalOpen(true) }
  function openEdit(c: Cobranca) { setEditTarget(c); setModalOpen(true) }

  async function handleDelete() {
    if (!deleteId) return
    await deleteCobranca(deleteId)
    toastSuccess('Cobrança excluída.')
    setDeleteId(null)
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
          Erro ao carregar: {error}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1A1A1A]">Cobranças</h1>
          <p className="text-sm text-[#5A6A5E] mt-0.5">Gestão de cobranças a peritos</p>
        </div>
        <Button variant="primary" onClick={openNew}>
          <PlusCircle size={14} /> Nova Cobrança
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-[#D4DAD6] rounded-lg px-4 py-3">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 items-end">
          <div className="lg:col-span-1">
            <Select value={fRegiao} onChange={(e) => { setFRegiao(e.target.value); setFPerito('') }}>
              <option value="">Regiões</option>
              {uniqueRegioes.map((r) => <option key={r} value={r}>{r}</option>)}
            </Select>
          </div>

          <div className="lg:col-span-2">
            <Select value={fPerito} onChange={(e) => setFPerito(e.target.value)}>
              <option value="">Todos os peritos</option>
              {peritoNamesFiltrados.map((n) => <option key={n} value={n}>{n}</option>)}
            </Select>
          </div>

          <div className="lg:col-span-3">
            <p className="text-[10px] font-semibold text-[#5A6A5E] uppercase tracking-wide mb-1">Período</p>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold text-[#5A6A5E] uppercase shrink-0">De</span>
              <div className="flex-1 min-w-0">
                <Select value={fMesInicio} onChange={(e) => setFMesInicio(e.target.value)}>
                  <option value="">—</option>
                  {availableMonths.map((m) => <option key={m} value={m}>{abrevMes(m)}</option>)}
                </Select>
              </div>
              <span className="text-[10px] font-semibold text-[#5A6A5E] uppercase shrink-0">Até</span>
              <div className="flex-1 min-w-0">
                <Select value={fMesFim} onChange={(e) => setFMesFim(e.target.value)}>
                  <option value="">—</option>
                  {availableMonths.map((m) => <option key={m} value={m}>{abrevMes(m)}</option>)}
                </Select>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 flex gap-2">
            <div className="flex-1 min-w-0">
              <Select value={fTipo} onChange={(e) => setFTipo(e.target.value)}>
                <option value="">Tipo</option>
                <option value="Comissão">Comissão</option>
                <option value="Lote">Lote</option>
              </Select>
            </div>
            <div className="flex-1 min-w-0">
              <Select value={fRecebido} onChange={(e) => setFRecebido(e.target.value)}>
                <option value="">Status</option>
                <option value="sim">Recebido</option>
                <option value="nao">Pendente</option>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Cobrado"        value={formatCurrency(totalCobrado)}  color="blue"   icon={DollarSign} sub={`${totalLinhas} cobrança${totalLinhas !== 1 ? 's' : ''}`} />
        <KpiCard label="Total Recebido"       value={formatCurrency(totalRecebido)} color="green"  icon={TrendingUp}  sub={`${qtdRecebido} cobranças`} />
        <KpiCard label="Total Pendente"       value={formatCurrency(totalPendente)} color="red"    icon={Clock}       sub={`${qtdNaoRecebido} cobranças`} />
        <KpiCard label="Taxa de Recebimento"  value={`${taxaRecebimento}%`}         color="orange" icon={TrendingUp}  sub={`${qtdRecebido} recebidas · ${qtdNaoRecebido} pendentes`} />
      </div>

      {/* Charts */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Evolução Mensal" subtitle="Comissão vs Lote" className="min-h-[260px]">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Bar data={monthlyChartData as any} options={barOptions} />
          </ChartCard>
          <ChartCard title="Evolução Mensal" subtitle="Faturamento vs Região" className="min-h-[260px]">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Bar data={regiaoChartData as any} options={barOptions} />
          </ChartCard>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9AA4A0] pointer-events-none" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por perito, CPF, região, tipo…"
          className="w-full pl-8 pr-8 h-9 bg-white border border-[#D4DAD6] rounded-lg text-sm text-[#1A1A1A] placeholder-[#9AA4A0] focus:outline-none focus:border-[#1B4D2E] focus:ring-1 focus:ring-[#1B4D2E]/30 transition-colors"
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9AA4A0] hover:text-[#5A6A5E] transition-colors">
            <X size={13} />
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-[#D4DAD6] rounded-lg overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-[#5A6A5E]">Carregando…</div>
        ) : sorted.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm font-medium text-[#1A1A1A]">Nenhuma cobrança encontrada</p>
            <p className="text-xs text-[#5A6A5E] mt-1">
              {cobrancas.length === 0 ? 'Cadastre a primeira cobrança.' : 'Ajuste os filtros.'}
            </p>
            {cobrancas.length === 0 && (
              <Button variant="primary" size="sm" className="mt-4" onClick={openNew}>
                <PlusCircle size={13} /> Nova Cobrança
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                {(() => {
                  const SortIcon = ({ k }: { k: SortKey }) =>
                    sortKey !== k ? <ChevronsUpDown size={11} className="opacity-30" />
                    : sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />
                  const Th = ({ k, children }: { k: SortKey; children: React.ReactNode }) => (
                    <th onClick={() => handleSort(k)} className="px-4 py-2.5 text-left text-xs font-semibold text-[#5A6A5E] uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-[#1A1A1A] select-none bg-[#F4F6F4]">
                      <span className="inline-flex items-center gap-1">{children}<SortIcon k={k} /></span>
                    </th>
                  )
                  return (
                    <tr className="border-b border-[#D4DAD6]">
                      <Th k="perito">Perito</Th>
                      <Th k="regiao">Região</Th>
                      <Th k="mesRef">Mês Ref.</Th>
                      <Th k="dataEnvio">Envio</Th>
                      <Th k="valor">Valor</Th>
                      <Th k="tipo">Tipo</Th>
                      <Th k="recebido">Recebido</Th>
                      <Th k="notaFiscal">NF</Th>
                      <th className="px-4 py-2.5 bg-[#F4F6F4]">PDF</th>
                      <th className="px-4 py-2.5 bg-[#F4F6F4]"></th>
                    </tr>
                  )
                })()}
              </thead>
              <tbody className="divide-y divide-[#F0F2F0]">
                {groupedRows.map((row) => {
                  if (!row.grouped) {
                    const c = row.cobranca
                    return (
                      <tr key={c.id} className="hover:bg-[#F4F6F4]/60 transition-colors">
                        <td className="px-4 py-3 font-medium text-[#1A1A1A] whitespace-nowrap">{c.perito}</td>
                        <td className="px-4 py-3 text-[#5A6A5E] whitespace-nowrap">{c.regiao || '—'}</td>
                        <td className="px-4 py-3 text-[#5A6A5E] whitespace-nowrap">{mesRefLabel(c.mesRef)}</td>
                        <td className="px-4 py-3 text-[#5A6A5E] whitespace-nowrap">{formatDate(c.dataEnvio ?? '')}</td>
                        <td className="px-4 py-3 font-semibold text-[#1B4D2E] whitespace-nowrap">{formatCurrency(c.valor)}</td>
                        <td className="px-4 py-3">
                          <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                            c.tipo === 'Comissão' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200')}>
                            {c.tipo}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                            c.recebido ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200')}>
                            {c.recebido ? 'Sim' : 'Não'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                            c.notaFiscal === 'Emitida' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-red-50 text-red-700 border border-red-200')}>
                            {c.notaFiscal === 'Emitida' ? 'Emitida' : 'Pendente'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {c.linkPdf ? (
                            <a href={c.linkPdf} target="_blank" rel="noopener noreferrer" title="Abrir PDF" className="text-[#1B4D2E] hover:text-[#2D7A47] transition-colors"><FileText size={15} /></a>
                          ) : (
                            <span className="text-[#D4DAD6]"><FileText size={15} /></span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEdit(c)} className="p-1 rounded text-[#5A6A5E] hover:text-[#1B4D2E] hover:bg-[#1B4D2E]/5 transition-colors" title="Editar"><Pencil size={13} /></button>
                            <button onClick={() => setDeleteId(c.id)} className="p-1 rounded text-[#5A6A5E] hover:text-red-600 hover:bg-red-50 transition-colors" title="Excluir"><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    )
                  }

                  // LINHA AGRUPADA
                  const isOpen = expandedKeys.has(row.key)
                  return (
                    <React.Fragment key={row.key}>
                      <tr onClick={() => toggleExpand(row.key)} className="hover:bg-[#F4F6F4]/60 transition-colors cursor-pointer">
                        <td className="px-4 py-3 font-medium text-[#1A1A1A] whitespace-nowrap">{row.perito}</td>
                        <td className="px-4 py-3 text-[#5A6A5E] whitespace-nowrap">{row.regiao || '—'}</td>
                        <td className="px-4 py-3 text-[#5A6A5E] whitespace-nowrap">{mesRefLabel(row.mesRef)}</td>
                        <td className="px-4 py-3 text-[#5A6A5E] whitespace-nowrap">{formatDate(row.dataEnvio ?? '')}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-semibold text-[#1B4D2E]">{formatCurrency(row.valorTotal)}</span>
                          <span className="block text-[11px] text-[#5A6A5E] font-normal">2 lançamentos</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 mr-1">Comissão</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">Lote</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                            row.recebido ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200')}>
                            {row.recebido ? 'Sim' : 'Não'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                            row.notaFiscal === 'Emitida' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-red-50 text-red-700 border border-red-200')}>
                            {row.notaFiscal === 'Emitida' ? 'Emitida' : 'Pendente'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {row.linkPdf ? (
                            <a href={row.linkPdf} target="_blank" rel="noopener noreferrer" title="Abrir PDF" onClick={(e) => e.stopPropagation()} className="text-[#1B4D2E] hover:text-[#2D7A47] transition-colors"><FileText size={15} /></a>
                          ) : (
                            <span className="text-[#D4DAD6]"><FileText size={15} /></span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <ChevronRight size={14} className={cn('text-[#5A6A5E] transition-transform duration-200', isOpen && 'rotate-90')} />
                        </td>
                      </tr>

                      {isOpen && (
                        <tr className="bg-[#F8FAF8]">
                          <td colSpan={10} className="px-6 py-3">
                            <div className="ml-4 pl-4 border-l-2 border-[#D4DAD6]">
                              <div className="flex items-center gap-6 mb-3 flex-wrap">
                                <div>
                                  <p className="text-[10px] font-semibold text-[#5A6A5E] uppercase tracking-wide">Envio</p>
                                  <p className="text-sm font-medium text-[#1A1A1A] mt-0.5">{formatDate(row.dataEnvio ?? '')}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-semibold text-[#5A6A5E] uppercase tracking-wide">Nota fiscal</p>
                                  <div className="mt-1">
                                    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                                      row.notaFiscal === 'Emitida' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : 'bg-red-50 text-red-700 border border-red-200')}>
                                      {row.notaFiscal === 'Emitida' ? 'Emitida' : 'Pendente'}
                                    </span>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-[10px] font-semibold text-[#5A6A5E] uppercase tracking-wide">PDF</p>
                                  <div className="mt-1">
                                    {row.linkPdf ? (
                                      <a href={row.linkPdf} target="_blank" rel="noopener noreferrer" className="text-[#1B4D2E] hover:text-[#2D7A47] transition-colors"><FileText size={15} /></a>
                                    ) : (
                                      <span className="text-[#D4DAD6]"><FileText size={15} /></span>
                                    )}
                                  </div>
                                </div>
                                <div className="ml-auto flex items-end gap-1">
                                  <button onClick={(e) => { e.stopPropagation(); openEdit(row.comissao) }} className="p-1 rounded text-[#5A6A5E] hover:text-[#1B4D2E] hover:bg-[#1B4D2E]/5 transition-colors" title="Editar Comissão"><Pencil size={13} /></button>
                                  <button onClick={(e) => { e.stopPropagation(); setDeleteId(row.comissao.id) }} className="p-1 rounded text-[#5A6A5E] hover:text-red-600 hover:bg-red-50 transition-colors" title="Excluir Comissão"><Trash2 size={13} /></button>
                                </div>
                              </div>
                              <div className="border-t border-[#E8EDE8] pt-2">
                                <div className="flex gap-6 text-sm">
                                  <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">Comissão</span>
                                    <span className="font-semibold text-[#1B4D2E]">{formatCurrency(row.comissao.valor)}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">Lote</span>
                                    <span className="font-semibold text-[#1B4D2E]">{formatCurrency(row.lote.valor)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {groupedRows.length > 0 && (
          <div className="px-4 py-2 border-t border-[#D4DAD6] bg-[#F4F6F4] text-xs text-[#5A6A5E]">
            {groupedRows.length} cobrança{groupedRows.length !== 1 ? 's' : ''}
            {groupedRows.length !== totalLinhasGlobal && ` (de ${totalLinhasGlobal} no total)`}
            {' · '}Total filtrado: <strong className="text-[#1B4D2E]">{formatCurrency(sorted.reduce((s, c) => s + c.valor, 0))}</strong>
          </div>
        )}
      </div>

      {/* Modal Form */}
      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditTarget(null) }}
        title={editTarget ? 'Editar Cobrança' : 'Nova Cobrança'}
        size="lg"
      >
        <CobrancaForm
          key={editTarget?.id ?? 'new'}
          defaultValues={editTarget ?? undefined}
          peritoNames={peritoNames}
          peritos={peritos}
          onSubmit={handleSubmit}
          onCancel={() => { setModalOpen(false); setEditTarget(null) }}
          loading={saving}
          submitLabel={editTarget ? 'Atualizar' : 'Cadastrar'}
        />
      </Modal>

      {/* Confirm Delete */}
      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Excluir cobrança"
        message="Esta ação não pode ser desfeita. Deseja excluir esta cobrança?"
      />
    </div>
  )
}
