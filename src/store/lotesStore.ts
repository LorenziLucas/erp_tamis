import { create } from 'zustand'
import type { Lote } from '../types'
import { calcDias } from '../lib/utils'
import {
  listarLotes,
  criarLote,
  criarLotes,
  atualizarLote,
  deletarLote,
} from '../services/lotesService'

interface LotesState {
  lotes:   Lote[]
  loading: boolean
  error:   string | null

  // Sincronização com Supabase
  fetchLotes: () => Promise<void>

  // Mutações (chamam o serviço e atualizam o estado local)
  addLote:    (lote: Omit<Lote, 'id'>) => Promise<void>
  addLotes:   (lotes: Omit<Lote, 'id'>[]) => Promise<{ imported: number; errors: string[] }>
  updateLote: (id: string, data: Partial<Lote>) => Promise<void>
  deleteLote: (id: string) => Promise<void>
  clearAll:   () => void

  // Migrações locais (apenas para dados herdados do localStorage — remover no futuro)
  migrateQtdDias: () => void
  migrateMesRef:  () => void
}

export const useLotesStore = create<LotesState>((set, get) => ({
  lotes:   [],
  loading: false,
  error:   null,

  // ── Fetch ────────────────────────────────────────────────────────────────────

  fetchLotes: async () => {
    set({ loading: true, error: null })
    const { data, error } = await listarLotes()
    if (error) {
      set({ loading: false, error: String(error.message ?? error) })
      return
    }
    set({ lotes: data, loading: false })
  },

  // ── Mutações ─────────────────────────────────────────────────────────────────

  addLote: async (lote) => {
    const { data, error } = await criarLote(lote)
    if (error || !data) {
      set({ error: String((error as Error)?.message ?? 'Erro ao criar lote') })
      return
    }
    set((state) => ({ lotes: [data, ...state.lotes] }))
  },

  addLotes: async (incoming) => {
    const errors: string[] = []
    const { data, error } = await criarLotes(incoming)
    if (error) {
      errors.push(String((error as Error)?.message ?? 'Erro ao importar lotes'))
      return { imported: 0, errors }
    }
    if (data.length > 0) {
      set((state) => ({ lotes: [...data, ...state.lotes] }))
    }
    return { imported: data.length, errors }
  },

  updateLote: async (id, partial) => {
    const { data, error } = await atualizarLote(id, partial)
    if (error || !data) {
      set({ error: String((error as Error)?.message ?? 'Erro ao atualizar lote') })
      return
    }
    set((state) => ({
      lotes: state.lotes.map((l) => (l.id === id ? data : l)),
    }))
  },

  deleteLote: async (id) => {
    const { error } = await deletarLote(id)
    if (error) {
      set({ error: String((error as Error)?.message ?? 'Erro ao deletar lote') })
      return
    }
    set((state) => ({ lotes: state.lotes.filter((l) => l.id !== id) }))
  },

  clearAll: () => set({ lotes: [] }),

  // ── Migrações legacy (localStorage → mantidas para não quebrar importações antigas) ──

  migrateQtdDias: () =>
    set((state) => ({
      lotes: state.lotes.map((l) => ({
        ...l,
        qtdDias: calcDias(l.envio, l.entrega),
      })),
    })),

  migrateMesRef: () =>
    set((state) => ({
      lotes: state.lotes.map((l) => {
        const base = (l.entrega || l.envio || '').trim()
        if (!base) return l
        const parts = base.split('-')
        if (parts.length < 2) return l
        return { ...l, mesRef: `${parts[0]}-${parts[1]}-01` }
      }),
    })),
}))

// ── Derived selectors (inalterados — operam sobre o array em memória) ─────────

export function selectKpis(lotes: Lote[]) {
  const total      = lotes.length
  const valorTotal = lotes.reduce((s, l) => s + l.valorDevido, 0)
  const valorPago  = lotes.filter((l) => l.pago).reduce((s, l) => s + l.valorDevido, 0)
  const qtdTotal   = lotes.reduce((s, l) => s + l.qtdAnalisada, 0)
  const diasArr    = lotes.map((l) => l.qtdDias).filter((d) => d >= 0)
  const diasMedia  = diasArr.length ? diasArr.reduce((a, b) => a + b, 0) / diasArr.length : 0
  const peritos    = new Set(lotes.map((l) => l.perito)).size
  const regioes        = new Set(lotes.map((l) => l.regiao)).size
  const mediaPorLote   = total > 0 ? Math.round(qtdTotal / total) : 0
  const totalSentencas = lotes.reduce((s, l) => s + (l.totalSentencas ?? 0), 0)
  return { total, valorTotal, valorPago, qtdTotal, diasMedia, peritos, regioes, mediaPorLote, totalSentencas }
}

export function selectByTipo(lotes: Lote[]) {
  const map: Record<string, number> = {}
  for (const l of lotes) map[l.tipo] = (map[l.tipo] ?? 0) + l.qtdAnalisada
  return map
}

export function selectByFormato(lotes: Lote[]) {
  const map: Record<string, number> = {}
  for (const l of lotes) map[l.formato] = (map[l.formato] ?? 0) + l.qtdAnalisada
  return map
}

export function selectByMes(lotes: Lote[]) {
  const map: Record<string, { lotes: number; valor: number; qtd: number; qtdP: number }> = {}
  for (const l of lotes) {
    if (!l.mesRef) continue
    const parts = l.mesRef.split('-')
    if (parts.length < 2) continue
    const key = `${parts[0]}-${parts[1]}`
    if (!map[key]) map[key] = { lotes: 0, valor: 0, qtd: 0, qtdP: 0 }
    map[key].lotes++
    map[key].valor += l.valorDevido
    map[key].qtd += l.qtdAnalisada
    map[key].qtdP += l.qtdP ?? 0
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, v]) => {
      const [year, month] = key.split('-').map(Number)
      const label = new Date(year, month - 1, 1)
        .toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
        .replace('.', '')
      return { key, label, ...v }
    })
}

export function selectTopPeritos(lotes: Lote[], limit = 10) {
  const map: Record<string, { valor: number; qtd: number; count: number }> = {}
  for (const l of lotes) {
    if (!map[l.perito]) map[l.perito] = { valor: 0, qtd: 0, count: 0 }
    map[l.perito].valor += l.valorDevido
    map[l.perito].qtd += l.qtdAnalisada
    map[l.perito].count++
  }
  return Object.entries(map)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, limit)
}

export function selectByRegiao(lotes: Lote[]) {
  const map: Record<string, number> = {}
  for (const l of lotes) map[l.regiao] = (map[l.regiao] ?? 0) + l.qtdAnalisada
  return map
}

export function selectRecentLotes(lotes: Lote[], limit = 5) {
  return [...lotes]
    .sort((a, b) => new Date(b.envio).getTime() - new Date(a.envio).getTime())
    .slice(0, limit)
}
