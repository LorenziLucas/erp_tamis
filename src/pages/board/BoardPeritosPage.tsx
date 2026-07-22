import { useEffect, useMemo, useState } from 'react'
import { Search, ChevronDown, ChevronRight as ArrowRight, X, ArrowRightCircle, Plus, Trash2, Pencil, FileSpreadsheet, FileText, Clock, TrendingUp } from 'lucide-react'
import { useBoardPeritosStore } from '../../store/boardPeritosStore'
import { useBoardLotesStore } from '../../store/boardLotesStore'
import { useAnalistasStore } from '../../store/analistasStore'
import { useBoardComentariosStore } from '../../store/boardComentariosStore'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../components/ui/Toast'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input, Select, FormField, Textarea } from '../../components/ui/Input'
import { KpiCard } from '../../components/ui/Card'
import { BOARD_STATUS, TIPO_OPTIONS, FORMATO_OPTIONS } from '../../types/board'
import type { BoardPerito, BoardStatus, BoardLote, BoardComentario } from '../../types/board'
import { TRT_OPTIONS } from '../../types'
import { cn } from '../../lib/utils'
import VisaoPorMes from './VisaoPorMes'

const STATUS_COLORS: Record<BoardStatus, string> = {
  nao_ativo:    '#9AA4A0',
  ativo:        '#1B4D2E',
  analise_1:    '#534AB7',
  analise_2:    '#D85A30',
  padronizacao: '#185FA5',
  entrega:      '#1D9E75',
}

export function regionBadgeClasses(regiao: string): string {
  const token = regiao.trim().split(/\s+/)[0] ?? regiao
  if (token === 'TRT4') return 'bg-[#EAF3ED] text-[#1B4D2E]'
  if (token === 'TRT6') return 'bg-amber-50 text-amber-700'
  if (token === 'TRT1') return 'bg-violet-50 text-violet-700'
  if (token === 'TRT12') return 'bg-[#E6F1FB] text-[#0C447C]'
  return 'bg-[#F4F6F4] text-[#5A6A5E]'
}

