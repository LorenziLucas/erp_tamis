import { create } from 'zustand'
import type { BoardHistorico, BoardPerito, BoardStatus } from '../types/board'
import { BOARD_STATUS, FLUXO_STATUS } from '../types/board'
import {
  listarBoardPeritos,
  atualizarBoardPerito,
  deletarBoardPerito,
  listarAnalistasDoPerito,
  vincularAnalista,
  desvincularAnalista,
} from '../services/boardPeritosService'
import { notificarEmail, montarDestinatarios } from '../services/notificacoesService'
import { registrarHistorico, listarHistorico } from '../services/boardHistoricoService'
import { useAnalistasStore } from './analistasStore'
import { useAuthStore } from './authStore'

function statusLabel(status: BoardStatus): string {
  return BOARD_STATUS.find((s) => s.value === status)?.label ?? status
}

interface BoardPeritosState {
  items:   BoardPerito[]
  loading: boolean
  error:   string | null

  analistasByPerito: Record<string, { id: string; nome: string }[]>
  historicoByPerito: Record<string, BoardHistorico[]>

  fetchBoard: () => Promise<void>
  updateItem: (
    id: string,
    updates: Partial<{
      status:       BoardStatus
      provisionado: number
      entregue:     number
      analista:     string | null
      ordem:        number
      planilhaUrl:  string | null
    }>,
  ) => Promise<void>
  deleteItem: (id: string) => Promise<void>

  fetchAnalistasDoPerito: (boardPeritoId: string) => Promise<void>
  addAnalista:    (boardPeritoId: string, analistaId: string) => Promise<void>
  removeAnalista: (boardPeritoId: string, analistaId: string) => Promise<void>

  fetchHistorico: (boardPeritoId: string) => Promise<void>
}

export const useBoardPeritosStore = create<BoardPeritosState>((set) => ({
  items:   [],
  loading: false,
  error:   null,

  analistasByPerito: {},
  historicoByPerito: {},

  fetchBoard: async () => {
    set({ loading: true, error: null })
    const { data, error } = await listarBoardPeritos()
    if (error) { set({ loading: false, error: String(error) }); return }
    set({ items: data, loading: false })
  },

  updateItem: async (id, updates) => {
    const itemAnterior = useBoardPeritosStore.getState().items.find((i) => i.id === id)
    const statusMudou = 'status' in updates && !!updates.status && updates.status !== itemAnterior?.status

    const dbUpdates = statusMudou
      ? { ...updates, statusChangedAt: new Date().toISOString() }
      : updates

    const { error } = await atualizarBoardPerito(id, dbUpdates)
    if (error) {
      const message = String(error)
      set({ error: message })
      throw new Error(message)
    }
    set((state) => ({
      items: state.items.map((item) => (item.id === id ? { ...item, ...dbUpdates } : item)),
    }))

    if (statusMudou && itemAnterior && updates.status) {
      const autorEmail = useAuthStore.getState().username || null
      registrarHistorico(
        id,
        'status',
        `moveu de ${statusLabel(itemAnterior.status)} para ${statusLabel(updates.status)}`,
        autorEmail,
      )

      const statusOrigem  = itemAnterior.status
      const statusDestino = updates.status
      if (FLUXO_STATUS.includes(statusOrigem) && FLUXO_STATUS.includes(statusDestino)) {
        try {
          if (!useBoardPeritosStore.getState().analistasByPerito[id]) {
            await useBoardPeritosStore.getState().fetchAnalistasDoPerito(id)
          }
          const vinculados = useBoardPeritosStore.getState().analistasByPerito[id] ?? []
          const analistas  = useAnalistasStore.getState().analistas

          const emailsVinculados = vinculados.map((v) => analistas.find((a) => a.id === v.id)?.email)
          const emailsAdmins     = analistas.filter((a) => a.tipoAcesso === 'admin').map((a) => a.email)

          const destinatarios = montarDestinatarios([...emailsVinculados, ...emailsAdmins], autorEmail)

          if (destinatarios.length > 0) {
            const nomePerito   = itemAnterior.nome
            const origemLabel  = statusLabel(statusOrigem)
            const destinoLabel = statusLabel(statusDestino)
            destinatarios.forEach((to) => {
              notificarEmail({
                to,
                subject: `${nomePerito} avançou para ${destinoLabel}`,
                html: `<p>O perito <strong>${nomePerito}</strong> foi movido de <strong>${origemLabel}</strong> para <strong>${destinoLabel}</strong>.</p><p>Movimentação realizada por ${autorEmail ?? 'usuário desconhecido'}.</p>`,
              })
            })
          }
        } catch (err) {
          console.warn('[boardPeritosStore] Falha ao notificar movimentação de status:', err)
        }
      }
    }
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

    const analista = useAnalistasStore.getState().analistas.find((a) => a.id === analistaId)
    const perito = useBoardPeritosStore.getState().items.find((i) => i.id === boardPeritoId)
    if (analista?.email && perito) {
      notificarEmail({
        to: analista.email,
        subject: `Você foi vinculado ao perito ${perito.nome}`,
        html: `<p>Olá ${analista.nome},</p><p>Você foi vinculado ao acompanhamento do perito <strong>${perito.nome}</strong> no ERP Tamis.</p>`,
      })
    }

    if (analista) {
      const autorEmail = useAuthStore.getState().username || null
      registrarHistorico(boardPeritoId, 'analista_add', `adicionou ${analista.nome} ao card`, autorEmail)
    }
  },

  removeAnalista: async (boardPeritoId, analistaId) => {
    const analista = useAnalistasStore.getState().analistas.find((a) => a.id === analistaId)

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

    if (analista) {
      const autorEmail = useAuthStore.getState().username || null
      registrarHistorico(boardPeritoId, 'analista_remove', `removeu ${analista.nome} do card`, autorEmail)
    }
  },

  fetchHistorico: async (boardPeritoId) => {
    const { data, error } = await listarHistorico(boardPeritoId)
    if (error) { set({ error: String(error) }); return }
    set((state) => ({ historicoByPerito: { ...state.historicoByPerito, [boardPeritoId]: data } }))
  },
}))
