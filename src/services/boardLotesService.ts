import { supabase } from '../lib/supabaseClient'
import type { BoardLote } from '../types/board'

interface BoardLoteDB {
  id: string
  board_perito_id: string
  numero: number
  mes_ref: string | null
  tipo: string | null
  formato: string | null
  entregue: boolean
  ordem: number
  created_at: string
  updated_at: string
}

function dbToBoardLote(row: BoardLoteDB): BoardLote {
  return {
    id:            row.id,
    boardPeritoId: row.board_perito_id,
    numero:        row.numero,
    mesRef:        row.mes_ref,
    tipo:          row.tipo,
    formato:       row.formato,
    entregue:      row.entregue,
    ordem:         row.ordem,
  }
}

export async function listarBoardLotes(boardPeritoId: string): Promise<{ data: BoardLote[]; error: unknown }> {
  const { data, error } = await supabase
    .from('board_lotes')
    .select('*')
    .eq('board_perito_id', boardPeritoId)
    .order('ordem')
    .order('numero')

  return { data: (data as BoardLoteDB[] | null)?.map(dbToBoardLote) ?? [], error }
}

export async function criarBoardLote(
  boardPeritoId: string,
  dados: { numero: number; mesRef?: string | null; tipo?: string | null; formato?: string | null; ordem?: number },
): Promise<{ data: BoardLote | null; error: unknown }> {
  const { data, error } = await supabase
    .from('board_lotes')
    .insert({
      board_perito_id: boardPeritoId,
      numero:  dados.numero,
      mes_ref: dados.mesRef ?? null,
      tipo:    dados.tipo ?? null,
      formato: dados.formato ?? null,
      ordem:   dados.ordem ?? 0,
    })
    .select('*')
    .single()

  return { data: data ? dbToBoardLote(data as BoardLoteDB) : null, error }
}

export async function atualizarBoardLote(
  id: string,
  updates: Partial<{ numero: number; mesRef: string | null; tipo: string | null; formato: string | null; entregue: boolean; ordem: number }>,
): Promise<{ error: unknown }> {
  const dbUpdates: Record<string, unknown> = {}
  if ('numero'   in updates) dbUpdates.numero   = updates.numero
  if ('mesRef'   in updates) dbUpdates.mes_ref  = updates.mesRef
  if ('tipo'     in updates) dbUpdates.tipo     = updates.tipo
  if ('formato'  in updates) dbUpdates.formato  = updates.formato
  if ('entregue' in updates) dbUpdates.entregue = updates.entregue
  if ('ordem'    in updates) dbUpdates.ordem    = updates.ordem

  const { error } = await supabase
    .from('board_lotes')
    .update(dbUpdates)
    .eq('id', id)

  return { error }
}

export async function deletarBoardLote(id: string): Promise<{ error: unknown }> {
  const { error } = await supabase
    .from('board_lotes')
    .delete()
    .eq('id', id)

  return { error }
}
