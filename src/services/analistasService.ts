import { supabase } from '../lib/supabaseClient'
import type { Analista } from '../types/analista'

interface AnalistaDB {
  id: string
  nome: string
  email: string | null
  user_id: string
  created_at: string
}

function dbToAnalista(row: AnalistaDB): Analista {
  return { id: row.id, nome: row.nome, email: row.email }
}

export async function listarAnalistas(): Promise<{ data: Analista[]; error: unknown }> {
  const { data, error } = await supabase
    .from('analistas')
    .select('*')
    .order('nome')

  return { data: (data as AnalistaDB[] | null)?.map(dbToAnalista) ?? [], error }
}

export async function createAnalista(nome: string, email: string | null): Promise<{ data: Analista | null; error: unknown }> {
  const { data, error } = await supabase
    .from('analistas')
    .insert({ nome, email })
    .select('*')
    .single()

  return { data: data ? dbToAnalista(data as AnalistaDB) : null, error }
}

export async function updateAnalista(id: string, nome: string, email: string | null): Promise<{ error: unknown }> {
  const { error } = await supabase
    .from('analistas')
    .update({ nome, email })
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
