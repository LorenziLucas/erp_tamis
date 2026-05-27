/**
 * lotesService — CRUD de lotes usando Supabase como backend.
 * Todas as funções retornam { data, error } no padrão do Supabase.
 */
import { supabase } from '../lib/supabaseClient'
import type { Lote } from '../types'

// ── Tipo do banco (snake_case) → mapeado para/de Lote (camelCase) ─────────────

export interface LoteDB {
  id:             string
  trt:            string
  regiao:         string
  perito:         string
  trt_id:         string | null
  perito_id:      string | null
  lote:           number
  analista:       string
  qtd_analisada:  number
  analise:        string
  tipo:           string
  formato:        string
  envio:          string
  entrega:        string
  mes_ref:        string
  qtd_dias:       number
  valor_devido:   number
  pago:           boolean
  qtd_total:      number
  qtd_p:          number
  total_sentencas:number
  user_id:        string
  created_at:     string
  updated_at:     string
}

// ── Conversões ────────────────────────────────────────────────────────────────

export function dbToLote(row: LoteDB): Lote {
  return {
    id:             row.id,
    trt:            row.trt,
    regiao:         row.regiao,
    perito:         row.perito,
    trtId:          row.trt_id ?? undefined,
    peritoId:       row.perito_id ?? undefined,
    lote:           row.lote,
    analista:       row.analista,
    qtdAnalisada:   row.qtd_analisada,
    analise:        row.analise as Lote['analise'],
    tipo:           row.tipo as Lote['tipo'],
    formato:        row.formato as Lote['formato'],
    envio:          row.envio,
    entrega:        row.entrega,
    mesRef:         row.mes_ref,
    qtdDias:        row.qtd_dias,
    valorDevido:    row.valor_devido,
    pago:           row.pago,
    qtdTotal:       row.qtd_total,
    qtdP:           row.qtd_p,
    totalSentencas: row.total_sentencas,
  }
}

export function loteToDb(lote: Omit<Lote, 'id'>, userId: string): Omit<LoteDB, 'id' | 'created_at' | 'updated_at'> {
  return {
    trt:             lote.trt,
    regiao:          lote.regiao,
    perito:          lote.perito,
    trt_id:          lote.trtId ?? null,
    perito_id:       lote.peritoId ?? null,
    lote:            Math.round(lote.lote),
    analista:        lote.analista,
    qtd_analisada:   Math.round(lote.qtdAnalisada),
    analise:         lote.analise,
    tipo:            lote.tipo,
    formato:         lote.formato,
    envio:           lote.envio,
    entrega:         lote.entrega,
    mes_ref:         lote.mesRef,
    qtd_dias:        Math.round(lote.qtdDias),
    valor_devido:    lote.valorDevido,
    pago:            lote.pago,
    qtd_total:       Math.round(lote.qtdTotal),
    qtd_p:           Math.round(lote.qtdP),
    total_sentencas: Math.round(lote.totalSentencas),
    user_id:         userId,
  }
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

/** Lista todos os lotes do usuário autenticado com filtros opcionais */
export async function listarLotes(opts?: {
  mesRef?: string   // 'YYYY-MM'
  pago?: boolean
  page?: number
  pageSize?: number
}) {
  const { mesRef, pago, page = 1, pageSize = 1000 } = opts ?? {}
  const from = (page - 1) * pageSize
  const to   = from + pageSize - 1

  let query = supabase
    .from('lotes')
    .select('*', { count: 'exact' })
    .order('envio', { ascending: false })
    .range(from, to)

  if (mesRef) {
    // Filtra por prefixo YYYY-MM no campo mes_ref
    query = query.like('mes_ref', `${mesRef}%`)
  }
  if (pago !== undefined) {
    query = query.eq('pago', pago)
  }

  const { data, error, count } = await query
  return {
    data: (data as LoteDB[] | null)?.map(dbToLote) ?? [],
    count: count ?? 0,
    error,
  }
}

/** Busca um lote pelo ID */
export async function buscarLotePorId(id: string) {
  const { data, error } = await supabase
    .from('lotes')
    .select('*')
    .eq('id', id)
    .single()

  return {
    data: data ? dbToLote(data as LoteDB) : null,
    error,
  }
}

/** Cria um novo lote. Requer usuário autenticado. */
export async function criarLote(lote: Omit<Lote, 'id'>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: new Error('Usuário não autenticado') }

  const payload = loteToDb(lote, user.id)
  const { data, error } = await supabase
    .from('lotes')
    .insert(payload)
    .select()
    .single()

  return {
    data: data ? dbToLote(data as LoteDB) : null,
    error,
  }
}

/** Cria múltiplos lotes de uma vez (importação em batch) */
export async function criarLotes(lotes: Omit<Lote, 'id'>[]) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: [], error: new Error('Usuário não autenticado') }

  const payloads = lotes.map((l) => loteToDb(l, user.id))
  const { data, error } = await supabase
    .from('lotes')
    .insert(payloads)
    .select()

  return {
    data: (data as LoteDB[] | null)?.map(dbToLote) ?? [],
    error,
  }
}

/** Atualiza campos de um lote existente */
export async function atualizarLote(id: string, parcial: Partial<Omit<Lote, 'id'>>) {
  // Converte apenas os campos enviados de camelCase para snake_case
  const patch: Partial<LoteDB> = {}
  if (parcial.trt            !== undefined) patch.trt             = parcial.trt
  if (parcial.regiao         !== undefined) patch.regiao          = parcial.regiao
  if (parcial.perito         !== undefined) patch.perito          = parcial.perito
  if (parcial.trtId          !== undefined) patch.trt_id          = parcial.trtId ?? null
  if (parcial.peritoId       !== undefined) patch.perito_id       = parcial.peritoId ?? null
  if (parcial.lote           !== undefined) patch.lote            = parcial.lote
  if (parcial.analista       !== undefined) patch.analista        = parcial.analista
  if (parcial.qtdAnalisada   !== undefined) patch.qtd_analisada   = parcial.qtdAnalisada
  if (parcial.analise        !== undefined) patch.analise         = parcial.analise
  if (parcial.tipo           !== undefined) patch.tipo            = parcial.tipo
  if (parcial.formato        !== undefined) patch.formato         = parcial.formato
  if (parcial.envio          !== undefined) patch.envio           = parcial.envio
  if (parcial.entrega        !== undefined) patch.entrega         = parcial.entrega
  if (parcial.mesRef         !== undefined) patch.mes_ref         = parcial.mesRef
  if (parcial.qtdDias        !== undefined) patch.qtd_dias        = parcial.qtdDias
  if (parcial.valorDevido    !== undefined) patch.valor_devido    = parcial.valorDevido
  if (parcial.pago           !== undefined) patch.pago            = parcial.pago
  if (parcial.qtdTotal       !== undefined) patch.qtd_total       = parcial.qtdTotal
  if (parcial.qtdP           !== undefined) patch.qtd_p           = parcial.qtdP
  if (parcial.totalSentencas !== undefined) patch.total_sentencas = parcial.totalSentencas

  const { data, error } = await supabase
    .from('lotes')
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  return {
    data: data ? dbToLote(data as LoteDB) : null,
    error,
  }
}

/** Deleta um lote pelo ID */
export async function deletarLote(id: string) {
  const { error } = await supabase
    .from('lotes')
    .delete()
    .eq('id', id)

  return { error }
}
