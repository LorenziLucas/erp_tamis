import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Search, PlusCircle, Upload, Download, X,
  ChevronUp, ChevronDown, Pencil, Trash2, ChevronsUpDown,
  FileSpreadsheet, AlertCircle, CheckCircle, ArrowLeft,
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
import { exportToXlsx, parseXlsx, importXlsx, downloadTemplate } from '../../lib/excelUtils'
import type { ImportPreview } from '../../lib/excelUtils'
import { formatCurrency, formatDate, formatMonthYear, cn } from '../../lib/utils'
import type { Lote } from '../../types'

const PAGE_SIZE = 20

type SortKey = keyof Lote
type SortDir = 'asc' | 'desc'
type ImportStage = 'idle' | 'preview' | 'importing' | 'done'

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
  const addLotes    = useLotesStore((s) => s.addLotes)
  const loading     = useLotesStore((s) => s.loading)
  const { success, error: toastError } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => { fetchLotes() }, [fetchLotes])

  const [query,         setQuery]         = useState('')
  const [filterDe,      setFilterDe]      = useState('')
  const [filterAte,     setFilterAte]     = useState('')
  const [filterAnalise, setFilterAnalise] = useState<'' | '1ª' | '2ª'>('')
  const [sortKey,      setSortKey]      = useState<SortKey>('envio')
  const [sortDir,      setSortDir]      = useState<SortDir>('desc')
  const [page,         setPage]         = useState(1)

  const [editLote,  setEditLote]  = useState<Lote | null>(null)
  const [deleteId,  setDeleteId]  = useState<string | null>(null)

  // ── Importar XLS (modal) ─────────────────────────────────────────────
  const [showImportar, setShowImportar] = useState(false)
  const importInputRef = useRef<HTMLInputElement>(null)

  const [importStage,     setImportStage]     = useState<ImportStage>('idle')
  const [dragging,        setDragging]        = useState(false)
  const [importFile,      setImportFile]      = useState<File | null>(null)
  const [importPreview,   setImportPreview]   = useState<ImportPreview | null>(null)
  const [imported,        setImported]        = useState(0)
  const [duplicates,      setDuplicates]      = useState(0)
  const [importErrors,    setImportErrors]    = useState<string[]>([])

  useEffect(() => {
    if (searchParams.get('importar') === '1') {
      setShowImportar(true)
      setSearchParams((p) => { p.delete('importar'); return p }, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const processFile = useCallback(async (f: File) => {
    setImportFile(f)
    const p = await parseXlsx(f)
    setImportPreview(p)
    setImportStage('preview')
  }, [])

  const handleImportDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f && (f.name.endsWith('.xlsx') || f.name.endsWith('.xls'))) processFile(f)
    else toastError('Por favor, selecione um arquivo .xlsx ou .xls')
  }, [processFile, toastError])

  const handleImportFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) processFile(f)
  }, [processFile])

  const handleImport = async () => {
    if (!importFile) return
    setImportStage('importing')
    const result = await importXlsx(importFile, lotes)
    const { imported: importedCount, errors: saveErrors } = await addLotes(result.lotes)
    const allErrors = [...result.errors, ...saveErrors]
    setImported(importedCount)
    setDuplicates(result.duplicates)
    setImportErrors(allErrors)
    setImportStage('done')
    if (importedCount > 0) {
      const dupMsg = result.duplicates > 0 ? ` (${result.duplicates} duplicata(s) ignorada(s))` : ''
      success(`${importedCount} lote(s) importado(s) com sucesso!${dupMsg}`)
    } else if (result.duplicates > 0) {
      toastError(`Todos os ${result.duplicates} registro(s) já existem na base — nenhum importado.`)
    } else {
      toastError('Nenhum lote pôde ser importado. Verifique os erros abaixo.')
    }
  }

  const resetImport = () => {
    setImportStage('idle')
    setImportFile(null)
    setImportPreview(null)
    setImported(0)
    setDuplicates(0)
    setImportErrors([])
    if (importInputRef.current) importInputRef.current.value = ''
  }

  const closeImportar = () => {
    setShowImportar(false)
    resetImport()
  }

  const handleSort = useCallback((key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
    setPage(1)
  }, [sortKey])

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
      const mesRefYm = l.mesRef.slice(0, 7)
      if (filterDe      && mesRefYm < filterDe)          return false
      if (filterAte      && mesRefYm > filterAte)        return false
      if (filterAnalise && l.analise !== filterAnalise)  return false
      if (q && !loteSearchable(l).includes(q)) return false
      return true
    })
  }, [lotes, query, filterDe, filterAte, filterAnalise])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const va = a[sortKey]
      const vb = b[sortKey]
      if (va === undefined || vb === undefined) return 0
      const cmp = typeof va === 'string' ? va.localeCompare(String(vb)) : (Number(va) - Number(vb))
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  const totalValor = useMemo(
    () => sorted.reduce((sum, l) => sum + l.valorDevido, 0),
    [sorted],
  )

  const totalQtdAnalisada = useMemo(
    () => sorted.reduce((sum, l) => sum + l.qtdAnalisada, 0),
    [sorted],
  )

  const totalQtdP = useMemo(
    () => sorted.reduce((sum, l) => sum + l.qtdP, 0),
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
      className="px-3 py-2.5 text-left text-[10px] uppercase tracking-wide text-[#5A6A5E] font-semibold bg-[#F0F2F0] whitespace-nowrap cursor-pointer hover:text-[#1A1A1A] select-none"
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
          <h1 className="text-xl font-bold text-[#1A1A1A]">Lotes</h1>
          <p className="text-sm text-[#5A6A5E] mt-0.5">
            {lotes.length} lote(s) no total
            {(query || filterDe || filterAte || filterAnalise) && <> · <span className="text-[#2D7A47]">{filtered.length} resultado(s)</span></>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="md" onClick={() => exportToXlsx(sorted, 'lotes-filtrados.xlsx')}>
            <Download size={13} /> Exportar XLS
          </Button>
          <Button variant="secondary" size="md" onClick={() => setShowImportar(true)}><Upload size={13} /> Importar</Button>
          <Link to="/lotes/novo"><Button variant="primary" size="md"><PlusCircle size={13} /> Novo Lote</Button></Link>
        </div>
      </div>

      {/* Busca + filtro temporal */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-0">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9AA4A0] pointer-events-none" />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1) }}
            placeholder="Buscar por perito, analista, região, tipo…"
            className="w-full pl-8 pr-8 h-9 bg-white border border-[#D4DAD6] rounded-lg text-sm text-[#1A1A1A] placeholder-[#9AA4A0] focus:outline-none focus:border-[#1B4D2E] focus:ring-1 focus:ring-[#1B4D2E]/30 transition-colors"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setPage(1) }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9AA4A0] hover:text-[#5A6A5E] transition-colors"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="relative shrink-0">
          <select
            value={filterDe}
            onChange={(e) => { setFilterDe(e.target.value); setPage(1) }}
            className="h-9 pl-3 pr-8 bg-white border border-[#D4DAD6] rounded-lg text-sm text-[#5A6A5E] focus:outline-none focus:border-[#1B4D2E] focus:ring-1 focus:ring-[#1B4D2E]/30 transition-colors appearance-none cursor-pointer min-w-[130px]"
          >
            <option value="">De (mês)</option>
            {mesRefOptions.map(({ key, label }) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9AA4A0] pointer-events-none" />
        </div>

        <span className="text-xs text-[#9AA4A0] shrink-0">até</span>

        <div className="relative shrink-0">
          <select
            value={filterAte}
            onChange={(e) => { setFilterAte(e.target.value); setPage(1) }}
            className="h-9 pl-3 pr-8 bg-white border border-[#D4DAD6] rounded-lg text-sm text-[#5A6A5E] focus:outline-none focus:border-[#1B4D2E] focus:ring-1 focus:ring-[#1B4D2E]/30 transition-colors appearance-none cursor-pointer min-w-[130px]"
          >
            <option value="">Até (mês)</option>
            {mesRefOptions.map(({ key, label }) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9AA4A0] pointer-events-none" />
        </div>

        {(filterDe || filterAte) && (
          <button
            onClick={() => { setFilterDe(''); setFilterAte(''); setPage(1) }}
            className="flex items-center gap-1 h-9 px-2.5 text-xs text-[#5A6A5E] hover:text-[#1A1A1A] border border-[#D4DAD6] rounded-lg bg-white transition-colors shrink-0"
            title="Limpar intervalo"
          >
            <X size={12} /> Limpar
          </button>
        )}

        <div className="flex items-center gap-1 h-9 p-1 bg-white border border-[#D4DAD6] rounded-lg shrink-0">
          {([
            { value: '', label: 'Todas' },
            { value: '1ª', label: '1ª análise' },
            { value: '2ª', label: '2ª análise' },
          ] as const).map(({ value, label }) => (
            <button
              key={value}
              onClick={() => { setFilterAnalise(value); setPage(1) }}
              className={`h-7 px-2.5 text-xs rounded-md transition-colors ${
                filterAnalise === value
                  ? 'bg-[#1B4D2E] text-white'
                  : 'text-[#5A6A5E] hover:text-[#1A1A1A]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela */}
      {lotes.length === 0 ? (
        <EmptyState
          title="Nenhum lote cadastrado"
          description="Importe sua planilha ou cadastre lotes manualmente."
          action={
            <div className="flex gap-3">
              <Button variant="primary" size="lg" onClick={() => setShowImportar(true)}><Upload size={13} /> Importar XLS</Button>
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
        <div className="bg-white border border-[#D4DAD6] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#D4DAD6]">
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
                  <th className="px-3 py-2.5 bg-[#F0F2F0] text-[#5A6A5E] text-[10px] uppercase tracking-wide">Ações</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((l) => (
                  <tr key={l.id} className="border-b border-[#D4DAD6] last:border-0 hover:bg-[#F4F6F4] transition-colors">
                    <td className="px-3 py-2.5 text-[#5A6A5E] whitespace-nowrap">{formatMonthYear(l.mesRef)}</td>
                    <td className="px-3 py-2.5 text-[#5A6A5E] whitespace-nowrap">{l.regiao}</td>
                    <td className="px-3 py-2.5 text-[#1A1A1A] font-medium whitespace-nowrap max-w-[160px] truncate" title={l.perito}>{l.perito}</td>
                    <td className="px-3 py-2.5 text-[#5A6A5E] text-center">{l.lote}</td>
                    <td className="px-3 py-2.5 text-[#5A6A5E] whitespace-nowrap">{l.analista.split(' ')[0]}</td>
                    <td className="px-3 py-2.5"><TipoBadge tipo={l.tipo} /></td>
                    <td className="px-3 py-2.5"><FormatoBadge formato={l.formato} /></td>
                    <td className="px-3 py-2.5 text-right text-[#5A6A5E]">{l.qtdAnalisada.toLocaleString('pt-BR')}</td>
                    <td className="px-3 py-2.5 text-center text-[#5A6A5E]">{l.qtdDias}</td>
                    <td className="px-3 py-2.5 text-right text-[#1A1A1A] whitespace-nowrap">{formatCurrency(l.valorDevido)}</td>
                    <td className="px-3 py-2.5"><PagoBadge pago={l.pago} /></td>
                    <td className="px-3 py-2.5 text-center text-[#5A6A5E]">{l.qtdP}</td>
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
                <tr className="border-t-2 border-[#D4DAD6] bg-[#F0F2F0]">
                  <td className="px-3 py-2 text-[11px] text-[#5A6A5E] font-semibold uppercase tracking-wide" colSpan={7}>
                    Total — {sorted.length} lote{sorted.length !== 1 ? 's' : ''}
                  </td>
                  <td className="px-3 py-2 text-right text-xs font-bold text-emerald-600">
                    {totalQtdAnalisada.toLocaleString('pt-BR')}
                  </td>
                  <td className="px-3 py-2" />
                  <td className="px-3 py-2 text-right text-xs font-bold text-emerald-600 whitespace-nowrap">
                    {formatCurrency(totalValor)}
                  </td>
                  <td className="px-3 py-2" />
                  <td className="px-3 py-2 text-center text-xs font-bold text-emerald-600">
                    {totalQtdP.toLocaleString('pt-BR')}
                  </td>
                  <td className="px-3 py-2" />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Paginação */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#D4DAD6]">
            <span className="text-xs text-[#5A6A5E]">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} de {sorted.length}
            </span>
            <div className="flex gap-1">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(1)}>«</Button>
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>‹</Button>
              <span className="flex items-center px-3 text-xs text-[#5A6A5E]">{page} / {totalPages}</span>
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

      {/* Modal Importar XLS */}
      <Modal open={showImportar} onClose={closeImportar} title="Importar Planilha XLS" size="xl">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={closeImportar}><ArrowLeft size={14} /></Button>
          <div>
            <h1 className="text-xl font-bold text-[#1A1A1A]">Importar Planilha XLS</h1>
            <p className="text-sm text-[#5A6A5E] mt-0.5">Importe lotes em massa a partir do arquivo Excel de gestão</p>
          </div>
          <div className="ml-auto">
            <Button variant="secondary" size="md" onClick={downloadTemplate}>
              <Download size={13} /> Baixar Modelo .xlsx
            </Button>
          </div>
        </div>

        {/* Step 1: Drop zone */}
        {importStage === 'idle' && (
          <div
            onDrop={handleImportDrop}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onClick={() => importInputRef.current?.click()}
            className={cn(
              'border-2 border-dashed rounded-xl p-16 flex flex-col items-center justify-center text-center cursor-pointer transition-all',
              dragging
                ? 'border-[#1B4D2E] bg-[#1B4D2E]/5'
                : 'border-[#D4DAD6] hover:border-[#1B4D2E]/50 hover:bg-[#F0F4F0]'
            )}
          >
            <input
              ref={importInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImportFileInput}
              className="hidden"
            />
            <div className={cn(
              'w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors',
              dragging ? 'bg-[#1B4D2E]/15' : 'bg-[#EEF1EE]'
            )}>
              <Upload size={28} className={dragging ? 'text-[#1B4D2E]' : 'text-[#5A6A5E]'} />
            </div>
            <h3 className="text-base font-semibold text-[#1A1A1A] mb-1">
              {dragging ? 'Solte o arquivo aqui' : 'Arraste o arquivo Excel'}
            </h3>
            <p className="text-sm text-[#5A6A5E] mb-4">ou clique para selecionar — .xlsx, .xls</p>
            <div className="text-xs text-[#7A8A7E] bg-[#EEF1EE] rounded-lg px-4 py-2 max-w-sm">
              Colunas esperadas: REGIÃO, PERITO, LOTE, ANALISTA, QTD ANALISADA, ANÁLISE, TIPO, FORMATO, ENVIO, ENTREGA, MÊS REF., VALOR DEVIDO, PAGO…
            </div>
          </div>
        )}

        {/* Step 2: Preview */}
        {(importStage === 'preview' || importStage === 'importing') && importPreview && (
          <div className="space-y-4">
            {/* File info */}
            <div className="flex items-center gap-3 bg-white border border-[#D4DAD6] rounded-lg px-4 py-3">
              <FileSpreadsheet size={20} className="text-emerald-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[#1A1A1A] truncate">{importFile?.name}</div>
                <div className="text-xs text-[#5A6A5E]">{(importFile?.size ?? 0 / 1024).toFixed(0)} KB</div>
              </div>
              <Button variant="ghost" size="sm" onClick={resetImport}><X size={13} /></Button>
            </div>

            {/* Stats */}
            <div className="flex gap-3 flex-wrap">
              <div className={`flex items-center gap-2 rounded-lg px-3 py-2 border ${
                importPreview.total === 0
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-[#F4F6F4] border-[#D4DAD6]'
              }`}>
                {importPreview.total === 0
                  ? <AlertCircle size={14} className="text-amber-600" />
                  : <CheckCircle size={14} className="text-emerald-600" />}
                <span className={`text-sm ${importPreview.total === 0 ? 'text-amber-700' : 'text-[#1A1A1A]'}`}>
                  {importPreview.total === 0 ? 'Nenhum registro encontrado' : `${importPreview.total} registros detectados`}
                </span>
              </div>
              {importPreview.errors.length > 0 && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertCircle size={14} className="text-red-600" />
                  <span className="text-sm text-red-600">{importPreview.errors.length} erro(s) de estrutura</span>
                </div>
              )}
            </div>

            {/* Errors */}
            {importPreview.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-red-600 mb-2">Avisos estruturais</h4>
                <ul className="space-y-1">
                  {importPreview.errors.map((e, i) => (
                    <li key={i} className="text-xs text-red-500 flex gap-2">
                      <span className="text-red-400">•</span> {e}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Preview table */}
            <div>
              <h3 className="text-sm font-semibold text-[#1A1A1A] mb-2">Pré-visualização (primeiras 5 linhas)</h3>
              <div className="bg-white border border-[#D4DAD6] rounded-lg overflow-x-auto">
                <table className="text-xs w-full">
                  <thead>
                    <tr className="border-b border-[#D4DAD6]">
                      {importPreview.headers.map((h) => (
                        <th key={h} className="px-3 py-2 text-left text-[10px] uppercase tracking-wide text-[#5A6A5E] font-semibold bg-[#F0F2F0] whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {importPreview.rows.map((row, i) => (
                      <tr key={i} className="border-b border-[#D4DAD6] last:border-0 hover:bg-[#F4F6F4]">
                        {importPreview.headers.map((h) => (
                          <td key={h} className="px-3 py-2 text-[#5A6A5E] whitespace-nowrap max-w-[120px] truncate">
                            {String(row[h] ?? '—')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={resetImport}>Cancelar</Button>
              <Button
                variant="primary"
                size="lg"
                onClick={handleImport}
                disabled={importStage === 'importing' || importPreview.total === 0}
              >
                {importStage === 'importing' ? (
                  <>
                    <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Importando…
                  </>
                ) : (
                  <><Upload size={14} /> Importar {importPreview.total} registro(s)</>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Done */}
        {importStage === 'done' && (
          <div className="bg-white border border-[#D4DAD6] rounded-xl p-10 flex flex-col items-center text-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${imported > 0 ? 'bg-emerald-50' : 'bg-amber-50'}`}>
              <CheckCircle size={32} className={imported > 0 ? 'text-emerald-600' : 'text-amber-600'} />
            </div>
            <h2 className="text-xl font-bold text-[#1A1A1A] mb-1">Importação concluída</h2>
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {imported > 0 && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-full px-3 py-1">
                  <CheckCircle size={11} /> {imported} importado{imported !== 1 ? 's' : ''}
                </span>
              )}
              {duplicates > 0 && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-amber-100 border border-amber-200 text-amber-700 rounded-full px-3 py-1">
                  ⊘ {duplicates} duplicata{duplicates !== 1 ? 's' : ''} ignorada{duplicates !== 1 ? 's' : ''}
                </span>
              )}
              {importErrors.length > 0 && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-red-100 border border-red-200 text-red-600 rounded-full px-3 py-1">
                  <AlertCircle size={11} /> {importErrors.length} erro{importErrors.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {importErrors.length > 0 && (
              <div className="w-full bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
                <h4 className="text-sm font-semibold text-red-600 mb-2">Erros durante a importação</h4>
                <ul className="space-y-1 max-h-32 overflow-y-auto">
                  {importErrors.map((e, i) => (
                    <li key={i} className="text-xs text-red-500">• {e}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="secondary" onClick={resetImport}>Importar outro arquivo</Button>
              <Button variant="primary" onClick={closeImportar}>Ver lotes importados</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
