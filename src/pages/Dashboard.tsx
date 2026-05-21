import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement, PointElement,
  ArcElement, Tooltip, Legend, Filler,
} from 'chart.js'
import { Bar, Doughnut, Line, Chart } from 'react-chartjs-2'
import { Link } from 'react-router-dom'
import {
  PlusCircle, Upload, AlertTriangle, TrendingUp, Info,
  FileText, Scale, Clock, Users, Building2, ChevronDown, X,
} from 'lucide-react'

import {
  useLotesStore, selectKpis, selectByTipo, selectByMes,
  selectTopPeritos, selectByRegiao, selectByFormato, selectRecentLotes,
} from '../store/lotesStore'
import { KpiCard } from '../components/ui/Card'
import { ChartCard } from '../components/dashboard/ChartCard'
import { Button } from '../components/ui/Button'
import { TipoBadge, PagoBadge } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/EmptyState'
import { cn, formatCompact, formatCompactNum, formatCurrency, formatMonthYear } from '../lib/utils'
import type { Lote } from '../types'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend, Filler)

// ── Paleta ──────────────────────────────────────────────────────────────────
const DARK = { grid: '#21262d', text: '#8b949e', font: "'Segoe UI', Arial, sans-serif" }
const C = {
  blue: '#388bfd', purple: '#bc8cff', green: '#3fb950',
  orange: '#d29922', teal: '#39d0d8', red: '#f85149',
}

/** Formata valores monetários nos ticks do eixo Y como R$ #,#k */
const fmtTickK = (v: number | string) => {
  const k = Number(v) / 1000
  return k.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + 'k'
}

const CHART_BASE = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: DARK.text, font: { family: DARK.font, size: 11 }, boxWidth: 10 } },
  },
} as const

// ── Insights ─────────────────────────────────────────────────────────────────
interface Insight { level: 'warning' | 'info' | 'success'; title: string; body: string }