function initials(nome: string): string {
  const parts = nome.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function formatMesAno(mesRef: string | null): string {
  if (!mesRef) return '—'
  const [ano, mes] = mesRef.split('-')
  return `${mes}/${ano}`
}

function initialsFromEmail(email: string | null): string {
  if (!email) return '?'
  const local = email.split('@')[0].replace(/[._-]+/g, ' ')
  return initials(local)
}

function resolveAutorNome(autorEmail: string | null, analistas: { nome: string; email: string | null }[]): string | null {
  if (!autorEmail) return null
  const email = autorEmail.trim().toLowerCase()
  const match = analistas.find((a) => a.email?.trim().toLowerCase() === email)
  return match ? match.nome : null
}

function formatDataHora(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function renderTextoComMencoes(texto: string) {
  return texto.split(/(@\w+)/g).map((parte, i) =>
    /^@\w+$/.test(parte)
      ? <span key={i} className="text-[#1B4D2E] font-semibold">{parte}</span>
      : <span key={i}>{parte}</span>,
  )
}

// ── Progresso do checklist ────────────────────────────────────────────────────

function useChecklistProgress(boardPeritoId: string, mesAlvo: string | null = null) {
  const lotes = useBoardLotesStore((s) => s.lotesByPerito[boardPeritoId])
  const list = lotes ?? []
  const relevantes = mesAlvo ? list.filter((l) => l.mesRef?.slice(0, 7) === mesAlvo) : list
  const total = relevantes.length
  const entregue = relevantes.filter((l) => l.entregue).length
  return { entregue, total }
}

// ── Barra de progresso ───────────────────────────────────────────────────────────

export function ProgressBar({ entregue, total }: { entregue: number; total: number }) {
  const pct = total > 0 ? Math.min(100, (entregue / total) * 100) : 0
  return (
    <div className="w-24 h-1.5 bg-[#EEF1EE] rounded-full overflow-hidden shrink-0">
      <div className="h-full bg-[#1B4D2E] rounded-full transition-all" style={{ width: `${pct}%` }} />
    </div>
  )
}

// ── Linha de perito ──────────────────────────────────────────────────────────────

function PeritoRow({ perito, mesAlvo, onOpen }: { perito: BoardPerito; mesAlvo: string | null; onOpen: () => void }) {
  const { entregue, total } = useChecklistProgress(perito.id, mesAlvo)
  const analistasVinculados = useBoardPeritosStore((s) => s.analistasByPerito[perito.id])
  const analistasLabel = analistasVinculados && analistasVinculados.length > 0
    ? analistasVinculados.map((a) => a.nome.split(' ')[0]).join(', ')
    : ''

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
      <span className="text-xs text-[#5A6A5E] w-32 shrink-0 truncate" title={analistasVinculados?.map((a) => a.nome).join(', ')}>
        {analistasLabel}
      </span>
      <div className="flex-1 flex items-center justify-end gap-2 min-w-0">
        <ProgressBar entregue={entregue} total={total} />
        <span className="text-xs font-medium text-[#5A6A5E] bg-[#F4F6F4] px-2 py-0.5 rounded-full shrink-0">
          {entregue}/{total} lotes
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
  mesAlvo,
  onToggle,
  onOpenPerito,
}: {
  status: BoardStatus
  label: string
  items: BoardPerito[]
  collapsed: boolean
  mesAlvo: string | null
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
            <PeritoRow key={p.id} perito={p} mesAlvo={mesAlvo} onOpen={() => onOpenPerito(p.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Checklist de lotes provisionados ──────────────────────────────────────────────

function ChecklistLotes({ boardPeritoId }: { boardPeritoId: string }) {
  const lotesRaw = useBoardLotesStore((s) => s.lotesByPerito[boardPeritoId])
  const { fetchLotes, addLote, updateLote, deleteLote } = useBoardLotesStore()
  const { success, error: toastError } = useToast()

  const [showAddForm, setShowAddForm] = useState(false)
  const [numeroStr, setNumeroStr] = useState('')
  const [mesAno, setMesAno] = useState('')
  const [tipo, setTipo] = useState('')
  const [formato, setFormato] = useState('')
  const [adding, setAdding] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNumero, setEditNumero] = useState('')
  const [editMesAno, setEditMesAno] = useState('')
  const [editTipo, setEditTipo] = useState('')
  const [editFormato, setEditFormato] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  useEffect(() => {
    fetchLotes(boardPeritoId)
  }, [boardPeritoId, fetchLotes])

  const lotes = useMemo(
    () => (lotesRaw ?? []).slice().sort((a, b) => a.ordem - b.ordem || a.numero - b.numero),
    [lotesRaw],
  )

  async function handleToggle(lote: BoardLote) {
    try {
      await updateLote(boardPeritoId, lote.id, { entregue: !lote.entregue })
      success('Checklist atualizado')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao atualizar item')
    }
  }

  async function handleDelete(lote: BoardLote) {
    if (!window.confirm(`Excluir o lote Nº${lote.numero} do checklist?`)) return
    try {
      await deleteLote(boardPeritoId, lote.id)
      success('Item removido do checklist')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao excluir item')
    }
  }

  function startEdit(lote: BoardLote) {
    setEditingId(lote.id)
    setEditNumero(String(lote.numero))
    setEditMesAno(lote.mesRef ? lote.mesRef.slice(0, 7) : '')
    setEditTipo(lote.tipo ?? '')
    setEditFormato(lote.formato ?? '')
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function handleSaveEdit(lote: BoardLote) {
    const numero = Number(editNumero)
    if (!editNumero || !Number.isFinite(numero) || !Number.isInteger(numero) || numero <= 0) {
      toastError('Informe um número de lote válido')
      return
    }
    setSavingEdit(true)
    try {
      await updateLote(boardPeritoId, lote.id, {
        numero,
        mesRef: editMesAno ? `${editMesAno}-01` : null,
        tipo:    editTipo || null,
        formato: editFormato || null,
      })
      success('Lote atualizado')
      setEditingId(null)
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao atualizar lote')
    } finally {
      setSavingEdit(false)
    }
  }

  async function handleAdd() {
    const numero = Number(numeroStr)
    if (!numeroStr || !Number.isFinite(numero) || !Number.isInteger(numero) || numero <= 0) {
      toastError('Informe um número de lote válido')
      return
    }
    const maxOrdem = lotes.reduce((max, l) => Math.max(max, l.ordem), -1)
    setAdding(true)
    try {
      await addLote(boardPeritoId, {
        numero,
        mesRef: mesAno ? `${mesAno}-01` : null,
        tipo:    tipo || null,
        formato: formato || null,
        ordem:   maxOrdem + 1,
      })
      success('Lote adicionado ao checklist')
      setNumeroStr('')
      setMesAno('')
      setTipo('')
      setFormato('')
      setShowAddForm(false)
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao adicionar lote')
    } finally {
      setAdding(false)
    }
  }

  function cancelAdd() {
    setNumeroStr('')
    setMesAno('')
    setTipo('')
    setFormato('')
    setShowAddForm(false)
  }

  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold text-[#5A6A5E] uppercase tracking-wide">Lotes provisionados</div>

      {lotes.length === 0 ? (
        <p className="text-xs text-[#9AA4A0]">Nenhum lote provisionado ainda.</p>
      ) : (
        <div className="border border-[#D4DAD6] rounded-lg divide-y divide-[#EEF1EE]">
          {lotes.map((lote) => (
            <div key={lote.id} className="px-3 py-2">
              {editingId === lote.id ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      min={1}
                      placeholder="Nº do lote"
                      value={editNumero}
                      onChange={(e) => setEditNumero(e.target.value)}
                    />
                    <Input
                      type="month"
                      value={editMesAno}
                      onChange={(e) => setEditMesAno(e.target.value)}
                    />
                    <Select value={editTipo} onChange={(e) => setEditTipo(e.target.value)}>
                      <option value="">Tipo — (opcional)</option>
                      {TIPO_OPTIONS.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </Select>
                    <Select value={editFormato} onChange={(e) => setEditFormato(e.target.value)}>
                      <option value="">Formato — (opcional)</option>
                      {FORMATO_OPTIONS.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="secondary" size="sm" onClick={cancelEdit}>Cancelar</Button>
                    <Button type="button" variant="primary" size="sm" disabled={savingEdit} onClick={() => handleSaveEdit(lote)}>
                      {savingEdit ? 'Salvando…' : 'Salvar'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={lote.entregue}
                    onChange={() => handleToggle(lote)}
                    className="w-4 h-4 accent-[#1B4D2E] shrink-0 cursor-pointer"
                  />
                  <span className={cn('flex-1 text-sm', lote.entregue ? 'text-[#5A6A5E] line-through' : 'text-[#1A1A1A]')}>
                    {lote.numero}º LOTE · {formatMesAno(lote.mesRef)} · {lote.tipo ?? '—'} - {lote.formato ?? '—'}
                  </span>
                  <button
                    onClick={() => startEdit(lote)}
                    className="p-1 rounded text-[#9AA4A0] hover:text-[#1B4D2E] hover:bg-[#1B4D2E]/10 transition-colors shrink-0"
                    title="Editar item"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => handleDelete(lote)}
                    className="p-1 rounded text-[#9AA4A0] hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                    title="Excluir item"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showAddForm ? (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              min={1}
              placeholder="Nº do lote"
              value={numeroStr}
              onChange={(e) => setNumeroStr(e.target.value)}
            />
            <Input
              type="month"
              value={mesAno}
              onChange={(e) => setMesAno(e.target.value)}
            />
            <Select value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="">Tipo — (opcional)</option>
              {TIPO_OPTIONS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
            <Select value={formato} onChange={(e) => setFormato(e.target.value)}>
              <option value="">Formato — (opcional)</option>
              {FORMATO_OPTIONS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </Select>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" className="flex-1" disabled={adding} onClick={handleAdd}>
              <Plus size={13} /> {adding ? 'Adicionando…' : 'Adicionar'}
            </Button>
            <Button type="button" variant="secondary" disabled={adding} onClick={cancelAdd}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="secondary" className="w-full" onClick={() => setShowAddForm(true)}>
          <Plus size={13} /> Incluir lote
        </Button>
      )}
    </div>
  )
}

// ── Planilha de controle de lotes (ícone compacto no cabeçalho) ────────────────────

function PlanilhaControleIcon({ perito }: { perito: BoardPerito }) {
  const { updateItem } = useBoardPeritosStore()
  const { success, error: toastError } = useToast()

  const hasUrl = !!perito.planilhaUrl

  const [menuOpen, setMenuOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [url, setUrl] = useState(perito.planilhaUrl ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setUrl(perito.planilhaUrl ?? '')
  }, [perito.id, perito.planilhaUrl])

  function startEdit() {
    setUrl(perito.planilhaUrl ?? '')
    setMenuOpen(false)
    setFormOpen(true)
  }

  function cancelForm() {
    setUrl(perito.planilhaUrl ?? '')
    setFormOpen(false)
  }

  async function handleSave() {
    const trimmed = url.trim()
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      toastError('Informe uma URL válida iniciando com http:// ou https://')
      return
    }
    setSaving(true)
    try {
      await updateItem(perito.id, { planilhaUrl: trimmed })
      success('Planilha vinculada')
      setFormOpen(false)
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao salvar planilha')
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove() {
    if (!window.confirm('Remover o link da planilha de controle de lotes?')) return
    try {
      await updateItem(perito.id, { planilhaUrl: null })
      success('Planilha removida')
      setMenuOpen(false)
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao remover planilha')
    }
  }

  return (
    <span className="relative inline-flex items-center gap-0.5">
      {hasUrl ? (
        <a
          href={perito.planilhaUrl ?? undefined}
          target="_blank"
          rel="noopener noreferrer"
          title="Abrir planilha de controle de lotes"
          className="p-0.5 rounded text-[#1D9E75] hover:bg-[#1D9E75]/10 transition-colors"
        >
          <FileSpreadsheet size={16} />
        </a>
      ) : (
        <button
          type="button"
          onClick={() => setFormOpen((v) => !v)}
          className="p-0.5 rounded text-[#9AA4A0] hover:text-[#1B4D2E] hover:bg-[#1B4D2E]/10 transition-colors"
          title="Vincular planilha de controle de lotes"
        >
          <FileSpreadsheet size={16} />
        </button>
      )}

      {hasUrl && (
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="p-0.5 rounded text-[#9AA4A0] hover:text-[#1B4D2E] hover:bg-[#1B4D2E]/10 transition-colors"
          title="Ações da planilha"
        >
          <ChevronDown size={11} />
        </button>
      )}

      {menuOpen && hasUrl && (
        <div className="absolute z-10 top-full left-0 mt-1 flex items-center gap-1 bg-white border border-[#D4DAD6] rounded-md shadow-md px-1.5 py-1">
          <button
            type="button"
            onClick={startEdit}
            className="p-1 rounded text-[#9AA4A0] hover:text-[#1B4D2E] hover:bg-[#1B4D2E]/10 transition-colors"
            title="Editar link"
          >
            <Pencil size={13} />
          </button>
          <button
            type="button"
            onClick={handleRemove}
            className="p-1 rounded text-[#9AA4A0] hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Remover link"
          >
            <Trash2 size={13} />
          </button>
        </div>
      )}

      {formOpen && (
        <div className="absolute z-10 top-full left-0 mt-1 flex items-center gap-1.5 bg-white border border-[#D4DAD6] rounded-md shadow-md p-2 w-64">
          <Input
            type="url"
            placeholder="https://…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1"
            autoFocus
          />
          <Button type="button" variant="primary" size="sm" disabled={saving} onClick={handleSave}>
            {saving ? '…' : 'Salvar'}
          </Button>
          <button
            type="button"
            onClick={cancelForm}
            className="p-1 rounded text-[#9AA4A0] hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
            title="Cancelar"
          >
            <X size={13} />
          </button>
        </div>
      )}
    </span>
  )
}

// ── Analistas vinculados (N:N) ───────────────────────────────────────────────────

function AnalistasVinculados({ boardPeritoId }: { boardPeritoId: string }) {
  const vinculados = useBoardPeritosStore((s) => s.analistasByPerito[boardPeritoId])
  const { fetchAnalistasDoPerito, addAnalista, removeAnalista } = useBoardPeritosStore()
  const analistasCadastrados = useAnalistasStore((s) => s.analistas)
  const { success, error: toastError } = useToast()

  const [novoAnalistaId, setNovoAnalistaId] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    fetchAnalistasDoPerito(boardPeritoId)
  }, [boardPeritoId, fetchAnalistasDoPerito])

  const lista = vinculados ?? []
  const disponiveis = analistasCadastrados.filter((a) => !lista.some((v) => v.id === a.id))

  async function handleAdd() {
    if (!novoAnalistaId) return
    setAdding(true)
    try {
      await addAnalista(boardPeritoId, novoAnalistaId)
      success('Analista vinculado')
      setNovoAnalistaId('')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao vincular analista')
    } finally {
      setAdding(false)
    }
  }

  async function handleRemove(analistaId: string) {
    try {
      await removeAnalista(boardPeritoId, analistaId)
      success('Analista removido')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao remover analista')
    }
  }

  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold text-[#5A6A5E] uppercase tracking-wide">Analistas</div>

      {lista.length === 0 ? (
        <p className="text-xs text-[#9AA4A0]">Nenhum analista vinculado.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {lista.map((a) => (
            <span
              key={a.id}
              className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-xs font-medium bg-[#1B4D2E]/10 text-[#1B4D2E]"
            >
              {a.nome}
              <button
                onClick={() => handleRemove(a.id)}
                className="w-3.5 h-3.5 flex items-center justify-center rounded-full hover:bg-[#1B4D2E]/20 transition-colors"
                title="Remover analista"
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      {disponiveis.length > 0 && (
        <div className="flex gap-2">
          <Select value={novoAnalistaId} onChange={(e) => setNovoAnalistaId(e.target.value)} className="flex-1">
            <option value="">Selecione um analista…</option>
            {disponiveis.map((a) => (
              <option key={a.id} value={a.id}>{a.nome}</option>
            ))}
          </Select>
          <Button type="button" variant="secondary" disabled={!novoAnalistaId || adding} onClick={handleAdd}>
            <Plus size={13} /> Adicionar
          </Button>
        </div>
      )}
    </div>
  )
}

// ── Comentários (histórico de atividade) ───────────────────────────────────────────

function ComentariosSection({ boardPeritoId }: { boardPeritoId: string }) {
  const { user } = useAuth()
  const comentarios = useBoardComentariosStore((s) => s.comentariosByPerito[boardPeritoId])
  const { fetchComentarios, addComentario, updateComentario, deleteComentario } = useBoardComentariosStore()
  const analistasCadastrados = useAnalistasStore((s) => s.analistas)
  const { success, error: toastError } = useToast()

  const [texto, setTexto] = useState('')
  const [mencionadosIds, setMencionadosIds] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTexto, setEditTexto] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  useEffect(() => {
    fetchComentarios(boardPeritoId)
  }, [boardPeritoId, fetchComentarios])

  const lista = comentarios ?? []

  const mentionMatch = texto.match(/@(\w*)$/)
  const mentionQuery = mentionMatch ? mentionMatch[1].toLowerCase() : null
  const mentionSuggestions = mentionQuery !== null
    ? analistasCadastrados.filter((a) => a.nome.toLowerCase().includes(mentionQuery)).slice(0, 5)
    : []

  function handlePickMention(analistaId: string, analistaNome: string) {
    const semTagParcial = texto.replace(/@(\w*)$/, '')
    const tag = `@${analistaNome.replace(/\s+/g, '')}`
    setTexto(`${semTagParcial}${tag} `)
    setMencionadosIds((prev) => Array.from(new Set([...prev, analistaId])))
  }

  async function handleSubmit() {
    if (!texto.trim() || !user) return
    setSubmitting(true)
    try {
      await addComentario(boardPeritoId, texto.trim(), mencionadosIds, user.id, user.email ?? null)
      success('Comentário adicionado')
      setTexto('')
      setMencionadosIds([])
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao comentar')
    } finally {
      setSubmitting(false)
    }
  }

  function startEdit(c: BoardComentario) {
    setEditingId(c.id)
    setEditTexto(c.texto)
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function handleSaveEdit(c: BoardComentario) {
    if (!editTexto.trim()) return
    setSavingEdit(true)
    try {
      await updateComentario(boardPeritoId, c.id, editTexto.trim(), c.mencionados)
      success('Comentário atualizado')
      setEditingId(null)
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao atualizar comentário')
    } finally {
      setSavingEdit(false)
    }
  }

  async function handleDelete(c: BoardComentario) {
    if (!window.confirm('Excluir este comentário?')) return
    try {
      await deleteComentario(boardPeritoId, c.id)
      success('Comentário excluído')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao excluir comentário')
    }
  }

  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold text-[#5A6A5E] uppercase tracking-wide">Comentários</div>

      {lista.length === 0 ? (
        <p className="text-xs text-[#9AA4A0]">Nenhum comentário ainda.</p>
      ) : (
        <div className="space-y-3">
          {lista.map((c) => {
            const autorNome = resolveAutorNome(c.autorEmail, analistasCadastrados)
            const autorLabel = autorNome ? `@${autorNome}` : (c.autorEmail ?? 'Usuário')
            return (
            <div key={c.id} className="flex gap-2.5">
              <div className="w-7 h-7 rounded-full bg-[#1B4D2E]/10 text-[#1B4D2E] text-[11px] font-semibold flex items-center justify-center shrink-0">
                {autorNome ? initials(autorNome) : initialsFromEmail(c.autorEmail)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-[#1A1A1A]">{autorLabel}</span>
                  <span className="text-[11px] text-[#9AA4A0]">{formatDataHora(c.createdAt)}</span>
                </div>

                {editingId === c.id ? (
                  <div className="mt-1 space-y-2">
                    <Textarea value={editTexto} onChange={(e) => setEditTexto(e.target.value)} rows={2} />
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="secondary" size="sm" onClick={cancelEdit}>Cancelar</Button>
                      <Button type="button" variant="primary" size="sm" disabled={savingEdit} onClick={() => handleSaveEdit(c)}>
                        {savingEdit ? 'Salvando…' : 'Salvar'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-[#1A1A1A] mt-0.5 whitespace-pre-wrap break-words">
                      {renderTextoComMencoes(c.texto)}
                    </p>
                    {user?.id === c.autorId && (
                      <div className="flex items-center gap-2 mt-1">
                        <button onClick={() => startEdit(c)} className="text-[11px] text-[#5A6A5E] hover:text-[#1B4D2E] transition-colors">
                          Editar
                        </button>
                        <span className="text-[#D4DAD6]">·</span>
                        <button onClick={() => handleDelete(c)} className="text-[11px] text-[#5A6A5E] hover:text-red-600 transition-colors">
                          Excluir
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            )
          })}
        </div>
      )}

      <div className="relative space-y-2">
        <Textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Escreva um comentário… use @ para mencionar um analista"
          rows={2}
        />
        {mentionSuggestions.length > 0 && (
          <div className="absolute z-10 bg-white border border-[#D4DAD6] rounded-md shadow-md w-56 overflow-hidden">
            {mentionSuggestions.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => handlePickMention(a.id, a.nome)}
                className="w-full text-left px-3 py-1.5 text-sm text-[#1A1A1A] hover:bg-[#F4F6F4] transition-colors"
              >
                {a.nome}
              </button>
            ))}
          </div>
        )}
        <div className="flex justify-end">
          <Button type="button" variant="primary" size="sm" disabled={!texto.trim() || submitting} onClick={handleSubmit}>
            {submitting ? 'Enviando…' : 'Comentar'}
          </Button>
        </div>
      </div>
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
  const { entregue, total } = useChecklistProgress(perito.id)

  const [regiao, setRegiao] = useState(perito.regiao)
  const [statusChanging, setStatusChanging] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setRegiao(perito.regiao)
  }, [perito.id, perito.regiao])

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

  async function handleSaveRegiao() {
    if (!regiao) {
      toastError('Selecione uma região')
      return
    }
    setSaving(true)
    try {
      await updateItem(perito.id, { regiao })
      success('Região atualizada')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao salvar região')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={perito.nome} size="sm">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#1B4D2E]/10 text-[#1B4D2E] text-sm font-semibold flex items-center justify-center shrink-0">
            {initials(perito.nome)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <div className="text-sm font-semibold text-[#1A1A1A] truncate">{perito.nome}</div>
              <PlanilhaControleIcon perito={perito} />
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-medium', regionBadgeClasses(perito.regiao))}>
                {perito.regiao}
              </span>
              <span className="text-xs text-[#5A6A5E]">{entregue}/{total} lotes entregues</span>
            </div>
          </div>
        </div>

        <AnalistasVinculados boardPeritoId={perito.id} />

        <div className="border-t border-[#D4DAD6] pt-5">
          <FormField label="Região">
            <Select value={regiao} onChange={(e) => setRegiao(e.target.value)}>
              <option value="">Selecione a região…</option>
              {TRT_OPTIONS.map((t) => (
                <option key={t.value} value={t.label}>{t.label}</option>
              ))}
            </Select>
          </FormField>
        </div>

        <div className="border-t border-[#D4DAD6] pt-5">
          <ChecklistLotes boardPeritoId={perito.id} />
        </div>

        <div className="border-t border-[#D4DAD6] pt-5">
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
        </div>

        <div className="border-t border-[#D4DAD6] pt-5">
          <ComentariosSection boardPeritoId={perito.id} />
        </div>

        <div className="border-t border-[#D4DAD6] pt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Fechar</Button>
          <Button variant="primary" onClick={handleSaveRegiao} disabled={saving}>
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
  const lotesByPerito = useBoardLotesStore((s) => s.lotesByPerito)
  const fetchLotes = useBoardLotesStore((s) => s.fetchLotes)
  const analistasByPerito = useBoardPeritosStore((s) => s.analistasByPerito)
  const fetchAnalistasDoPerito = useBoardPeritosStore((s) => s.fetchAnalistasDoPerito)
  const { analistas, fetchAnalistas } = useAnalistasStore()

  const [query, setQuery] = useState('')
  const [activeRegion, setActiveRegion] = useState('')
  const [collapsedStatuses, setCollapsedStatuses] = useState<Set<BoardStatus>>(new Set())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mesAlvo, setMesAlvo] = useState<string | null>(null)
  const [mesCustomAtivo, setMesCustomAtivo] = useState(false)
  const [view, setView] = useState<'status' | 'mes'>('status')

  useEffect(() => {
    fetchBoard()
  }, [fetchBoard])

  useEffect(() => {
    if (analistas.length === 0) fetchAnalistas()
  }, [analistas.length, fetchAnalistas])

  useEffect(() => {
    items.forEach((p) => {
      if (!(p.id in lotesByPerito)) fetchLotes(p.id)
    })
  }, [items, lotesByPerito, fetchLotes])

  useEffect(() => {
    items.forEach((p) => {
      if (!(p.id in analistasByPerito)) fetchAnalistasDoPerito(p.id)
    })
  }, [items, analistasByPerito, fetchAnalistasDoPerito])

  const regions = useMemo(() => {
    const set = new Set(items.map((i) => i.regiao).filter(Boolean))
    return Array.from(set).sort()
  }, [items])

  const { mesAtual, mesProximo } = useMemo(() => {
    const now = new Date()
    const ano = now.getFullYear()
    const mes = now.getMonth()
    const proxima = new Date(ano, mes + 1, 1)
    return {
      mesAtual:   `${ano}-${String(mes + 1).padStart(2, '0')}`,
      mesProximo: `${proxima.getFullYear()}-${String(proxima.getMonth() + 1).padStart(2, '0')}`,
    }
  }, [])

  const mesShortcuts = [
    { label: 'Este mês',    value: mesAtual },
    { label: 'Próximo mês', value: mesProximo },
    { label: 'Todos',       value: null as string | null },
  ]

  const mesSelectValue = mesCustomAtivo || (mesAlvo !== null && mesAlvo !== mesAtual && mesAlvo !== mesProximo)
    ? 'custom'
    : (mesAlvo ?? '')

  function handleMesSelectChange(value: string) {
    if (value === 'custom') {
      setMesCustomAtivo(true)
    } else {
      setMesCustomAtivo(false)
      setMesAlvo(value || null)
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter((i) => {
      if (activeRegion && i.regiao !== activeRegion) return false
      if (q && !i.nome.toLowerCase().includes(q)) return false
      if (mesAlvo) {
        const lotes = lotesByPerito[i.id] ?? []
        if (!lotes.some((l) => l.mesRef?.slice(0, 7) === mesAlvo)) return false
      }
      return true
    })
  }, [items, query, activeRegion, mesAlvo, lotesByPerito])

  const grouped = useMemo(() => {
    return BOARD_STATUS.map((s) => ({
      status: s.value,
      label: s.label,
      items: filtered.filter((i) => i.status === s.value).sort((a, b) => a.ordem - b.ordem),
    }))
  }, [filtered])

  const kpis = useMemo(() => {
    let totalLotes = 0
    let entregueLotes = 0

    items.forEach((p) => {
      const lotes = lotesByPerito[p.id] ?? []
      const relevantes = mesAlvo ? lotes.filter((l) => l.mesRef?.slice(0, 7) === mesAlvo) : lotes
      totalLotes += relevantes.length
      entregueLotes += relevantes.filter((l) => l.entregue).length
    })

    // "Em análise" não soma todos os lotes do perito: cada perito representa,
    // no máximo, 1 lote (o pendente mais próximo do mês de referência) — pois
    // na prática só há um lote sendo trabalhado por vez, e peritos com muitos
    // lotes históricos (já entregues) não devem inflar o KPI. A "distância"
    // ao mês de referência só decide QUAL lote pendente representa o perito
    // (o mais próximo, com prioridade para o mês exato); a contribuição para
    // a contagem é sempre 0 (sem pendente) ou 1 (com pendente).
    const mesReferencia = mesAlvo ?? (() => {
      const hoje = new Date()
      return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
    })()
    const [anoRef, numMesRef] = mesReferencia.split('-').map(Number)

    const distanciaAoMesRef = (mesRef: string | undefined) => {
      if (!mesRef) return Infinity
      const [ano, mes] = mesRef.split('-').map(Number)
      return Math.abs((ano * 12 + mes) - (anoRef * 12 + numMesRef))
    }

    const contarEmAnalise = (status: 'analise_1' | 'analise_2') => {
      let count = 0
      items.forEach((p) => {
        if (p.status !== status) return
        const pendentes = (lotesByPerito[p.id] ?? []).filter((l) => !l.entregue)
        if (pendentes.length === 0) return

        // Escolhe o lote pendente que representa este perito no KPI: o mais
        // próximo do mês de referência (exato = distância 0).
        pendentes.reduce((melhor, l) =>
          distanciaAoMesRef(l.mesRef?.slice(0, 7)) < distanciaAoMesRef(melhor.mesRef?.slice(0, 7)) ? l : melhor
        )
        count += 1
      })
      return count
    }

    const em1aAnalise = contarEmAnalise('analise_1')
    const em2aAnalise = contarEmAnalise('analise_2')

    return {
      total:         totalLotes,
      em1aAnalise,
      em2aAnalise,
      entregueTotal: entregueLotes,
      pendenteTotal: totalLotes - entregueLotes,
    }
  }, [items, lotesByPerito, mesAlvo])

  const selected = useMemo(() => items.find((i) => i.id === selectedId) ?? null, [items, selectedId])

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
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-[#1A1A1A]">Gestão de Peritos</h1>
          <p className="text-sm text-[#5A6A5E] mt-0.5">
            {items.length} perito{items.length !== 1 ? 's' : ''} cadastrado{items.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          <KpiCard label="Provisionados" value={kpis.total}         color="blue"   icon={FileText}   sub="lotes no checklist" />
          <KpiCard label="Em 1ª análise" value={kpis.em1aAnalise}   color="purple" icon={Clock}      sub="lotes" />
          <KpiCard label="Em 2ª análise" value={kpis.em2aAnalise}   color="teal"   icon={Clock}      sub="lotes" />
          <KpiCard label="Entregues"     value={kpis.entregueTotal} color="green"  icon={TrendingUp} sub="lotes" />
          <KpiCard label="Pendentes"     value={kpis.pendenteTotal} color="red"    icon={FileText}   sub="lotes" />
        </div>
      </div>

      {/* ── Alternância de visão ──────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5">
        {([
          { value: 'status', label: 'Por status' },
          { value: 'mes',     label: 'Por mês' },
        ] as const).map((opt) => (
          <button
            key={opt.value}
            onClick={() => setView(opt.value)}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm font-medium border transition-colors',
              view === opt.value
                ? 'bg-[#1B4D2E] text-white border-[#1B4D2E]'
                : 'bg-white text-[#5A6A5E] border-[#D4DAD6] hover:border-[#1B4D2E]/40',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {/* ── Barra de ferramentas ──────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
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

        <Select
          value={mesSelectValue}
          onChange={(e) => handleMesSelectChange(e.target.value)}
          className="h-9"
          containerClassName="w-auto shrink-0"
        >
          {mesShortcuts.map((opt) => (
            <option key={opt.label} value={opt.value ?? ''}>{opt.label}</option>
          ))}
          <option value="custom">Escolher período…</option>
        </Select>
        {mesSelectValue === 'custom' && (
          <input
            type="month"
            value={mesAlvo ?? ''}
            onChange={(e) => setMesAlvo(e.target.value || null)}
            className="h-9 px-2.5 rounded-md text-sm border border-[#D4DAD6] bg-white text-[#1A1A1A] focus:outline-none focus:border-[#1B4D2E] focus:ring-1 focus:ring-[#1B4D2E]/30 transition-colors shrink-0"
          />
        )}

        {regions.length > 0 && (
          <Select
            value={activeRegion}
            onChange={(e) => setActiveRegion(e.target.value)}
            className="h-9"
            containerClassName="w-auto shrink-0"
          >
            <option value="">Todas as regiões</option>
            {regions.map((regiao) => (
              <option key={regiao} value={regiao}>{regiao}</option>
            ))}
          </Select>
        )}
      </div>

      {/* ── Estado de carregamento ────────────────────────────────────────── */}
      {loading && items.length === 0 && (
        <div className="text-sm text-[#5A6A5E] text-center py-10">Carregando peritos…</div>
      )}

      {/* ── Conteúdo: por status ou por mês ──────────────────────────────────── */}
      {(!loading || items.length > 0) && (
        view === 'status' ? (
          <div className="space-y-3">
            {grouped.map((g) => (
              <StatusSection
                key={g.status}
                status={g.status}
                label={g.label}
                items={g.items}
                collapsed={collapsedStatuses.has(g.status)}
                mesAlvo={mesAlvo}
                onToggle={() => toggleSection(g.status)}
                onOpenPerito={setSelectedId}
              />
            ))}
          </div>
        ) : (
          <VisaoPorMes peritos={filtered} mesAlvo={mesAlvo} />
        )
      )}

      {selected && (
        <DetailModal perito={selected} onClose={() => setSelectedId(null)} />
      )}
    </div>
  )
}
