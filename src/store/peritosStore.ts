import { create } from 'zustand'
import type { TRT, PeritoCadastro } from '../types'
import {
  getTRTs,
  getPeritos,
  createPerito as svcCreatePerito,
  updatePerito as svcUpdatePerito,
  createTRT as svcCreateTRT,
  updateTRT as svcUpdateTRT,
} from '../services/peritosService'

interface PeritosState {
  trts:     TRT[]
  peritos:  PeritoCadastro[]
  loading:  boolean
  error:    string | null

  fetchTRTs:    () => Promise<void>
  fetchPeritos: () => Promise<void>
  createPerito: (nome: string, trtIds: string[]) => Promise<void>
  updatePerito: (id: string, nome: string, trtIds: string[]) => Promise<void>
  createTRT:    (numero: number, cidadeSede: string) => Promise<void>
  updateTRT:    (id: string, numero: number, cidadeSede: string) => Promise<void>
}

export const usePeritosStore = create<PeritosState>((set, get) => ({
  trts:    [],
  peritos: [],
  loading: false,
  error:   null,

  fetchTRTs: async () => {
    set({ loading: true, error: null })
    const { data, error } = await getTRTs()
    if (error) { set({ loading: false, error: String(error) }); return }
    set({ trts: data, loading: false })
  },

  fetchPeritos: async () => {
    set({ loading: true, error: null })
    const { data, error } = await getPeritos()
    if (error) { set({ loading: false, error: String(error) }); return }
    set({ peritos: data, loading: false })
  },

  createPerito: async (nome, trtIds) => {
    set({ loading: true, error: null })
    const { data, error } = await svcCreatePerito(nome, trtIds)
    if (error || !data) {
      const message = String(error ?? 'Erro ao criar perito')
      set({ loading: false, error: message })
      throw new Error(message)
    }
    set((state) => ({ peritos: [...state.peritos, data].sort((a, b) => a.nome.localeCompare(b.nome)), loading: false }))
  },

  updatePerito: async (id, nome, trtIds) => {
    set({ loading: true, error: null })
    const { error } = await svcUpdatePerito(id, nome, trtIds)
    if (error) {
      const message = String(error)
      set({ loading: false, error: message })
      throw new Error(message)
    }
    await get().fetchPeritos()
  },

  createTRT: async (numero, cidadeSede) => {
    set({ loading: true, error: null })
    const { data, error } = await svcCreateTRT(numero, cidadeSede)
    if (error || !data) {
      const message = String(error ?? 'Erro ao criar TRT')
      set({ loading: false, error: message })
      throw new Error(message)
    }
    set((state) => ({ trts: [...state.trts, data].sort((a, b) => a.numero - b.numero), loading: false }))
  },

  updateTRT: async (id, numero, cidadeSede) => {
    set({ loading: true, error: null })
    const { error } = await svcUpdateTRT(id, numero, cidadeSede)
    if (error) {
      const message = String(error)
      set({ loading: false, error: message })
      throw new Error(message)
    }
    await get().fetchTRTs()
  },
}))