function computeInsights(lotes: Lote[]): Insight[] {
  if (lotes.length === 0) return []
  const insights: Insight[] = []

  const byAnalista = lotes.reduce<Record<string, number>>((a, l) => {
    a[l.analista] = (a[l.analista] ?? 0) + 1; return a
  }, {})
  const topAnalista = Object.entries(byAnalista).sort((a, b) => b[1] - a[1])[0]
  if (topAnalista) {
    const pct = Math.round((topAnalista[1] / lotes.length) * 100)
    if (pct >= 70) {
      const valorTotal = lotes.reduce((s, l) => s + l.valorDevido, 0)
      const valorAnalista = lotes.filter((l) => l.analista === topAnalista[0]).reduce((s, l) => s + l.valorDevido, 0)
      const vPct = Math.round((valorAnalista / valorTotal) * 100)
      insights.push({
        level: 'warning',
        title: `⚠️ Ponto único de falha — ${topAnalista[0]}`,
        body: `Responsável por ${topAnalista[1]} dos ${lotes.length} lotes (${pct}%) e ${formatCurrency(valorAnalista)} (${vPct}% do valor). Qualquer indisponibilidade paralisa a operação.`,
      })
    }
  }

  const byRegiao = lotes.reduce<Record<string, number>>((a, l) => {
    a[l.regiao] = (a[l.regiao] ?? 0) + 1; return a
  }, {})
  const topRegiao = Object.entries(byRegiao).sort((a, b) => b[1] - a[1])[0]
  if (topRegiao) {
    const pct = Math.round((topRegiao[1] / lotes.length) * 100)
    if (pct >= 55) {
      insights.push({
        level: 'info',
        title: `📍 Dependência geográfica — ${topRegiao[0]} domina`,
        body: `${topRegiao[0]} representa ${pct}% dos lotes. As demais regiões somam apenas ${100 - pct}% — oportunidade de expansão inexplorada.`,
      })
    }
  }

  // Eficiência = menor custo por processo "P" encontrado (valorDevido / qtdP)
  const peritoMap: Record<string, { valor: number; qtdP: number; lotes: number }> = {}
  for (const l of lotes) {
    if (!peritoMap[l.perito]) peritoMap[l.perito] = { valor: 0, qtdP: 0, lotes: 0 }
    peritoMap[l.perito].valor += l.valorDevido
    peritoMap[l.perito].qtdP  += l.qtdP ?? 0
    peritoMap[l.perito].lotes++
  }
  // Considera apenas peritos que têm P's registrados e custo > 0
  const comP = Object.entries(peritoMap).filter(([, v]) => v.qtdP > 0 && v.valor > 0)
  if (comP.length > 0) {
    const custoPorP = ([, v]: typeof comP[0]) => v.valor / v.qtdP
    const efficient = comP.slice().sort((a, b) => custoPorP(a) - custoPorP(b))[0]
    const [nome, dados] = efficient
    const ratio = custoPorP(efficient)
    insights.push({
      level: 'success',
      title: `🏆 Perito mais eficiente — ${nome}`,
      body: `${formatCurrency(ratio)}/P encontrado · ${dados.qtdP} P's · custo total ${formatCurrency(dados.valor)}.`,
    })
  }

  const diasMax = lotes.reduce((max, l) => l.qtdDias > max.qtdDias ? l : max, lotes[0])
  const diasMedia = lotes.reduce((s, l) => s + l.qtdDias, 0) / lotes.length
  if (diasMax.qtdDias > diasMedia * 3 && diasMax.qtdDias > 10) {
    insights.push({
      level: 'warning',
      title: `🚨 Outlier de prazo — ${diasMax.perito}`,
      body: `${diasMax.qtdDias} dias para o Lote ${diasMax.lote} (${diasMax.regiao}) — ${(diasMax.qtdDias / diasMedia).toFixed(1)}x acima da média. Pode impactar prazos judiciais dos processos "P".`,
    })
  }

  const byMes: Record<string, number> = {}
  for (const l of lotes) {
    if (!l.mesRef) continue
    const d = new Date(l.mesRef)
    if (isNaN(d.getTime())) continue
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    byMes[k] = (byMes[k] ?? 0) + l.valorDevido
  }
  const sorted = Object.entries(byMes).sort(([a], [b]) => a.localeCompare(b))
  if (sorted.length >= 4) {
    const recent2 = sorted.slice(-2).reduce((s, [, v]) => s + v, 0) / 2
    const prev2 = sorted.slice(-4, -2).reduce((s, [, v]) => s + v, 0) / 2
    if (prev2 > 0) {
      const growth = ((recent2 - prev2) / prev2) * 100
      const lastMonth = sorted.at(-1)
      if (Math.abs(growth) >= 10 && lastMonth) {
        insights.push({
          level: growth > 0 ? 'success' : 'warning',
          title: growth > 0
            ? `📈 Crescimento sustentado em ${lastMonth[0]}`
            : `📉 Queda recente detectada`,
          body: growth > 0
            ? `Últimos 2 meses com média ${formatCompact(recent2)}/mês — ${growth.toFixed(0)}% acima dos 2 meses anteriores (${formatCompact(prev2)}/mês).`
            : `Últimos 2 meses com média ${formatCompact(recent2)}/mês — queda de ${Math.abs(growth).toFixed(0)}% vs período anterior (${formatCompact(prev2)}/mês).`,
        })
      }
    }
  }

  return insights
}

// ── Ticker ───────────────────────────────────────────────────────────────────
function InsightsTicker({ insights }: { insights: Insight[] }) {
  const [current, setCurrent] = useState(0)
  const [visible, setVisible] = useState(true)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (insights.length <= 1) return
    timerRef.current = setTimeout(() => {
      setVisible(false)
      setTimeout(() => { setCurrent((c) => (c + 1) % insights.length); setVisible(true) }, 400)
    }, 6000)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [current, insights.length])

  if (insights.length === 0) return null
  const ins = insights[current]
  const colors = {
    warning: 'border-amber-500/40 bg-amber-500/8 text-amber-300',
    info:    'border-blue-500/40 bg-blue-500/8 text-blue-300',
    success: 'border-emerald-500/40 bg-emerald-500/8 text-emerald-300',
  }
  const icons = {
    warning: <AlertTriangle size={13} className="shrink-0 text-amber-400 mt-0.5" />,
    info:    <Info size={13} className="shrink-0 text-blue-400 mt-0.5" />,
    success: <TrendingUp size={13} className="shrink-0 text-emerald-400 mt-0.5" />,
  }

  return (
    <div className={`border rounded-lg px-4 py-2.5 flex items-start gap-3 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'} ${colors[ins.level]}`}>
      {icons[ins.level]}
      <div className="flex-1 min-w-0">
        <span className="text-xs font-semibold">{ins.title}</span>
        <span className="text-xs text-gray-400 ml-2">{ins.body}</span>
      </div>
      <div className="flex items-center gap-1 shrink-0 mt-1">
        {insights.map((_, i) => (
          <button
            key={i}
            onClick={() => { setCurrent(i); setVisible(true) }}
            className={`w-1.5 h-1.5 rounded-full transition-colors ${i === current ? 'bg-gray-300' : 'bg-gray-600 hover:bg-gray-500'}`}
          />
        ))}
      </div>
    </div>
  )
}

