import { supabase } from '../lib/supabaseClient'
import type { BoardHistorico } from '../types/board'

interface BoardHistoricoDB {
  id: string
  board_perito_id: string
  autor_email: string | null
  tipo: string
  descricao: string
  created_at: string
}

function dbToBoardHistorico(row: BoardHistoricoDB): BoardHistorico {
  return {
    id:            row.id,
    boardPeritoId: row.board_perito_id,
    autorEmail:    row.autor_email,
    tipo:          row.tipo,
    descricao:     row.descricao,
    createdAt:     row.created_at,
  }
}

export async function registrarHistorico(
  boardPeritoId: string,
  tipo: string,
  descricao: string,
  autorEmail: string | null,
): Promise<void> {
  try {
    const { error } = await supabase
      .from('board_historico')
      .insert({
        board_perito_id: boardPeritoId,
        tipo,
        descricao,
        autor_email: autorEmail,
      })
    if (error) {
      console.warn('[boardHistoricoService] Falha ao registrar histórico:', error)
    }
  } catch (err) {
    console.warn('[boardHistoricoService] Falha ao registrar histórico:', err)
  }
}

export async function listarHistorico(boardPeritoId: string): Promise<{ data: BoardHistorico[]; error: unknown }> {
  const { data, error } = await supabase
    .from('board_historico')
    .select('*')
    .eq('board_perito_id', boardPeritoId)
    .order('created_at', { ascending: true })

  return { data: (data as BoardHistoricoDB[] | null)?.map(dbToBoardHistorico) ?? [], error }
}
