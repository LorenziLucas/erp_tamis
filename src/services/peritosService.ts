import { supabase } from '../lib/supabaseClient'
import type { Perito } from '../types/cobrancas'
import type { TRT, PeritoCadastro } from '../types'

// ── Tipos DB antigos (cobranças) ──────────────────────────────────────────────

interface OldPeritoDB {
  id: string
  nome: string
  cpf: string | null
  user_id: string | null
  created_at: string
}

function dbToPerito(row: OldPeritoDB): Perito {
  return { id: row.id, nome: row.nome, cpf: row.cpf, userId: row.user_id ?? '' }
}

// ── Tipos DB novos (gestão de peritos) ───────────────────────────────────────

interface TRTDB {
  id: string
  numero: number
  descricao: string
  cidade_sede: string
}

interface PeritoTRTDB {
  trt_id: string
  trts: TRTDB
}

interface PeritoCadastroDB {
  id: string
  nome: string
  perito_trt: PeritoTRTDB[]
}

interface PeritoCurtoRow {
  peritos: { id: string; nome: string }
}

function dbToTRT(row: TRTDB): TRT {
  return { id: row.id, numero: row.numero, descricao: row.descricao, cidadeSede: row.cidade_sede }
}

function dbToPeritoCadastro(row: PeritoCadastroDB): PeritoCadastro {
  return {
    id: row.id,
    nome: row.nome,
    trtsVinculados: row.perito_trt.map((pt) => dbToTRT(pt.trts)),
  }
}

// ── Funções antigas (usadas por cobranças) ────────────────────────────────────

export async function listarPeritos() {
  const { data, error } = await supabase
    .from('peritos')
    .select('*')
    .order('nome')

  return { data: (data as OldPeritoDB[] | null)?.map(dbToPerito) ?? [], error }
}

export async function upsertPerito(nome: string, cpf: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: new Error('Não autenticado') }

  const { error } = await supabase
    .from('peritos')
    .upsert({ nome, cpf, user_id: user.id }, { onConflict: 'nome,user_id' })

  return { error }
}

// ── Novas funções (gestão de peritos com TRTs) ────────────────────────────────

export async function getTRTs(): Promise<{ data: TRT[]; error: unknown }> {
  const { data, error } = await supabase
    .from('trts')
    .select('id,numero,descricao,cidade_sede')
    .order('numero')

  return { data: (data as TRTDB[] | null)?.map(dbToTRT) ?? [], error }
}

export async function getPeritos(): Promise<{ data: PeritoCadastro[]; error: unknown }> {
  const { data, error } = await supabase
    .from('peritos')
    .select('id,nome,perito_trt(trt_id,trts(id,numero,descricao,cidade_sede))')
    .order('nome')

  return { data: (data as PeritoCadastroDB[] | null)?.map(dbToPeritoCadastro) ?? [], error }
}

export async function getPeritosByTRT(trtId: string): Promise<{ data: { id: string; nome: string }[]; error: unknown }> {
  const { data, error } = await supabase
    .from('perito_trt')
    .select('peritos(id,nome)')
    .eq('trt_id', trtId)

  const peritos = (data as PeritoCurtoRow[] | null)
    ?.map((r) => r.peritos)
    .filter(Boolean)
    .sort((a, b) => a.nome.localeCompare(b.nome)) ?? []

  return { data: peritos, error }
}

export async function createPerito(nome: string, trtIds: string[]): Promise<{ data: PeritoCadastro | null; error: unknown }> {
  const { data: inserted, error: errInsert } = await supabase
    .from('peritos')
    .insert({ nome })
    .select('id,nome')
    .single()

  if (errInsert || !inserted) return { data: null, error: errInsert }

  if (trtIds.length > 0) {
    const links = trtIds.map((trt_id) => ({ perito_id: inserted.id, trt_id }))
    const { error: errLink } = await supabase.from('perito_trt').insert(links)
    if (errLink) return { data: null, error: errLink }
  }

  const { data: full, error: errFull } = await getPeritos()
  const created = full.find((p) => p.id === inserted.id) ?? null
  return { data: created, error: errFull }
}

export async function updatePerito(id: string, nome: string, trtIds: string[]): Promise<{ error: unknown }> {
  const { error: errNome } = await supabase
    .from('peritos')
    .update({ nome })
    .eq('id', id)

  if (errNome) return { error: errNome }

  const { error: errDel } = await supabase
    .from('perito_trt')
    .delete()
    .eq('perito_id', id)

  if (errDel) return { error: errDel }

  if (trtIds.length > 0) {
    const links = trtIds.map((trt_id) => ({ perito_id: id, trt_id }))
    const { error: errLink } = await supabase.from('perito_trt').insert(links)
    if (errLink) return { error: errLink }
  }

  return { error: null }
}
