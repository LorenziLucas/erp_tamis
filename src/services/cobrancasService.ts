import { supabase } from '../lib/supabaseClient'
import type { Cobranca } from '../types/cobrancas'

interface CobrancaDB {
  id: string
  perito: string
  cpf_perito: string | null
  regiao: string
  mes_ref: string | null
  data_envio: string | null
  valor: number
  tipo: string
  recebido: boolean
  data_recebimento: string | null
  nota_fiscal: string
  link_pdf: string | null
  user_id: string
  created_at: string
}

function dbToCobranca(row: CobrancaDB): Cobranca {
  return {
    id:              row.id,
    perito:          row.perito,
    cpfPerito:       row.cpf_perito,
    regiao:          row.regiao,
    mesRef:          row.mes_ref,
    dataEnvio:       row.data_envio,
    valor:           Number(row.valor),
    tipo:            row.tipo as Cobranca['tipo'],
    recebido:        row.recebido,
    dataRecebimento: row.data_recebimento,
    notaFiscal:      row.nota_fiscal as Cobranca['notaFiscal'],
    linkPdf:         row.link_pdf,
    userId:          row.user_id,
    createdAt:       row.created_at,
  }
}

function cobrancaToDb(c: Omit<Cobranca, 'id' | 'userId' | 'createdAt'>, userId: string) {
  return {
    perito:          c.perito,
    cpf_perito:      c.cpfPerito || null,
    regiao:          c.regiao,
    mes_ref:         c.mesRef || null,
    data_envio:      c.dataEnvio || null,
    valor:           c.valor,
    tipo:            c.tipo,
    recebido:        c.recebido,
    data_recebimento: c.dataRecebimento || null,
    nota_fiscal:     c.notaFiscal,
    link_pdf:        c.linkPdf || null,
    user_id:         userId,
  }
}

export async function listarCobrancas() {
  const { data, error } = await supabase
    .from('cobrancas')
    .select('*')
    .order('created_at', { ascending: false })

  return { data: (data as CobrancaDB[] | null)?.map(dbToCobranca) ?? [], error }
}

export async function criarCobranca(c: Omit<Cobranca, 'id' | 'userId' | 'createdAt'>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: new Error('Não autenticado') }

  const { data, error } = await supabase
    .from('cobrancas')
    .insert(cobrancaToDb(c, user.id))
    .select()
    .single()

  return { data: data ? dbToCobranca(data as CobrancaDB) : null, error }
}

export async function atualizarCobranca(id: string, c: Omit<Cobranca, 'id' | 'userId' | 'createdAt'>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: new Error('Não autenticado') }

  const { data, error } = await supabase
    .from('cobrancas')
    .update({ ...cobrancaToDb(c, user.id), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  return { data: data ? dbToCobranca(data as CobrancaDB) : null, error }
}

export async function deletarCobranca(id: string) {
  const { error } = await supabase.from('cobrancas').delete().eq('id', id)
  return { error }
}
