import { useState, useMemo, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Search, PlusCircle, Upload, Download, X,
  ChevronUp, ChevronDown, Pencil, Trash2, ChevronsUpDown,
} from 'lucide-react'
import { useLotesStore } from '../../store/lotesStore'
import { useToast } from '../../components/ui/Toast'
import { Button } from '../../components/ui/Button'
import { TipoBadge, FormatoBadge, PagoBadge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/EmptyState'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/Modal'
import { LoteForm } from './LoteForm'
import type { LoteFormData } from './LoteForm'
import { exportToXlsx } from '../../lib/excelUtils'
import { formatCurrency, formatDate, formatMonthYear } from '../../lib/utils'
import type { Lote } from '../../types'

const PAGE_SIZE = 20

type SortKey = keyof Lote
type SortDir = 'asc' | 'desc'

/** Retorna todos os valores pesquisáveis de um lote como string unificada */
function loteSearchable(l: Lote): string {
  return [
    l.perito,
    l.regiao,
    l.trt.replace('TRT_', 'TRT'),
    l.analista,
    l.tipo,
    l.formato,
    l.analise,
    String(l.lote),
    String(l.qtdAnalisada),
    String(l.qtdDias),
    String(l.valorDevido),
    l.envio,
    l.entrega,
    l.mesRef,
    l.pago ? 'pago sim' : 'pendente não',
  ].join(' ').toLowerCase()
}

export default function LotesPage() {
  const lotes       = useLotesStore((s) => s.lotes)
  const fetchLotes  = useLotesStore((s) => s.fetchLotes)
  const updateLote  = useLotesStore((s) => s.updateLote)
  const deleteLote  = useLotesStore((s) => s.deleteLote)
  const loading     = useLotesStore((s) => s.loading)
  const { success, error: toastError } = useToast()

  // Garante que os lotes estejam carregados ao entrar na página
  useEffect(() => { fetchLotes() }, [fetchLotes])

  const [query,        setQuery]        = useState('')
  const [filterMesRef, setFilterMesRef] = useState('')
  const [sortKey,      setSortKey]      = useState<SortKey>('envio')
  const [sortDir,      setSortDir]      = useState<SortDir>('desc')
  const [page,         setPage]         = useState(1)

  const [editLote,  setEditLote]  = useState<Lote | null>(null)
  const [deleteId,  setDeleteId]  = useState<string | null>(null)

  const handleSort = useCallback((key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
    setPage(1)
  }, [sortKey])

  /** Opções de mês para o filtro temporal (mais recente primeiro) */
  const mesRefOptions = useMemo(() => {
    const keys = [...new Set(
      lotes.map((l) => {
        const p = l.mesRef.split('-')
        return p.length >= 2 ? `${p[0]}-${p[1]}` : ''
      }).filter(Boolean)
    )].sort().reverse()
    return keys.map((k) => ({ key: k, label: formatMonthYear(`${k}-01`) }))
  }, [lotes])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return lotes.filter((l) => {
      if (filterMesRef && !l.mesRef.startsWith(filterMesRef)) return false
      if (q && !loteSearchable(l).includes(q)) return false
      return true
    })
  }, [lotes, query, filterMesRef])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const va = a[sortKey]
      const vb = b[sortKey]
      if (va === undefined || vb === undefined) return 0
      const cmp = typeof va === 'string' ? va.localeCompare(String(vb)) : (Number(va) - Number(vb))
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  /** Soma do valor investido de todos os lotes filtrados (ignora paginação) */
  const totalValor = useMemo(
    () => sorted.reduce((sum, l) => sum + l.valorDevido, 0),
    [sorted],
  )

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const paginated  = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ChevronsUpDown size={11} className="opacity-30" />
    return sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />
  }

  const Th = ({ k, children }: { k: SortKey; children: React.ReactNode }) => (
    <th
      onClick={() => handleSort(k)}
      className="px-3 py-2.5 text-left text-[10px] uppercase tracking-wide text-gray-600 font-semibold bg-[#1c2333] whitespace-nowrap cursor-pointer hover:text-gray-300 select-none"
    >
      <span className="inline-flex items-center gap-1">{children}<SortIcon k={k} /></span>
    </th>
  )

  const handleUpdate = async (data: LoteFormData & { regiao: string; qtdDias: number }) => {
    if (!editLote) return
    await updateLote(editLote.id, data)
    success('Lote atualizado com sucesso!')
    setEditLote(null)
  }

  const handleDelete = async (id: string) => {
    await deleteLote(id)
    success('Lote excluído.')
    setDeleteId(null)
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-100">Lotes</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {lotes.length} lote(s) no total
            {(query || filterMesRef) && <> · <span className="text-blue-400">{filtered.length} resultado(s)</span></>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="md" onClick={() => exportToXlsx(sorted, 'lotes-filtrados.xlsx')}>
            <Download size={13} /> Exportar XLS
          </Button>
          <Link to="/lotes/importar"><Button variant="secondary" size="md"><Upload size={13} /> Importar</Button></Link>
          <Link to="/lotes/novo"><Button variant="primary" size="md"><PlusCircle size={13} /> Novo Lote</Button></Link>
        </div>
      </div>

      {/* Busca + filtro temporal */}
      <div className="flex items-center gap-2 mb-4">
        {/* Busca textual */}
        <div className="relative flex-1 min-w-0">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1) }}
            placeholder="Buscar por perito, analista, região, tipo…"
            className="w-full pl-8 pr-8 h-9 bg-[#161b22] border border-[#30363d] rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setPage(1) }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 transition-colors"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Filtro temporal MMM-AA */}
        <div className="relative shrink-0">
          <select
            value={filterMesRef}
            onChange={(e) => { setFilterMesRef(e.target.value); setPage(1) }}
            className="h-9 pl-3 pr-8 bg-[#161b22] border border-[#30363d] rounded-lg text-sm text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors appearance-none cursor-pointer min-w-[130px]"
          >
            <option value="">Todos os meses</option>
            {mesRefOptions.map(({ key, label }) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        </div>
      </div>

      {/* Tabela */}
      {lotes.length === 0 ? (
        <EmptyState
          title="Nenhum lote cadastrado"
          description="Importe sua planilha ou cadastre lotes manualmente."
          action={
            <div className="flex gap-3">
              <Link to="/lotes/importar"><Button variant="primary" size="lg"><Upload size={13} /> Importar XLS</Button></Link>
              <Link to="/lotes/novo"><Button variant="secondary" size="lg"><PlusCircle size={13} /> Novo Lote</Button></Link>
            </div>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Nenhum resultado"
          description={`Nenhum lote encontrado para "${query}".`}
          action={<Button variant="secondary" onClick={() => { setQuery(''); setPage(1) }}>Limpar busca</Button>}
        />
      ) : (
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#30363d]">
                  <Th k="mesRef">Mês Ref.</Th>
                  <Th k="regiao">Região</Th>
                  <Th k="perito">Perito</Th>
                  <Th k="lote">Lote</Th>
                  <Th k="analista">Analista</Th>
                  <Th k="tipo">Tipo</Th>
                  <Th k="formato">Formato</Th>
                  <Th k="qtdAnalisada">Qtd Anal.</Th>
                  <Th k="qtdDias">Dias</Th>
                  <Th k="valorDevido">Valor</Th>
                  <Th k="pago">Status</Th>
                  <Th k="qtdP">Qtd P</Th>
                  <th className="px-3 py-2.5 bg-[#1c2333] text-gray-600 text-[10px] uppercase tracking-wide">Ações</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((l) => (
                  <tr key={l.id} className="border-b border-[#30363d] last:border-0 hover:bg-[#1c2333] transition-colors">
                    <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{formatMonthYear(l.mesRef)}</td>
                    <td className="px-3 py-2.5 text-gray-400 whitespace-nowrap">{l.regiao}</td>
                    <td className="px-3 py-2.5 text-gray-200 font-medium whitespace-nowrap max-w-[160px] truncate" title={l.perito}>{l.perito}</td>
                    <td className="px-3 py-2.5 text-gray-500 text-center">{l.lote}</td>
                    <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{l.analista.split(' ')[0]}</td>
                    <td className="px-3 py-2.5"><TipoBadge tipo={l.tipo} /></td>
                    <td className="px-3 py-2.5"><FormatoBadge formato={l.formato} /></td>
                    <td className="px-3 py-2.5 text-right text-gray-400">{l.qtdAnalisada.toLocaleString('pt-BR')}</td>
                    <td className="px-3 py-2.5 text-center text-gray-500">{l.qtdDias}</td>
                    <td className="px-3 py-2.5 text-right text-gray-200 whitespace-nowrap">{formatCurrency(l.valorDevido)}</td>
                    <td className="px-3 py-2.5"><PagoBadge pago={l.pago} /></td>
                    <td className="px-3 py-2.5 text-center text-gray-500">{l.qtdP}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1 justify-center">
                        <Button variant="ghost" size="sm" onClick={() => setEditLote(l)} title="Editar">
                          <Pencil size={12} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteId(l.id)} title="Excluir">
                          <Trash2 size={12} className="text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[#444d56] bg-[#1c2333]">
                  {/* colSpan cobre: Mês Ref. · Região · Perito · Lote · Analista · Tipo · Formato · Qtd Anal. · Dias */}
                  <td className="px-3 py-2 text-[11px] text-gray-500 font-semibold uppercase tracking-wide" colSpan={9}>
                    Total — {sorted.length} lote{sorted.length !== 1 ? 's' : ''}
                  </td>
                  {/* Coluna Valor */}
                  <td className="px-3 py-2 text-right text-sm font-bold text-emerald-400 whitespace-nowrap">
                    {formatCurrency(totalValor)}
                  </td>
                  {/* Status · Qtd P · Ações */}
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Paginação */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#30363d]">
            <span className="text-xs text-gray-600">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} de {sorted.length}
            </span>
            <div className="flex gap-1">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(1)}>«</Button>
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>‹</Button>
              <span className="flex items-center px-3 text-xs text-gray-500">{page} / {totalPages}</span>
              <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>›</Button>
              <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage(totalPages)}>»</Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar */}
      <Modal open={!!editLote} onClose={() => setEditLote(null)} title="Editar Lote" size="lg">
        {editLote && (
          <LoteForm
            defaultValues={editLote}
            onSubmit={handleUpdate}
            onCancel={() => setEditLote(null)}
            submitLabel="Salvar alterações"
          />
        )}
      </Modal>

      {/* Confirm Excluir */}
      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && handleDelete(deleteId)}
        title="Excluir lote"
        message="Tem certeza que deseja excluir este lote? Esta ação não pode ser desfeita."
      />
    </div>
  )
}
