import { create } from 'zustand'
import type { BoardLote } from '../types/board'
import {
  listarBoardLotes,
  criarBoardLote,
  atualizarBoardLote,
  deletarBoardLote,
} from '../services/boardLotesService'
import { registrarHistorico } from '../services/boardHistoricoService'
import { notificarEmail, montarDestinatarios } from '../services/notificacoesService'
import { useAuthStore } from './authStore'
import { useAnalistasStore } from './analistasStore'
import { useBoardPeritosStore } from './boardPeritosStore'

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

      try {
        if (!useBoardPeritosStore.getState().analistasByPerito[boardPeritoId]) {
          await useBoardPeritosStore.getState().fetchAnalistasDoPerito(boardPeritoId)
        }
        const vinculados = useBoardPeritosStore.getState().analistasByPerito[boardPeritoId] ?? []
        const analistas  = useAnalistasStore.getState().analistas

        const emailsVinculados = vinculados.map((v) => analistas.find((a) => a.id === v.id)?.email)
        const emailsAdmins     = analistas.filter((a) => a.tipoAcesso === 'admin').map((a) => a.email)

        const destinatarios = montarDestinatarios([...emailsVinculados, ...emailsAdmins], autorEmail)

        if (destinatarios.length > 0) {
          const perito     = useBoardPeritosStore.getState().items.find((i) => i.id === boardPeritoId)
          const peritoNome = perito?.nome ?? 'perito'
          const regiao     = perito?.regiao ?? ''
          const mesAno     = formatMesAno(loteAnterior.mesRef)
          destinatarios.forEach((to) => {
            notificarEmail({
              to,
              subject: `Lote concluído — ${peritoNome}`,
              html: `<p>O ${loteAnterior.numero}º lote do perito <strong>${peritoNome}</strong> (${regiao}), referente a ${mesAno}, foi marcado como entregue.</p><p>Concluído por ${autorEmail ?? 'usuário desconhecido'}.</p>`,
            })
          })
        }
      } catch (err) {
        console.warn('[boardLotesStore] Falha ao notificar conclusão de lote:', err)
      }
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