// ── Histograma de prazo (bins) ────────────────────────────────────────────────
const PRAZO_BINS = [
  { label: '0 dias',    min: 0,  max: 0 },
  { label: '1–2 dias',  min: 1,  max: 2 },
  { label: '3–5 dias',  min: 3,  max: 5 },
  { label: '6–10 dias', min: 6,  max: 10 },
  { label: '11–20 dias',min: 11, max: 20 },
  { label: '21+ dias',  min: 21, max: Infinity },
]
const BIN_COLORS = [C.green, C.blue, C.purple, C.orange, C.red, '#6e40c9']

const MES_LABELS: Record<string, string> = {
  '01': 'Janeiro',  '02': 'Fevereiro', '03': 'Março',    '04': 'Abril',
  '05': 'Maio',     '06': 'Junho',     '07': 'Julho',    '08': 'Agosto',
  '09': 'Setembro', '10': 'Outubro',   '11': 'Novembro', '12': 'Dezembro',
}

const MONTHS_SHORT_PT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function buildHistData(lotes: Lote[]) {
  return PRAZO_BINS.map((b, i) => ({
    label: b.label,
    count: lotes.filter((l) => l.qtdDias >= b.min && l.qtdDias <= b.max).length,
    color: BIN_COLORS[i],
  }))
}

// ── Helpers dos gráficos de analista ─────────────────────────────────────────
type AnalistaEntry = { name: string; lotes: number; valor: number; qtd: number }

function buildAnalistaArr(lotes: Lote[]): AnalistaEntry[] {
  const map: Record<string, AnalistaEntry> = {}
  for (const l of lotes) {
    if (!map[l.analista]) map[l.analista] = { name: l.analista.split(' ')[0], lotes: 0, valor: 0, qtd: 0 }
    map[l.analista].lotes++
    map[l.analista].valor += l.valorDevido
    map[l.analista].qtd   += l.qtdAnalisada
  }
  return Object.values(map).sort((a, b) => b.lotes - a.lotes)
}

function makeAnalistaChart(arr: AnalistaEntry[], barColor: string) {
  const data = {
    labels: arr.map((a) => a.name),
    datasets: [
      {
        type: 'bar' as const,
        label: 'Lotes',
        data: arr.map((a) => a.lotes),
        backgroundColor: `${barColor}99`,
        borderColor: barColor,
        borderWidth: 1.5,
        borderRadius: 4,
        yAxisID: 'y',
        order: 2,
      },
      {
        type: 'line' as const,
        label: 'Valor (R$)',
        data: arr.map((a) => a.valor),
        borderColor: C.purple,
        backgroundColor: 'transparent',
        borderWidth: 2.5,
        pointBackgroundColor: C.purple,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.3,
        yAxisID: 'y2',
        order: 1,
      },
      // Invisível: só aparece no tooltip
      {
        type: 'line' as const,
        label: 'Processos Analisados',
        data: arr.map((a) => a.qtd),
        borderColor: C.teal,
        backgroundColor: 'transparent',
        borderWidth: 0,
        pointRadius: 0,
        pointHoverRadius: 0,
        tension: 0,
        fill: false,
        yAxisID: 'y3',
        order: 99,
      },
    ],
  }

  const options = {
    ...CHART_BASE,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: {
        labels: {
          color: DARK.text,
          font: { family: DARK.font, size: 11 },
          boxWidth: 10,
          filter: (item: { datasetIndex: number }) => item.datasetIndex !== 2,
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx: { datasetIndex: number; parsed: { y: number } }) => {
            const v = ctx.parsed.y
            switch (ctx.datasetIndex) {
              case 0: return ` ${v} lote${v !== 1 ? 's' : ''}`
              case 1: return ` Valor: R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`
              case 2: return ` Processos: ${v.toLocaleString('pt-BR')}`
              default: return ''
            }
          },
        },
      },
    },
    scales: {
      x:  { grid: { display: false }, ticks: { color: DARK.text } },
      y:  { grid: { color: DARK.grid }, ticks: { color: barColor, stepSize: 5 }, title: { display: true, text: 'Lotes', color: barColor, font: { size: 10 } } },
      y2: { position: 'right' as const, grid: { display: false }, ticks: { callback: fmtTickK, color: C.purple }, title: { display: true, text: 'Valor (R$)', color: C.purple, font: { size: 10 } } },
      y3: { display: false },
    },
  }

  return { data, options }
}

