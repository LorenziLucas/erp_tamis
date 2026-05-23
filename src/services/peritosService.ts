import { supabase } from '../lib/supabaseClient'
import type { Perito } from '../types/cobrancas'

interface PeritoDB {
  id: string
  nome: string
  cpf: string | null
  user_id: string
  created_at: string
}

function dbToPerito(row: PeritoDB): Perito {
  return { id: row.id, nome: row.nome, cpf: row.cpf, userId: row.user_id }
}

export async function listarPeritos() {
  const { data, error } = await supabase
    .from('peritos')
    .select('*')
    .order('nome')

  return { data: (data as PeritoDB[] | null)?.map(dbToPerito) ?? [], error }
}

/** Cria ou atualiza o CPF de um perito pelo nome (upsert). */
export async function upsertPerito(nome: string, cpf: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: new Error('Não autenticado') }

  const { error } = await supabase
    .from('peritos')
    .upsert({ nome, cpf, user_id: user.id }, { onConflict: 'nome,user_id' })

  return { error }
}
