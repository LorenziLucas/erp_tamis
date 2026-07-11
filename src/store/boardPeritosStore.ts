import { create } from 'zustand'
import type { BoardPerito, BoardStatus } from '../types/board'
import {
  listarBoardPeritos,
  atualizarBoardPerito,
  deletarBoardPerito,
  listarAnalistasDoPerito,
  vincularAnalista,
  desvincularAnalista,
} from '../services/boardPeritosService'

interface BoardPeritosState {
  items:   BoardPerito[]
  loading: boolean
  error:   string | null

  analistasByPerito: Record<string, { id: string; nome: string }[]>

  fetchBoard: () => Promise<void>
  updateItem: (
    id: string,
    updates: Partial<{
      status:       BoardStatus
      provisionado: number
      entregue:     number
      regiao:       string
      analista:     string | null
      ordem:        number
    }>,
  ) => Promise<void>
  deleteItem: (id: string) => Promise<void>

  fetchAnalistasDoPerito: (boardPeritoId: string) => Promise<void>
  addAnalista:    (boardPeritoId: string, analistaId: string) => Promise<void>
  removeAnalista: (boardPeritoId: string, analistaId: string) => Promise<void>
}

export const useBoardPeritosStore = create<BoardPeritosState>((set) => ({
  items:   [],
  loading: false,
  error:   null,

  analistasByPerito: {},

  fetchBoard: async () => {
    set({ loading: true, error: null })
    const { data, error } = await listarBoardPeritos()
    if (error) { set({ loading: false, error: String(error) }); return }
    set({ items: data, loading: false })
  },

  updateItem: async (id, updates) => {
    const { error } = await atualizarBoardPerito(id, updates)
    if (error) {
      const message = String(error)
      set({ error: message })
      throw new Error(message)
    }
    set((state) => ({
      items: state.items.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    }))
  },

  deleteItem: async (id) => {
    const { error } = await deletarBoardPerito(id)
    if (error) {
      const message = String(error)
      set({ error: message })
      throw new Error(message)
    }
    set((state) => ({ items: state.items.filter((item) => item.id !== id) }))
  },

  fetchAnalistasDoPerito: async (boardPeritoId) => {
    const { data, error } = await listarAnalistasDoPerito(boardPeritoId)
    if (error) { set({ error: String(error) }); return }
    set((state) => ({ analistasByPerito: { ...state.analistasByPerito, [boardPeritoId]: data } }))
  },

  addAnalista: async (boardPeritoId, analistaId) => {
    const { error } = await vincularAnalista(boardPeritoId, analistaId)
    if (error) {
      const message = String(error)
      set({ error: message })
      throw new Error(message)
    }
    await useBoardPeritosStore.getState().fetchAnalistasDoPerito(boardPeritoId)
  },

  removeAnalista: async (boardPeritoId, analistaId) => {
    const { error } = await desvincularAnalista(boardPeritoId, analistaId)
    if (error) {
      const message = String(error)
      set({ error: message })
      throw new Error(message)
    }
    set((state) => ({
      analistasByPerito: {
        ...state.analistasByPerito,
        [boardPeritoId]: (state.analistasByPerito[boardPeritoId] ?? []).filter((a) => a.id !== analistaId),
      },
    }))
  },
}))