// ── MultiSelect ───────────────────────────────────────────────────────────────
function MultiSelect({
  options, selected, onChange, placeholder, renderLabel,
}: {
  options: string[]
  selected: string[]
  onChange: (v: string[]) => void
  placeholder: string
  renderLabel?: (v: string) => string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const toggle = (v: string) =>
    onChange(selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v])

  const display =
    selected.length === 0 ? placeholder
    : selected.length === 1 ? (renderLabel ? renderLabel(selected[0]) : selected[0])
    : `${selected.length} selecionados`

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'h-8 pl-3 pr-8 bg-[#161b22] border rounded-lg text-sm focus:outline-none transition-colors cursor-pointer flex items-center min-w-[150px] text-left',
          open ? 'border-blue-500' : 'border-[#30363d]',
          selected.length > 0 ? 'text-gray-200' : 'text-gray-500',
        )}
      >
        <span className="truncate flex-1">{display}</span>
        <ChevronDown
          size={12}
          className={cn('absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 transition-transform duration-150', open && 'rotate-180')}
        />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-[#1c2333] border border-[#30363d] rounded-lg shadow-xl py-1 min-w-[160px] max-h-52 overflow-y-auto">
          {options.length === 0 && (
            <div className="px-3 py-2 text-xs text-gray-600">Sem opções</div>
          )}
          {options.map((opt) => (
            <label key={opt} className="flex items-center gap-2.5 px-3 py-1.5 cursor-pointer hover:bg-[#21262d] text-sm text-gray-300 select-none">
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => toggle(opt)}
                className="accent-blue-500 w-3.5 h-3.5 shrink-0"
              />
              {renderLabel ? renderLabel(opt) : opt}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}


// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const lotes = useLotesStore((s) => s.lotes)

  // ── Filtros ──────────────────────────────────────────────────────────────────
  const [filterAno,    setFilterAno]    = useState<string[]>([])
  const [filterMes,    setFilterMes]    = useState<string[]>([])
  const [filterRegiao, setFilterRegiao] = useState<string[]>([])

  const anosOptions = useMemo(() =>
    [...new Set(lotes.map((l) => l.mesRef.split('-')[0]).filter(Boolean))].sort()
  , [lotes])

  const mesesOptions = useMemo(() => {
    const base = filterAno.length > 0
      ? lotes.filter((l) => filterAno.includes(l.mesRef.split('-')[0]))
      : lotes
    return [...new Set(base.map((l) => l.mesRef.split('-')[1]).filter(Boolean))].sort()
  }, [lotes, filterAno])

  const regioesOptions = useMemo(() =>
    [...new Set(lotes.map((l) => l.regiao))].sort()
  , [lotes])

  const filteredLotes = useMemo(() =>
    lotes.filter((l) => {
      if (filterAno.length > 0    && !filterAno.includes(l.mesRef.split('-')[0]))    return false
      if (filterMes.length > 0    && !filterMes.includes(l.mesRef.split('-')[1]))    return false
      if (filterRegiao.length > 0 && !filterRegiao.includes(l.regiao))              return false
      return true
    })
  , [lotes, filterAno, filterMes, filterRegiao])

  const hasFilter = filterAno.length > 0 || filterMes.length > 0 || filterRegiao.length > 0

  // ── Selectors (sobre os dados filtrados) ─────────────────────────────────────
  const kpis     = selectKpis(filteredLotes)
  const byTipo   = selectByTipo(filteredLotes)
  const byMes    = selectByMes(filteredLotes)
  const topP     = selectTopPeritos(filteredLotes, 10)
  const byRegiao = selectByRegiao(filteredLotes)
  const byFormato= selectByFormato(filteredLotes)
  const recent   = selectRecentLotes(filteredLotes)
  const insights = computeInsights(lotes) // insights sempre sobre o total

  // Janela fixa: últimos 13 meses a partir do mês atual (calculado uma vez)
  const last12Months = useMemo(() => {
    const now = new Date()
    return Array.from({ length: 13 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (12 - i), 1)
      const year = d.getFullYear()
      const month = d.getMonth() + 1
      const key = `${year}-${String(month).padStart(2, '0')}`
      const label = `${MONTHS_SHORT_PT[month - 1]}-${String(year).slice(-2)}`
      return { key, label }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (lotes.length === 0) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-gray-100">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Visão geral da gestão de lotes</p>
        </div>
        <EmptyState
          title="Nenhum lote cadastrado"
          description="Importe sua planilha Excel ou cadastre lotes manualmente para ver as métricas aqui."
          action={
            <div className="flex gap-3">
              <Link to="/lotes/importar"><Button variant="primary" size="lg"><Upload size={15} /> Importar XLS</Button></Link>
              <Link to="/lotes/novo"><Button variant="secondary" size="lg"><PlusCircle size={15} /> Novo Lote</Button></Link>
            </div>
          }
        />
      </div>
    )
  }

  // ── Alinha byMes à janela de 12 meses (0 para meses sem dados) ──────────────
  const byMesMap = new Map(byMes.map((m) => [m.key, m]))
  const trendMonths = last12Months.map(({ key, label }) => ({
    key,
    label,
    ...(byMesMap.get(key) ?? { lotes: 0, valor: 0, qtd: 0 }),
  }))

  // ── Trend: 4 datasets — 2 visíveis no gráfico, 2 invisíveis só para tooltip ──
  const trendData = {
    labels: trendMonths.map((m) => m.label),
    datasets: [
      // 0 — Barra visível (lotes) — aparece na legenda e no gráfico
      {
        type: 'bar' as const,
        label: 'Nº de Lotes',
        data: trendMonths.map((m) => m.lotes),
        backgroundColor: `${C.blue}88`,
        borderColor: C.blue,
        borderWidth: 1,
        borderRadius: 4,
        yAxisID: 'y',
        order: 2,
      },
      // 1 — Linha invisível (processos) — só tooltip, quadradinho teal
      {
        type: 'line' as const,
        label: 'Processos Analisados',
        data: trendMonths.map((m) => m.qtd),
        borderColor: C.teal,
        backgroundColor: 'transparent',
        borderWidth: 0,
        pointRadius: 0,
        pointHoverRadius: 0,
        tension: 0,
        fill: false,
        yAxisID: 'y3',
        order: 99,
      },
      // 2 — Linha visível (valor) — aparece na legenda e no gráfico
      {
        type: 'line' as const,
        label: 'Valor Investido (R$)',
        data: trendMonths.map((m) => m.valor),
        borderColor: C.purple,
        backgroundColor: `${C.purple}22`,
        borderWidth: 2.5,
        pointRadius: 3,
        tension: 0.35,
        fill: true,
        yAxisID: 'y2',
        order: 1,
      },
      // 3 — Linha invisível (valor médio/lote) — só tooltip, quadradinho laranja
      {
        type: 'line' as const,
        label: 'Valor Médio/Lote',
        data: trendMonths.map((m) => m.lotes > 0 ? m.valor / m.lotes : 0),
        borderColor: C.orange,
        backgroundColor: 'transparent',
        borderWidth: 0,
        pointRadius: 0,
        pointHoverRadius: 0,
        tension: 0,
        fill: false,
        yAxisID: 'y3',
        order: 99,
      },
    ],
  }

  const trendOptions = {
    ...CHART_BASE,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      // Legenda: exibe apenas os 2 datasets visíveis (índices 0 e 2)
      legend: {
        labels: {
          color: DARK.text,
          font: { family: DARK.font, size: 11 },
          boxWidth: 10,
          filter: (item: { datasetIndex: number }) => item.datasetIndex === 0 || item.datasetIndex === 2,
        },
      },
      tooltip: {
        callbacks: {
          // Remove o título (mês/ano) — já aparece no eixo X
          title: () => [] as string[],
          label: (ctx: { datasetIndex: number; dataIndex: number }) => {
            const m = trendMonths[ctx.dataIndex]
            if (!m) return ''
            switch (ctx.datasetIndex) {
              case 0: return ` Nº de Lotes: ${m.lotes}`
              case 1: return ` Processos Analisados: ${m.qtd.toLocaleString('pt-BR')}`
              case 2: return ` Valor Investido: ${formatCurrency(m.valor)}`
              case 3: return ` Valor Médio/Lote: ${formatCurrency(m.lotes > 0 ? m.valor / m.lotes : 0)}`
              default: return ''
            }
          },
        },
      },
    },
    scales: {
      x:  { grid: { color: DARK.grid }, ticks: { color: DARK.text } },
      y:  { grid: { color: DARK.grid }, ticks: { color: C.blue, stepSize: 1 }, title: { display: true, text: 'Lotes', color: C.blue, font: { size: 10 } } },
      y2: { position: 'right' as const, grid: { display: false }, ticks: { callback: fmtTickK, color: C.purple }, title: { display: true, text: 'Valor (R$)', color: C.purple, font: { size: 10 } } },
      y3: { display: false }, // eixo oculto para os datasets invisíveis
    },
  }

  // ── Top Peritos (bar valor + line qtd) ─────────────────────────────────────

  const peritoLabels = topP.map((p) => {
    const parts = p.name.split(' ')
    return parts.length >= 2 ? `${parts[0]} ${parts.at(-1)}` : p.name
  })

  // Dataset 0 → barra (qtd processos) | Dataset 1 → linha (valor)
  const peritoData = {
    labels: peritoLabels,
    datasets: [
      {
        type: 'bar' as const,
        label: 'Processos Analisados',
        data: topP.map((p) => p.qtd),
        backgroundColor: `${C.blue}88`,
        borderColor: C.blue,
        borderWidth: 1,
        borderRadius: 4,
        yAxisID: 'y',
        order: 2,
      },
      {
        type: 'line' as const,
        label: 'Valor Investido (R$)',
        data: topP.map((p) => p.valor),
        borderColor: C.purple,
        backgroundColor: `${C.purple}22`,
        borderWidth: 2.5,
        pointBackgroundColor: C.purple,
        pointRadius: 3,
        pointHoverRadius: 6,
        tension: 0.35,
        fill: true,
        yAxisID: 'y2',
        order: 1,
      },
    ],
  }
  const peritoOptions = {
    ...CHART_BASE,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      ...CHART_BASE.plugins,
      tooltip: {
        callbacks: {
          label: (ctx: { dataset: { label?: string }; parsed: { x: number; y: number } }) => {
            const v = ctx.parsed.y ?? ctx.parsed.x ?? 0
            return ctx.dataset.label?.includes('Valor')
              ? ` R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
              : ` ${v.toLocaleString('pt-BR')} processos`
          },
        },
      },
    },
    scales: {
      x:  { grid: { display: false }, ticks: { color: DARK.text, font: { size: 10 } } },
      y:  { grid: { color: DARK.grid }, ticks: { color: C.blue }, title: { display: true, text: 'Processos', color: C.blue, font: { size: 10 } } },
      y2: { position: 'right' as const, grid: { display: false }, ticks: { callback: fmtTickK, color: C.purple }, title: { display: true, text: 'Valor (R$)', color: C.purple, font: { size: 10 } } },
    },
  }

  // ── Donuts (processos analisados com percentual) ─────────────────────────────
  const donutTooltip = {
    callbacks: {
      label: (ctx: { label: string; parsed: number; dataset: { data: number[] } }) => {
        const total = ctx.dataset.data.reduce((a: number, b: number) => a + b, 0)
        const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : '0'
        return ` ${ctx.label}: ${ctx.parsed.toLocaleString('pt-BR')} proc. (${pct}%)`
      },
    },
  }
  const donutOpts = {
    ...CHART_BASE,
    cutout: '62%',
    plugins: { ...CHART_BASE.plugins, tooltip: donutTooltip },
  }

  const tipoData = {
    labels: Object.keys(byTipo),
    datasets: [{ data: Object.values(byTipo), backgroundColor: [`${C.blue}cc`, `${C.orange}cc`, `${C.green}cc`], borderColor: [C.blue, C.orange, C.green], borderWidth: 1.5, hoverOffset: 6 }],
  }
  const regiaoData = {
    labels: Object.keys(byRegiao),
    datasets: [{ data: Object.values(byRegiao), backgroundColor: [C.purple, C.teal, C.orange, C.red].map((c) => `${c}cc`), borderColor: [C.purple, C.teal, C.orange, C.red], borderWidth: 1.5, hoverOffset: 6 }],
  }
  const formatoData = {
    labels: Object.keys(byFormato),
    datasets: [{ data: Object.values(byFormato), backgroundColor: [`${C.teal}cc`, `${C.red}cc`], borderColor: [C.teal, C.red], borderWidth: 1.5, hoverOffset: 6 }],
  }

  // ── Histograma de Prazo ──────────────────────────────────────────────────────
  const histBins = buildHistData(filteredLotes)
  const histData = {
    labels: histBins.map((b) => b.label),
    datasets: [{
      label: 'Lotes',
      data: histBins.map((b) => b.count),
      backgroundColor: histBins.map((b) => `${b.color}cc`),
      borderColor: histBins.map((b) => b.color),
      borderWidth: 1.5,
      borderRadius: 5,
    }],
  }
  const histOptions = {
    ...CHART_BASE,
    plugins: {
      ...CHART_BASE.plugins,
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx: { parsed: { y: number } }) => ` ${ctx.parsed.y} lote${ctx.parsed.y !== 1 ? 's' : ''}` } },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: DARK.text } },
      y: { grid: { color: DARK.grid }, ticks: { color: DARK.text, stepSize: 5 }, beginAtZero: true },
    },
  }

  // ── Distribuição por Analista — dois gráficos separados (1ª e 2ª análise) ───
  const analistas1 = buildAnalistaArr(filteredLotes.filter((l) => l.analise === '1ª'))
  const analistas2 = buildAnalistaArr(filteredLotes.filter((l) => l.analise === '2ª'))
  const { data: analistaData1, options: analistaOpts1 } = makeAnalistaChart(analistas1, C.blue)
  const { data: analistaData2, options: analistaOpts2 } = makeAnalistaChart(analistas2, C.orange)

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-100">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Visão geral — {lotes.length} lotes cadastrados</p>
        </div>
        <div className="flex gap-2">
          <Link to="/lotes/importar"><Button variant="secondary" size="md"><Upload size={13} /> Importar XLS</Button></Link>
          <Link to="/lotes/novo"><Button variant="primary" size="md"><PlusCircle size={13} /> Novo Lote</Button></Link>
        </div>
      </div>

      {/* Ticker */}
      <InsightsTicker insights={insights} />

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap bg-[#161b22] border border-[#30363d] rounded-lg px-4 py-2.5">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider shrink-0">Filtrar por</span>
        <div className="w-px h-4 bg-[#30363d] shrink-0" />
        <MultiSelect
          options={anosOptions}
          selected={filterAno}
          onChange={setFilterAno}
          placeholder="Todos os anos"
        />
        <MultiSelect
          options={mesesOptions}
          selected={filterMes}
          onChange={setFilterMes}
          placeholder="Todos os meses"
          renderLabel={(m) => MES_LABELS[m] ?? m}
        />
        <MultiSelect
          options={regioesOptions}
          selected={filterRegiao}
          onChange={setFilterRegiao}
          placeholder="Todas as regiões"
        />
        {hasFilter && (
          <>
            <button
              onClick={() => { setFilterAno([]); setFilterMes([]); setFilterRegiao([]) }}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-200 transition-colors ml-1"
            >
              <X size={12} /> Limpar
            </button>
            <span className="ml-auto text-xs text-blue-400 shrink-0">
              {filteredLotes.length} de {lotes.length} lote{lotes.length !== 1 ? 's' : ''}
            </span>
          </>
        )}
      </div>

      {/* Aviso de filtro sem resultado */}
      {hasFilter && filteredLotes.length === 0 && (
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3 text-sm text-amber-300">
          <AlertTriangle size={14} className="shrink-0" />
          Nenhum lote encontrado para os filtros selecionados.
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard
          label="Total de Processos"
          value={formatCompactNum(kpis.qtdTotal)}
          sub="analisados"
          color="blue"
          icon={FileText}
        />
        <KpiCard
          label="Total de Sentenças"
          value={formatCompactNum(kpis.totalSentencas)}
          sub={`${kpis.total} lote${kpis.total !== 1 ? 's' : ''}`}
          color="green"
          icon={Scale}
        />
        <KpiCard
          label="Média por Lote"
          value={kpis.mediaPorLote.toLocaleString('pt-BR')}
          sub="processos/lote"
          color="orange"
          icon={TrendingUp}
        />
        <KpiCard
          label="Tempo Médio"
          value={`${kpis.diasMedia.toFixed(1).replace('.', ',')} dias`}
          sub="processamento"
          color="purple"
          icon={Clock}
        />
        <KpiCard
          label="Peritos Ativos"
          value={kpis.peritos}
          sub="profissionais"
          color="teal"
          icon={Users}
        />
        <KpiCard
          label="Regiões"
          value={kpis.regioes}
          sub="tribunais"
          color="red"
          icon={Building2}
        />
      </div>

      {/* Row 1 — Tendência mensal */}
      <ChartCard title="Volume Mensal de Lotes e Valor Investido" className="min-h-[280px]">
        <Line data={trendData as Parameters<typeof Line>[0]['data']} options={trendOptions as Parameters<typeof Line>[0]['options']} />
      </ChartCard>

      {/* Row 2 — 3 Donuts em linha (processos analisados) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
        <ChartCard title="Distribuição por Tipo" className="min-h-[220px]">
          <Doughnut data={tipoData} options={donutOpts} />
        </ChartCard>
        <ChartCard title="Distribuição por Região" className="min-h-[220px]">
          <Doughnut data={regiaoData} options={donutOpts} />
        </ChartCard>
        <ChartCard title="Distribuição por Formato" className="min-h-[220px]">
          <Doughnut data={formatoData} options={donutOpts} />
        </ChartCard>
      </div>

      {/* Row 3 — Top Peritos (largura total) */}
      <ChartCard
        title="Top 10 Peritos — Valor Investido × Processos Analisados"
        subtitle="Barras = qtd de processos · Linha = valor (R$)"
        className="min-h-[320px]"
      >
        <Chart type='bar' data={peritoData} options={peritoOptions as Parameters<typeof Chart>[0]['options']} />
      </ChartCard>

      {/* Row 3 — Histograma de Prazo */}
      <ChartCard title="Distribuição do Prazo de Entrega" subtitle="Qtd de lotes por faixa de dias" className="min-h-[260px]">
        <Bar data={histData} options={histOptions as Parameters<typeof Bar>[0]['options']} />
      </ChartCard>

      {/* Row 4 — Distribuição por Analista: 1ª e 2ª análise lado a lado */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-stretch">
        <ChartCard
          title="Analistas — 1ª Análise"
          subtitle="Barras = lotes · Linha = valor investido"
          className="min-h-[260px]"
        >
          {analistas1.length > 0
            ? <Chart type='bar' data={analistaData1} options={analistaOpts1 as Parameters<typeof Chart>[0]['options']} />
            : <div className="flex items-center justify-center h-full text-sm text-gray-600">Nenhum dado para 1ª análise</div>
          }
        </ChartCard>
        <ChartCard
          title="Analistas — 2ª Análise"
          subtitle="Barras = lotes · Linha = valor investido"
          className="min-h-[260px]"
        >
          {analistas2.length > 0
            ? <Chart type='bar' data={analistaData2} options={analistaOpts2 as Parameters<typeof Chart>[0]['options']} />
            : <div className="flex items-center justify-center h-full text-sm text-gray-600">Nenhum dado para 2ª análise</div>
          }
        </ChartCard>
      </div>

      {/* Lotes Recentes */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-300">Lotes Recentes</h2>
          <Link to="/lotes" className="text-xs text-blue-400 hover:text-blue-300">Ver todos →</Link>
        </div>
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#30363d]">
                {['Mês Ref.', 'Região', 'Perito', 'Tipo', 'Qtd Anal.', 'Valor Investido', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] uppercase tracking-wide text-gray-600 font-semibold bg-[#1c2333]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent.map((l) => (
                <tr key={l.id} className="border-b border-[#30363d] last:border-0 hover:bg-[#1c2333] transition-colors">
                  <td className="px-4 py-2.5 text-gray-400">{formatMonthYear(l.mesRef)}</td>
                  <td className="px-4 py-2.5 text-gray-400">{l.regiao}</td>
                  <td className="px-4 py-2.5 text-gray-200 font-medium truncate max-w-[180px]">{l.perito}</td>
                  <td className="px-4 py-2.5"><TipoBadge tipo={l.tipo} /></td>
                  <td className="px-4 py-2.5 text-right text-gray-400">{l.qtdAnalisada.toLocaleString('pt-BR')}</td>
                  <td className="px-4 py-2.5 text-right text-gray-200">{formatCurrency(l.valorDevido)}</td>
                  <td className="px-4 py-2.5"><PagoBadge pago={l.pago} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {recent.length === 0 && (
            <div className="py-8 text-center text-sm text-gray-600">Nenhum lote recente</div>
          )}
        </div>
      </div>
    </div>
  )
}
