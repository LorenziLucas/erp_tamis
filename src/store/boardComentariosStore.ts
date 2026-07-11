import { create } from 'zustand'
import type { BoardComentario } from '../types/board'
import {
  listarComentarios,
  criarComentario,
  atualizarComentario,
  deletarComentario,
} from '../services/boardComentariosService'

interface BoardComentariosState {
  comentariosByPerito: Record<string, BoardComentario[]>
  loading: boolean
  error:   string | null

  fetchComentarios: (boardPeritoId: string) => Promise<void>
  addComentario: (
    boardPeritoId: string,
    texto: string,
    mencionados: string[],
    autorId: string,
    autorEmail: string | null,
  ) => Promise<void>
  updateComentario: (boardPeritoId: string, id: string, texto: string, mencionados: string[]) => Promise<void>
  deleteComentario: (boardPeritoId: string, id: string) => Promise<void>
}

export const useBoardComentariosStore = create<BoardComentariosState>((set) => ({
  comentariosByPerito: {},
  loading: false,
  error:   null,

  fetchComentarios: async (boardPeritoId) => {
    set({ loading: true, error: null })
    const { data, error } = await listarComentarios(boardPeritoId)
    if (error) { set({ loading: false, error: String(error) }); return }
    set((state) => ({
      comentariosByPerito: { ...state.comentariosByPerito, [boardPeritoId]: data },
      loading: false,
    }))
  },

  addComentario: async (boardPeritoId, texto, mencionados, autorId, autorEmail) => {
    const { data, error } = await criarComentario(boardPeritoId, texto, mencionados, autorId, autorEmail)
    if (error || !data) {
      const message = String(error ?? 'Erro ao criar comentário')
      set({ error: message })
      throw new Error(message)
    }
    set((state) => ({
      comentariosByPerito: {
        ...state.comentariosByPerito,
        [boardPeritoId]: [...(state.comentariosByPerito[boardPeritoId] ?? []), data],
      },
    }))
  },

  updateComentario: async (boardPeritoId, id, texto, mencionados) => {
    const { error } = await atualizarComentario(id, texto, mencionados)
    if (error) {
      const message = String(error)
      set({ error: message })
      throw new Error(message)
    }
    set((state) => ({
      comentariosByPerito: {
        ...state.comentariosByPerito,
        [boardPeritoId]: (state.comentariosByPerito[boardPeritoId] ?? []).map((c) =>
          c.id === id ? { ...c, texto, mencionados } : c,
        ),
      },
    }))
  },

  deleteComentario: async (boardPeritoId, id) => {
    const { error } = await deletarComentario(id)
    if (error) {
      const message = String(error)
      set({ error: message })
      throw new Error(message)
    }
    set((state) => ({
      comentariosByPerito: {
        ...state.comentariosByPerito,
        [boardPeritoId]: (state.comentariosByPerito[boardPeritoId] ?? []).filter((c) => c.id !== id),
      },
    }))
  },
}))
