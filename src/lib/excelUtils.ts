import * as XLSX from 'xlsx'
import type { Lote } from '../types'
import { COLUMN_MAP, REGIAO_MAP } from '../types'
import { excelSerialToIso, generateId, calcDias } from './utils'

export interface ImportResult {
  lotes: Lote[]
  errors: string[]
  total: number
  duplicates: number   // linhas ignoradas por já existirem (na base ou no próprio arquivo)
}

/** Chave de unicidade: todas as colunas relevantes concatenadas.
 *  Apenas registros 100% idênticos em todos os campos são considerados duplicata. */
function dedupeKey(l: {
  perito: string; lote: number; trt: string; analista: string
  envio: string; entrega: string; mesRef: string
  qtdAnalisada: number; qtdDias: number; analise: string
  tipo: string; formato: string; valorDevido: number
  pago: boolean; qtdTotal: number; qtdP: number; totalSentencas: number
}): string {
  return [
    l.perito.toLowerCase().trim(),
    l.lote,
    l.trt,
    l.analista.toLowerCase().trim(),
    l.envio,
    l.entrega,
    l.mesRef,
    l.qtdAnalisada,
    l.qtdDias,
    l.analise,
    l.tipo,
    l.formato,
    l.valorDevido,
    l.pago ? '1' : '0',
    l.qtdTotal,
    l.qtdP,
    l.totalSentencas,
  ].join('|')
}

export interface ImportPreview {
  headers: string[]
  rows: Record<string, unknown>[]
  total: number
  errors: string[]
}

function normalizeHeader(h: string): string {
  return h.trim().toUpperCase().replace(/\s+/g, ' ')
}

/** Remove acentos para comparação de cabeçalhos */
function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/** Converte vários formatos de data para ISO "YYYY-MM-DD" sem ambiguidade de fuso */
function toDate(val: unknown): string {
  if (val === null || val === undefined || val === '') return ''

  // Serial numérico do Excel
  if (typeof val === 'number') return excelSerialToIso(val)

  if (typeof val === 'string') {
    const s = val.trim()
    if (!s) return ''

    // Já está em ISO: YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s

    // Formato brasileiro: DD/MM/AAAA
    const brFull = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (brFull) {
      const [, d, m, y] = brFull
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    }

    // Formato mês/ano: MM/AAAA ou M/AAAA (usado em mesRef)
    const brMes = s.match(/^(\d{1,2})\/(\d{4})$/)
    if (brMes) {
      const [, m, y] = brMes
      return `${y}-${m.padStart(2, '0')}-01`
    }

    // Fallback: tenta parse genérico e retorna a parte de data UTC (evita shift)
    const d = new Date(s)
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
    return ''
  }

  if (val instanceof Date) return val.toISOString().split('T')[0]
  return ''
}

