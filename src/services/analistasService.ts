import { supabase } from '../lib/supabaseClient'
import type { Analista, TipoAcessoAnalista } from '../types/analista'

interface AnalistaDB {
  id: string
  nome: string
  email: string | null
  user_id: string
  created_at: string
  tipo_acesso: TipoAcessoAnalista
}

function dbToAnalista(row: AnalistaDB): Analista {
  return { id: row.id, nome: row.nome, email: row.email, tipoAcesso: row.tipo_acesso }
}

export async function listarAnalistas(): Promise<{ data: Analista[]; error: unknown }> {
  const { data, error } = await supabase
    .from('analistas')
    .select('*')
    .order('nome')

  return { data: (data as AnalistaDB[] | null)?.map(dbToAnalista) ?? [], error }
}

export async function createAnalista(
  nome: string,
  email: string | null,
  tipoAcesso: TipoAcessoAnalista,
): Promise<{ data: Analista | null; error: unknown }> {
  const { data, error } = await supabase
    .from('analistas')
    .insert({ nome, email, tipo_acesso: tipoAcesso })
    .select('*')
    .single()

  return { data: data ? dbToAnalista(data as AnalistaDB) : null, error }
}

export async function updateAnalista(
  id: string,
  nome: string,
  email: string | null,
  tipoAcesso: TipoAcessoAnalista,
): Promise<{ error: unknown }> {
  const { error } = await supabase
    .from('analistas')
    .update({ nome, email, tipo_acesso: tipoAcesso })
    .eq('id', id)

  return { error }
}

export async function deletarAnalista(id: string): Promise<{ error: unknown }> {
  const { error } = await supabase
    .from('analistas')
    .delete()
    .eq('id', id)

  return { error }
}
