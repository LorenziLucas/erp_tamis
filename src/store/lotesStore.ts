import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Lote } from '../types'
import { generateId, calcDias } from '../lib/utils'

interface LotesState {
  lotes: Lote[]
  addLote: (lote: Omit<Lote, 'id'>) => void
  addLotes: (lotes: Omit<Lote, 'id'>[]) => void
  updateLote: (id: string, data: Partial<Lote>) => void
  deleteLote: (id: string) => void
  clearAll: () => void
  migrateQtdDias: () => void
  migrateMesRef:  () => void
}

export const useLotesStore = create<LotesState>()(
  persist(
    (set) => ({
      lotes: [],

      addLote: (lote) =>
        set((state) => ({ lotes: [...state.lotes, { ...lote, id: generateId() }] })),

      addLotes: (incoming) =>
        set((state) => ({
          lotes: [
            ...state.lotes,
            ...incoming.map((l) => ({ ...l, id: generateId() })),
          ],
        })),

      updateLote: (id, data) =>
        set((state) => ({
          lotes: state.lotes.map((l) => (l.id === id ? { ...l, ...data } : l)),
        })),

      deleteLote: (id) =>
        set((state) => ({ lotes: state.lotes.filter((l) => l.id !== id) })),

      clearAll: () => set({ lotes: [] }),

      // Migração 1: aplica a regra calcDias a todos os lotes existentes.
      // envio === entrega → 1 dia; entrega vazia → 0 dias.
      migrateQtdDias: () =>
        set((state) => ({
          lotes: state.lotes.map((l) => ({
            ...l,
            qtdDias: calcDias(l.envio, l.entrega),
          })),
        })),

      // Migração 2: normaliza mesRef para YYYY-MM-01 baseado em entrega (se preenchida) ou envio.
      // Garante que o mês de referência seja sempre o 1º dia do mês correto, sem ambiguidade de fuso.
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
    }),
    { name: 'gestao-lotes-store' }
  )
)

// Derived selectors
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
  const map: Record<string, { lotes: number; valor: number; qtd: number }> = {}
  for (const l of lotes) {
    if (!l.mesRef) continue
    // Extrai ano e mês direto da string ISO (YYYY-MM-DD) sem criar Date,
    // evitando o deslocamento de fuso horário (UTC vs horário local).
    const parts = l.mesRef.split('-')
    if (parts.length < 2) continue
    const key = `${parts[0]}-${parts[1]}`
    if (!map[key]) map[key] = { lotes: 0, valor: 0, qtd: 0 }
    map[key].lotes++
    map[key].valor += l.valorDevido
    map[key].qtd += l.qtdAnalisada
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, v]) => {
      const [year, month] = key.split('-').map(Number)
      // new Date(year, month-1, 1) usa horário local — sem risco de deslocamento
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
