import { useEffect, useMemo, useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend,
  type TooltipItem,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import {
  DollarSign, TrendingUp, Clock, FileWarning,
  PlusCircle, Pencil, Trash2, FileText,
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
import { CobrancaForm, type CobrancaFormData } from './CobrancaForm'
import type { Cobranca } from '../../types/cobrancas'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend)

const DARK = { grid: '#D4DAD6', text: '#5A6A5E', font: "'Segoe UI', Arial, sans-serif" }
const C = { green: '#2D7A47', blue: '#2563EB', orange: '#d29922', purple: '#9B5CF6' }

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

function buildRegiaoData(cobrancas: Cobranca[]) {
  const map: Record<string, { comissao: number; lote: number }> = {}
  for (const c of cobrancas) {
    const key = c.regiao || 'Sem Região'
    if (!map[key]) map[key] = { comissao: 0, lote: 0 }
    if (c.tipo === 'Comissão') map[key].comissao += c.valor
    else                       map[key].lote     += c.valor
  }
  const sorted = Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
  return {
    labels:   sorted.map(([k]) => k),
    comissao: sorted.map(([, v]) => v.comissao),
    lote:     sorted.map(([, v]) => v.lote),
  }
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
  const [fPerito,   setFPerito]   = useState('')
  const [fRegiao,   setFRegiao]   = useState('')
  const [fMes,      setFMes]      = useState('')
  const [fTipo,     setFTipo]     = useState('')
  const [fRecebido, setFRecebido] = useState('')
  const [fNF,       setFNF]       = useState('')

  useEffect(() => { fetchAll() }, [fetchAll])

  const peritoNames = useMemo(
    () => selectPeritoNames(lotesPeritos, peritos, cobrancas),
    [lotesPeritos, peritos, cobrancas],
  )

  const filtered = useMemo(() => {
    return cobrancas.filter((c) => {
      if (fPerito   && c.perito !== fPerito) return false
      if (fRegiao   && c.regiao !== fRegiao) return false
      if (fMes      && (!c.mesRef || !c.mesRef.startsWith(fMes))) return false
      if (fTipo     && c.tipo !== fTipo) return false
      if (fRecebido === 'sim' && !c.recebido) return false
      if (fRecebido === 'nao' && c.recebido)  return false
      if (fNF && c.notaFiscal !== fNF) return false
      return true
    })
  }, [cobrancas, fPerito, fRegiao, fMes, fTipo, fRecebido, fNF])

  // KPIs (baseados em TODOS, não no filtrado)
  const totalCobrado  = cobrancas.reduce((s, c) => s + c.valor, 0)
  const totalRecebido = cobrancas.filter((c) => c.recebido).reduce((s, c) => s + c.valor, 0)
  const totalPendente = cobrancas.filter((c) => !c.recebido).reduce((s, c) => s + c.valor, 0)
  const nfPendente    = cobrancas.filter((c) => c.notaFiscal === 'Não Emitida').length
  const qtdRecebido    = cobrancas.filter((c) => c.recebido).length
  const qtdNaoRecebido = cobrancas.filter((c) => !c.recebido).length
  const taxaRecebimento = cobrancas.length > 0
    ? Math.round((qtdRecebido / cobrancas.length) * 100)
    : 0

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
      {
        label: 'Comissão',
        data: regiao.comissao,
        backgroundColor: `${C.green}99`,
        borderColor: C.green,
        borderWidth: 1,
        borderRadius: 4,
        yAxisID: 'y',
      },
      {
        label: 'Lote',
        data: regiao.lote,
        backgroundColor: `${C.blue}99`,
        borderColor: C.blue,
        borderWidth: 1,
        borderRadius: 4,
        yAxisID: 'y',
      },
      {
        type: 'line' as const,
        label: 'Total',
        data: regiao.comissao.map((v, i) => v + regiao.lote[i]),
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


  const uniqueRegioes = [...new Set(cobrancas.map((c) => c.regiao).filter(Boolean))].sort()

  async function handleSubmit(data: CobrancaFormData) {
    setSaving(true)
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

    // Persiste CPF no cadastro de peritos
    if (data.cpfPerito) await saveCpf(data.perito, data.cpfPerito)

    const err = editTarget
      ? await updateCobranca(editTarget.id, payload)
      : await addCobranca(payload)

    setSaving(false)
    if (err) { toastError(err); return }
    toastSuccess(editTarget ? 'Cobrança atualizada!' : 'Cobrança cadastrada!')
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

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Cobrado"        value={formatCurrency(totalCobrado)}  color="blue"   icon={DollarSign} />
        <KpiCard label="Total Recebido"       value={formatCurrency(totalRecebido)} color="green"  icon={TrendingUp}  sub={`${cobrancas.filter((c) => c.recebido).length} cobranças`} />
        <KpiCard label="Total Pendente"       value={formatCurrency(totalPendente)} color="red" icon={Clock}       sub={`${cobrancas.filter((c) => !c.recebido).length} cobranças`} />
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

      {/* Filters */}
      <div className="bg-white border border-[#D4DAD6] rounded-lg px-4 py-3">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Select value={fPerito} onChange={(e) => setFPerito(e.target.value)}>
            <option value="">Todos os peritos</option>
            {peritoNames.map((n) => <option key={n} value={n}>{n}</option>)}
          </Select>

          <Select value={fRegiao} onChange={(e) => setFRegiao(e.target.value)}>
            <option value="">Todas as regiões</option>
            {uniqueRegioes.map((r) => <option key={r} value={r}>{r}</option>)}
          </Select>

          <input
            type="month"
            value={fMes}
            onChange={(e) => setFMes(e.target.value)}
            className="bg-white border border-[#D4DAD6] rounded-md text-[#1A1A1A] text-sm h-8 px-3 focus:outline-none focus:border-[#1B4D2E] focus:ring-1 focus:ring-[#1B4D2E]/30 w-full"
            placeholder="Mês"
          />

          <Select value={fTipo} onChange={(e) => setFTipo(e.target.value)}>
            <option value="">Todos os tipos</option>
            <option value="Comissão">Comissão</option>
            <option value="Lote">Lote</option>
          </Select>

          <Select value={fRecebido} onChange={(e) => setFRecebido(e.target.value)}>
            <option value="">Recebimento</option>
            <option value="sim">Recebido</option>
            <option value="nao">Pendente</option>
          </Select>

          <Select value={fNF} onChange={(e) => setFNF(e.target.value)}>
            <option value="">Nota fiscal</option>
            <option value="Emitida">Emitida</option>
            <option value="Não Emitida">Não Emitida</option>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#D4DAD6] rounded-lg overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-[#5A6A5E]">Carregando…</div>
        ) : filtered.length === 0 ? (
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
                <tr className="border-b border-[#D4DAD6] bg-[#F4F6F4]">
                  {['Perito', 'CPF', 'Região', 'Mês Ref.', 'Envio', 'Valor', 'Tipo', 'Recebido', 'NF', 'PDF', ''].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-[#5A6A5E] uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F2F0]">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-[#F4F6F4]/60 transition-colors">
                    <td className="px-4 py-3 font-medium text-[#1A1A1A] whitespace-nowrap">{c.perito}</td>
                    <td className="px-4 py-3 text-[#5A6A5E] font-mono text-xs">{c.cpfPerito ?? '—'}</td>
                    <td className="px-4 py-3 text-[#5A6A5E] whitespace-nowrap">{c.regiao || '—'}</td>
                    <td className="px-4 py-3 text-[#5A6A5E] whitespace-nowrap">{mesRefLabel(c.mesRef)}</td>
                    <td className="px-4 py-3 text-[#5A6A5E] whitespace-nowrap">{formatDate(c.dataEnvio ?? '')}</td>
                    <td className="px-4 py-3 font-semibold text-[#1B4D2E] whitespace-nowrap">{formatCurrency(c.valor)}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                        c.tipo === 'Comissão'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200',
                      )}>
                        {c.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                        c.recebido
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200',
                      )}>
                        {c.recebido ? 'Sim' : 'Não'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                        c.notaFiscal === 'Emitida'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-red-50 text-red-700 border border-red-200',
                      )}>
                        {c.notaFiscal === 'Emitida' ? 'Emitida' : 'Pendente'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {c.linkPdf ? (
                        <a
                          href={c.linkPdf}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Abrir PDF"
                          className="text-[#1B4D2E] hover:text-[#2D7A47] transition-colors"
                        >
                          <FileText size={15} />
                        </a>
                      ) : (
                        <span className="text-[#D4DAD6]"><FileText size={15} /></span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(c)}
                          className="p-1 rounded text-[#5A6A5E] hover:text-[#1B4D2E] hover:bg-[#1B4D2E]/5 transition-colors"
                          title="Editar"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => setDeleteId(c.id)}
                          className="p-1 rounded text-[#5A6A5E] hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="px-4 py-2 border-t border-[#D4DAD6] bg-[#F4F6F4] text-xs text-[#5A6A5E]">
            {filtered.length} cobrança{filtered.length !== 1 ? 's' : ''}
            {filtered.length !== cobrancas.length && ` (de ${cobrancas.length} no total)`}
            {' · '}Total filtrado: <strong className="text-[#1B4D2E]">{formatCurrency(filtered.reduce((s, c) => s + c.valor, 0))}</strong>
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
