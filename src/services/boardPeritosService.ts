import { supabase } from '../lib/supabaseClient'
import type { BoardPerito, BoardStatus } from '../types/board'

interface BoardPeritoDB {
  id: string
  perito_id: string
  nome: string
  regiao: string
  status: BoardStatus
  analista: string | null
  provisionado: number
  entregue: number
  mes_ref: string | null
  ordem: number
  user_id: string
  created_at: string
  updated_at: string
}

function dbToBoardPerito(row: BoardPeritoDB): BoardPerito {
  return {
    id:           row.id,
    peritoId:     row.perito_id,
    nome:         row.nome,
    regiao:       row.regiao,
    status:       row.status,
    analista:     row.analista,
    provisionado: row.provisionado,
    entregue:     row.entregue,
    mesRef:       row.mes_ref,
    ordem:        row.ordem,
  }
}

export async function listarBoardPeritos(): Promise<{ data: BoardPerito[]; error: unknown }> {
  const { data, error } = await supabase
    .from('board_peritos')
    .select('*')
    .order('status')
    .order('ordem')

  return { data: (data as BoardPeritoDB[] | null)?.map(dbToBoardPerito) ?? [], error }
}

export async function atualizarBoardPerito(
  id: string,
  updates: Partial<{
    status:       BoardStatus
    provisionado: number
    entregue:     number
    regiao:       string
    analista:     string | null
    ordem:        number
  }>,
): Promise<{ error: unknown }> {
  const { error } = await supabase
    .from('board_peritos')
    .update(updates)
    .eq('id', id)

  return { error }
}

export async function deletarBoardPerito(id: string): Promise<{ error: unknown }> {
  const { error } = await supabase
    .from('board_peritos')
    .delete()
    .eq('id', id)

  return { error }
}
