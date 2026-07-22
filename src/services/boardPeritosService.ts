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
  planilha_url: string | null
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
    planilhaUrl:  row.planilha_url,
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
    planilhaUrl:  string | null
  }>,
): Promise<{ error: unknown }> {
  const { planilhaUrl, ...rest } = updates
  const dbUpdates: Record<string, unknown> = { ...rest }
  if ('planilhaUrl' in updates) dbUpdates.planilha_url = planilhaUrl

  const { error } = await supabase
    .from('board_peritos')
    .update(dbUpdates)
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

// ── Vínculos de analista (N:N) ────────────────────────────────────────────────

interface AnalistaLinkRow {
  analista_id: string
  analistas: { id: string; nome: string } | null
}

export async function listarAnalistasDoPerito(boardPeritoId: string): Promise<{ data: { id: string; nome: string }[]; error: unknown }> {
  const { data, error } = await supabase
    .from('board_perito_analista')
    .select('analista_id, analistas(id,nome)')
    .eq('board_perito_id', boardPeritoId)

  const analistas = (data as AnalistaLinkRow[] | null)
    ?.map((r) => r.analistas)
    .filter((a): a is { id: string; nome: string } => !!a) ?? []

  return { data: analistas, error }
}

export async function vincularAnalista(boardPeritoId: string, analistaId: string): Promise<{ error: unknown }> {
  const { error } = await supabase
    .from('board_perito_analista')
    .upsert(
      { board_perito_id: boardPeritoId, analista_id: analistaId },
      { onConflict: 'board_perito_id,analista_id', ignoreDuplicates: true },
    )

  return { error }
}

export async function desvincularAnalista(boardPeritoId: string, analistaId: string): Promise<{ error: unknown }> {
  const { error } = await supabase
    .from('board_perito_analista')
    .delete()
    .eq('board_perito_id', boardPeritoId)
    .eq('analista_id', analistaId)

  return { error }
}
