import { create } from 'zustand'
import type { Analista, TipoAcessoAnalista } from '../types/analista'
import {
  listarAnalistas,
  createAnalista as svcCreateAnalista,
  updateAnalista as svcUpdateAnalista,
  deletarAnalista as svcDeletarAnalista,
} from '../services/analistasService'

interface AnalistasState {
  analistas: Analista[]
  loading:   boolean
  error:     string | null

  fetchAnalistas: () => Promise<void>
  createAnalista: (nome: string, email: string | null, tipoAcesso: TipoAcessoAnalista) => Promise<void>
  updateAnalista: (id: string, nome: string, email: string | null, tipoAcesso: TipoAcessoAnalista) => Promise<void>
  deleteAnalista: (id: string) => Promise<void>
}

export const useAnalistasStore = create<AnalistasState>((set) => ({
  analistas: [],
  loading:   false,
  error:     null,

  fetchAnalistas: async () => {
    set({ loading: true, error: null })
    const { data, error } = await listarAnalistas()
    if (error) { set({ loading: false, error: String(error) }); return }
    set({ analistas: data, loading: false })
  },

  createAnalista: async (nome, email, tipoAcesso) => {
    set({ loading: true, error: null })
    const { data, error } = await svcCreateAnalista(nome, email, tipoAcesso)
    if (error || !data) {
      const message = String(error ?? 'Erro ao criar analista')
      set({ loading: false, error: message })
      throw new Error(message)
    }
    set((state) => ({
      analistas: [...state.analistas, data].sort((a, b) => a.nome.localeCompare(b.nome)),
      loading: false,
    }))
  },

  updateAnalista: async (id, nome, email, tipoAcesso) => {
    set({ loading: true, error: null })
    const { error } = await svcUpdateAnalista(id, nome, email, tipoAcesso)
    if (error) {
      const message = String(error)
      set({ loading: false, error: message })
      throw new Error(message)
    }
    set((state) => ({
      analistas: state.analistas
        .map((a) => (a.id === id ? { ...a, nome, email, tipoAcesso } : a))
        .sort((a, b) => a.nome.localeCompare(b.nome)),
      loading: false,
    }))
  },

  deleteAnalista: async (id) => {
    set({ loading: true, error: null })
    const { error } = await svcDeletarAnalista(id)
    if (error) {
      const message = String(error)
      set({ loading: false, error: message })
      throw new Error(message)
    }
    set((state) => ({ analistas: state.analistas.filter((a) => a.id !== id), loading: false }))
  },
}))
