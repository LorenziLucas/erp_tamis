import { create } from 'zustand'
import type { BoardComentario } from '../types/board'
import {
  listarComentarios,
  criarComentario,
  atualizarComentario,
  deletarComentario,
} from '../services/boardComentariosService'
import { notificarEmail, montarDestinatarios } from '../services/notificacoesService'
import { useAnalistasStore } from './analistasStore'
import { useBoardPeritosStore } from './boardPeritosStore'

function escapeHtml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

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

    const item = useBoardPeritosStore.getState().items.find((i) => i.id === boardPeritoId)
    const peritoNome = item?.nome ?? 'perito'
    const peritoNomeEscapado = escapeHtml(peritoNome)
    const regiaoEscapada = escapeHtml(item?.regiao ?? '')
    const analistas = useAnalistasStore.getState().analistas
    const autorLabel = autorEmail ?? 'Alguém'
    const textoEscapado = escapeHtml(texto)

    const emailsAdmins = analistas.filter((a) => a.tipoAcesso === 'admin').map((a) => a.email)
    const emailsMencionados = mencionados.map((analistaId) => analistas.find((a) => a.id === analistaId)?.email)
    const chavesMencionados = new Set(
      emailsMencionados.filter((email): email is string => !!email).map((email) => email.toLowerCase()),
    )

    const destinatarios = montarDestinatarios([...emailsAdmins, ...emailsMencionados], autorEmail)

    destinatarios.forEach((to) => {
      const foiMencionado = chavesMencionados.has(to.toLowerCase())
      const subject = foiMencionado
        ? `Você foi mencionado em um comentário sobre ${peritoNome}`
        : `Novo comentário sobre ${peritoNome}`
      const introducao = foiMencionado
        ? `${escapeHtml(autorLabel)} mencionou você em um comentário sobre`
        : `${escapeHtml(autorLabel)} comentou sobre`
      notificarEmail({
        to,
        subject,
        html: `<p>${introducao} <strong>${peritoNomeEscapado}</strong> (${regiaoEscapada}):</p><p>${textoEscapado}</p>`,
      })
    })
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
