import { create } from 'zustand'
import type { Cobranca, Perito } from '../types/cobrancas'
import {
  listarCobrancas, criarCobranca, atualizarCobranca, deletarCobranca,
} from '../services/cobrancasService'
import { listarPeritos, upsertPerito } from '../services/peritosService'

interface CobrancasState {
  cobrancas: Cobranca[]
  peritos: Perito[]
  loading: boolean
  error: string | null

  fetchAll: () => Promise<void>
  addCobranca: (c: Omit<Cobranca, 'id' | 'userId' | 'createdAt'>) => Promise<string | null>
  updateCobranca: (id: string, c: Omit<Cobranca, 'id' | 'userId' | 'createdAt'>) => Promise<string | null>
  deleteCobranca: (id: string) => Promise<void>
  saveCpf: (nome: string, cpf: string) => Promise<void>
}

export const useCobrancasStore = create<CobrancasState>((set, get) => ({
  cobrancas: [],
  peritos: [],
  loading: false,
  error: null,

  fetchAll: async () => {
    set({ loading: true, error: null })
    const [{ data: cobrancas, error: e1 }, { data: peritos, error: e2 }] =
      await Promise.all([listarCobrancas(), listarPeritos()])

    if (e1 || e2) {
      set({ loading: false, error: (e1 ?? e2)?.message ?? 'Erro ao carregar' })
      return
    }
    set({ cobrancas, peritos, loading: false })
  },

  addCobranca: async (c) => {
    const { data, error } = await criarCobranca(c)
    if (error || !data) return error?.message ?? 'Erro ao salvar'
    set((s) => ({ cobrancas: [data, ...s.cobrancas] }))
    return null
  },

  updateCobranca: async (id, c) => {
    const { data, error } = await atualizarCobranca(id, c)
    if (error || !data) return error?.message ?? 'Erro ao atualizar'
    set((s) => ({ cobrancas: s.cobrancas.map((x) => (x.id === id ? data : x)) }))
    return null
  },

  deleteCobranca: async (id) => {
    await deletarCobranca(id)
    set((s) => ({ cobrancas: s.cobrancas.filter((x) => x.id !== id) }))
  },

  saveCpf: async (nome, cpf) => {
    if (!cpf.trim()) return
    await upsertPerito(nome, cpf)
    // Atualiza localmente sem refetch completo
    set((s) => {
      const exists = s.peritos.find((p) => p.nome === nome)
      if (exists) {
        return { peritos: s.peritos.map((p) => p.nome === nome ? { ...p, cpf } : p) }
      }
      return { peritos: [...s.peritos, { id: '', nome, cpf, userId: '' }] }
    })
    // Recarrega apenas se queremos IDs corretos
    const { data } = await listarPeritos()
    if (data) set({ peritos: data })
  },
}))

/** Retorna todos os nomes únicos de peritos (de lotes + cobranças + tabela peritos) */
export function selectPeritoNames(
  peritosFromLotes: string[],
  peritos: Perito[],
  cobrancas: Cobranca[],
): string[] {
  const set = new Set<string>([
    ...peritosFromLotes,
    ...peritos.map((p) => p.nome),
    ...cobrancas.map((c) => c.perito),
  ])
  return [...set].sort()
}
