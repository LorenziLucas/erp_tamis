import { create } from 'zustand'
import type { TRT, PeritoCadastro } from '../types'
import {
  getTRTs,
  getPeritos,
  createPerito as svcCreate,
  updatePerito as svcUpdate,
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
    const { data, error } = await svcCreate(nome, trtIds)
    if (error || !data) { set({ loading: false, error: String(error ?? 'Erro ao criar perito') }); return }
    set((state) => ({ peritos: [...state.peritos, data].sort((a, b) => a.nome.localeCompare(b.nome)), loading: false }))
  },

  updatePerito: async (id, nome, trtIds) => {
    set({ loading: true, error: null })
    const { error } = await svcUpdate(id, nome, trtIds)
    if (error) { set({ loading: false, error: String(error) }); return }
    await get().fetchPeritos()
  },
}))
