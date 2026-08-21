import { supabase } from '../lib/supabaseClient'
import type { BoardComentario } from '../types/board'

interface BoardComentarioDB {
  id: string
  board_perito_id: string
  autor_id: string
  autor_email: string | null
  texto: string
  mencionados: string[]
  created_at: string
  updated_at: string
  resolvido: boolean
  resolvido_por: string | null
  resolvido_em: string | null
}

function dbToBoardComentario(row: BoardComentarioDB): BoardComentario {
  return {
    id:            row.id,
    boardPeritoId: row.board_perito_id,
    autorId:       row.autor_id,
    autorEmail:    row.autor_email,
    texto:         row.texto,
    mencionados:   row.mencionados ?? [],
    createdAt:     row.created_at,
    updatedAt:     row.updated_at,
    resolvido:     row.resolvido,
    resolvidoPor:  row.resolvido_por,
    resolvidoEm:   row.resolvido_em,
  }
}

export async function listarComentarios(boardPeritoId: string): Promise<{ data: BoardComentario[]; error: unknown }> {
  const { data, error } = await supabase
    .from('board_comentarios')
    .select('*')
    .eq('board_perito_id', boardPeritoId)
    .order('created_at', { ascending: true })

  return { data: (data as BoardComentarioDB[] | null)?.map(dbToBoardComentario) ?? [], error }
}

export async function criarComentario(
  boardPeritoId: string,
  texto: string,
  mencionados: string[],
  autorId: string,
  autorEmail: string | null,
): Promise<{ data: BoardComentario | null; error: unknown }> {
  const { data, error } = await supabase
    .from('board_comentarios')
    .insert({
      board_perito_id: boardPeritoId,
      texto,
      mencionados,
      autor_id:    autorId,
      autor_email: autorEmail,
    })
    .select('*')
    .single()

  return { data: data ? dbToBoardComentario(data as BoardComentarioDB) : null, error }
}

export async function atualizarComentario(id: string, texto: string, mencionados: string[]): Promise<{ error: unknown }> {
  const { error } = await supabase
    .from('board_comentarios')
    .update({ texto, mencionados })
    .eq('id', id)

  return { error }
}

export async function deletarComentario(id: string): Promise<{ error: unknown }> {
  const { error } = await supabase
    .from('board_comentarios')
    .delete()
    .eq('id', id)

  return { error }
}

interface ToggleResolvidoDB {
  id: string
  resolvido: boolean
  resolvido_por: string | null
  resolvido_em: string | null
}

export async function toggleComentarioResolvido(
  id: string,
): Promise<{ data: Pick<BoardComentario, 'id' | 'resolvido' | 'resolvidoPor' | 'resolvidoEm'> | null; error: unknown }> {
  const { data, error } = await supabase
    .rpc('toggle_comentario_resolvido', { p_comentario_id: id })
    .single()

  if (!data) return { data: null, error }

  const row = data as ToggleResolvidoDB
  return {
    data: {
      id:           row.id,
      resolvido:    row.resolvido,
      resolvidoPor: row.resolvido_por,
      resolvidoEm:  row.resolvido_em,
    },
    error,
  }
}
