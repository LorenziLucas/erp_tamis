import { create } from 'zustand'
import type { BoardLote } from '../types/board'
import {
  listarBoardLotes,
  criarBoardLote,
  atualizarBoardLote,
  deletarBoardLote,
} from '../services/boardLotesService'
import { registrarHistorico } from '../services/boardHistoricoService'
import { useAuthStore } from './authStore'

function formatMesAno(mesRef: string | null): string {
  if (!mesRef) return '—'
  const [ano, mes] = mesRef.split('-')
  return `${mes}/${ano}`
}

interface BoardLotesState {
  lotesByPerito: Record<string, BoardLote[]>
  loading: boolean
  error:   string | null

  fetchLotes: (boardPeritoId: string) => Promise<void>
  addLote: (
    boardPeritoId: string,
    dados: { numero: number; mesRef?: string | null; tipo?: string | null; formato?: string | null; ordem?: number },
  ) => Promise<void>
  updateLote: (
    boardPeritoId: string,
    id: string,
    updates: Partial<{ numero: number; mesRef: string | null; tipo: string | null; formato: string | null; entregue: boolean; ordem: number }>,
  ) => Promise<void>
  deleteLote: (boardPeritoId: string, id: string) => Promise<void>
}

export const useBoardLotesStore = create<BoardLotesState>((set) => ({
  lotesByPerito: {},
  loading: false,
  error:   null,

  fetchLotes: async (boardPeritoId) => {
    set({ loading: true, error: null })
    const { data, error } = await listarBoardLotes(boardPeritoId)
    if (error) { set({ loading: false, error: String(error) }); return }
    set((state) => ({
      lotesByPerito: { ...state.lotesByPerito, [boardPeritoId]: data },
      loading: false,
    }))
  },

  addLote: async (boardPeritoId, dados) => {
    const { data, error } = await criarBoardLote(boardPeritoId, dados)
    if (error || !data) {
      const message = String(error ?? 'Erro ao criar lote')
      set({ error: message })
      throw new Error(message)
    }
    set((state) => ({
      lotesByPerito: {
        ...state.lotesByPerito,
        [boardPeritoId]: [...(state.lotesByPerito[boardPeritoId] ?? []), data],
      },
    }))
  },

  updateLote: async (boardPeritoId, id, updates) => {
    const loteAnterior = (useBoardLotesStore.getState().lotesByPerito[boardPeritoId] ?? []).find((l) => l.id === id)
    const foiEntregueAgora = updates.entregue === true && loteAnterior?.entregue === false

    const { error } = await atualizarBoardLote(id, updates)
    if (error) {
      const message = String(error)
      set({ error: message })
      throw new Error(message)
    }
    set((state) => ({
      lotesByPerito: {
        ...state.lotesByPerito,
        [boardPeritoId]: (state.lotesByPerito[boardPeritoId] ?? []).map((lote) =>
          lote.id === id ? { ...lote, ...updates } : lote,
        ),
      },
    }))

    if (foiEntregueAgora && loteAnterior) {
      const autorEmail = useAuthStore.getState().username || null
      registrarHistorico(
        boardPeritoId,
        'lote_entregue',
        `concluiu ${loteAnterior.numero}º lote — ${formatMesAno(loteAnterior.mesRef)}`,
        autorEmail,
      )
    }
  },

  deleteLote: async (boardPeritoId, id) => {
    const { error } = await deletarBoardLote(id)
    if (error) {
      const message = String(error)
      set({ error: message })
      throw new Error(message)
    }
    set((state) => ({
      lotesByPerito: {
        ...state.lotesByPerito,
        [boardPeritoId]: (state.lotesByPerito[boardPeritoId] ?? []).filter((lote) => lote.id !== id),
      },
    }))
  },
}))