/** ISO "YYYY-MM-DD" → "DD/MM/AAAA" (formato brasileiro) */
function isoToBr(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${(d ?? '').padStart(2, '0')}/${(m ?? '').padStart(2, '0')}/${y ?? ''}`
}

/** ISO "YYYY-MM-01" → "MM/AAAA" (mês de referência brasileiro) */
function isoToMesRefBr(iso: string): string {
  if (!iso) return ''
  const [y, m] = iso.split('-')
  return `${(m ?? '').padStart(2, '0')}/${y ?? ''}`
}

function toNum(val: unknown): number {
  if (val === null || val === undefined || val === '') return 0
  const n = Number(val)
  return isNaN(n) ? 0 : n
}

function toBool(val: unknown): boolean {
  if (typeof val === 'boolean') return val
  if (typeof val === 'string') return val.toLowerCase() === 'true' || val === '1' || val.toLowerCase() === 'sim'
  if (typeof val === 'number') return val === 1
  return false
}

function trtFromRegiao(regiao: string): string {
  const upper = regiao.toUpperCase()
  // IMPORTANTE: TRT12 deve ser verificado ANTES de TRT1 (conflito de substring: "TRT12".includes("TRT1") === true)
  if (upper.includes('TRT12') || upper.includes('TRT 12') || upper.includes('(SC)')) return 'TRT_12'
  if (upper.includes('TRT1')  || upper.includes('TRT 1')  || upper.includes('(RJ)')) return 'TRT_1'
  if (upper.includes('TRT4')  || upper.includes('TRT 4')  || upper.includes('(RS)')) return 'TRT_4'
  if (upper.includes('TRT6')  || upper.includes('TRT 6')  || upper.includes('(PE)')) return 'TRT_6'
  return upper.replace(/\s/g, '_')
}

export function parseXlsx(file: File): Promise<ImportPreview> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array', cellDates: false })
        const sheet = wb.Sheets[wb.SheetNames[0]]
        const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
          defval: '',
          raw: true,
        })

        if (raw.length === 0) {
          resolve({ headers: [], rows: [], total: 0, errors: ['Planilha vazia'] })
          return
        }

        const headers = Object.keys(raw[0])
        const errors: string[] = []
        // Colunas obrigatórias — comparadas sem acentos para evitar falsos positivos
        const requiredCols = ['REGIAO', 'PERITO', 'QTD ANALISADA', 'VALOR DEVIDO']
        const normalizedHeadersNoAccent = headers.map((h) => stripAccents(normalizeHeader(h)))

        for (const req of requiredCols) {
          if (!normalizedHeadersNoAccent.some((h) => h.includes(req))) {
            const displayName = req === 'REGIAO' ? 'REGIÃO' : req
            errors.push(`Coluna não encontrada: "${displayName}"`)
          }
        }

        resolve({ headers, rows: raw.slice(0, 5), total: raw.length, errors })
      } catch (err) {
        resolve({ headers: [], rows: [], total: 0, errors: [`Erro ao ler arquivo: ${String(err)}`] })
      }
    }
    reader.readAsArrayBuffer(file)
  })
}

export function importXlsx(file: File, existingLotes: Lote[] = []): Promise<ImportResult> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array', cellDates: false })
        const sheet = wb.Sheets[wb.SheetNames[0]]
        const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
          defval: '',
          raw: true,
        })

        const errors: string[] = []
        const lotes: Lote[] = []
        let duplicates = 0

        // Constrói o set de chaves já existentes na base (todas as colunas)
        const seenKeys = new Set(existingLotes.map((l) => dedupeKey(l)))

        // Build header→field map
        const firstRow = raw[0] ?? {}
        const colToField = new Map<string, keyof Lote>()
        for (const col of Object.keys(firstRow)) {
          const norm = normalizeHeader(col)
          const mapped = COLUMN_MAP[norm] ?? COLUMN_MAP[col]
          if (mapped) colToField.set(col, mapped as keyof Lote)
        }

        raw.forEach((row, i) => {
          try {
            const get = (field: keyof Lote) => {
              for (const [col, f] of colToField) {
                if (f === field) return row[col]
              }
              return undefined
            }

            const regiao = String(get('regiao') ?? '')
            if (!regiao) { errors.push(`Linha ${i + 2}: região vazia`); return }

            const trt = trtFromRegiao(regiao)
            const regiaoLabel = REGIAO_MAP[trt] ?? regiao

            const envio = toDate(get('envio'))
            const entrega = toDate(get('entrega'))
            const mesRef = toDate(get('mesRef'))

            // qtdDias sempre calculado pelas regras de negócio:
            // mesmo dia (envio === entrega) → 1 · sem entrega → 0
            const qtdDias = calcDias(envio, entrega)

            const rawAnalise = String(get('analise') ?? '1ª').trim()
            const analise = rawAnalise === '2ª' ? '2ª' : '1ª'

            const rawTipo = String(get('tipo') ?? 'PJE').trim().toUpperCase()
            const tipo = (['PJE', 'MISTO', 'FÍSICO', 'FISICO'].includes(rawTipo)
              ? rawTipo.replace('FISICO', 'FÍSICO')
              : 'PJE') as 'PJE' | 'MISTO' | 'FÍSICO'

            const rawFormato = String(get('formato') ?? 'NOVO').trim().toUpperCase()
            const formato = rawFormato === 'REVISÃO' || rawFormato === 'REVISAO'
              ? 'REVISÃO' : 'NOVO'

            const perito    = String(get('perito') ?? '').trim()
            const loteNum   = toNum(get('lote'))
            const analista  = String(get('analista') ?? '').trim()
            const valorDevido     = toNum(get('valorDevido'))
            const pago            = toBool(get('pago'))
            const qtdAnalisada    = toNum(get('qtdAnalisada'))
            const qtdTotal        = toNum(get('qtdTotal'))
            const qtdP            = toNum(get('qtdP'))
            const totalSentencas  = toNum(get('totalSentencas'))

            // Monta objeto candidato para gerar a chave com TODOS os campos
            const candidate = {
              perito, lote: loteNum, trt, analista,
              envio, entrega, mesRef, qtdDias,
              analise, tipo, formato,
              valorDevido, pago,
              qtdAnalisada, qtdTotal, qtdP, totalSentencas,
            }
            const key = dedupeKey(candidate)

            // Ignora apenas se TODOS os campos forem idênticos
            if (seenKeys.has(key)) {
              duplicates++
              return
            }
            seenKeys.add(key)

            lotes.push({
              id: generateId(),
              trt,
              regiao: regiaoLabel,
              ...candidate,
              analise: analise as '1ª' | '2ª',
              tipo: tipo as 'PJE' | 'MISTO' | 'FÍSICO',
              formato: formato as 'NOVO' | 'REVISÃO',
            })
          } catch (err) {
            errors.push(`Linha ${i + 2}: ${String(err)}`)
          }
        })

        resolve({ lotes, errors, total: raw.length, duplicates })
      } catch (err) {
        resolve({ lotes: [], errors: [`Erro ao processar arquivo: ${String(err)}`], total: 0, duplicates: 0 })
      }
    }
    reader.readAsArrayBuffer(file)
  })
}

export function exportToXlsx(lotes: Lote[], filename = 'lotes-exportado.xlsx'): void {
  const rows = lotes.map((l) => ({
    'REGIÃO': l.regiao,
    'PERITO': l.perito,
    'LOTE': l.lote,
    'ANALISTA': l.analista,
    'QTD ANALISADA': l.qtdAnalisada,
    'ANÁLISE': l.analise,
    'TIPO': l.tipo,
    'FORMATO': l.formato,
    'ENVIO': isoToBr(l.envio),
    'ENTREGA': isoToBr(l.entrega),
    'MÊS REF.': isoToMesRefBr(l.mesRef),
    'QTD DIAS': l.qtdDias,
    'VALOR DEVIDO': l.valorDevido,
    'PAGO': l.pago ? 'SIM' : 'NÃO',
    'QTD TOTAL': l.qtdTotal,
    'QTD DE "P"': l.qtdP,
    'TOTAL SENTENÇAS': l.totalSentencas,
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Lotes')
  XLSX.writeFile(wb, filename)
}

export function downloadTemplate(): void {
  const ws = XLSX.utils.aoa_to_sheet([
    ['REGIÃO','PERITO','LOTE','ANALISTA','QTD ANALISADA','ANÁLISE','TIPO','FORMATO','ENVIO','ENTREGA','MÊS REF.','QTD DIAS','VALOR DEVIDO','PAGO','QTD TOTAL','QTD DE "P"','TOTAL SENTENÇAS'],
    ['TRT4 (RS)','João da Silva','1','Mabel Pilla',350,'1ª','PJE','NOVO','06/01/2025','10/01/2025','01/2025',4,525,'TRUE',350,12,18500],
  ])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Modelo')
  XLSX.writeFile(wb, 'modelo-importacao.xlsx')
}
