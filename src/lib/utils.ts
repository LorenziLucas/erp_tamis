import { type ClassValue, clsx } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/** R$ 44,8K  /  R$ 1,2M  /  R$ 850 */
export function formatCompact(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1).replace('.', ',')}M`
  if (abs >= 1_000)     return `R$ ${(value / 1_000).toFixed(1).replace('.', ',')}K`
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`
}

/** 36,2K  /  1,2M  /  850 */
export function formatCompactNum(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace('.', ',')}M`
  if (abs >= 1_000)     return `${(value / 1_000).toFixed(1).replace('.', ',')}K`
  return value.toLocaleString('pt-BR')
}

/** "YYYY-MM-DD" → "DD/MM/AAAA" sem criar objeto Date (evita deslocamento UTC) */
export function formatDate(iso: string): string {
  if (!iso) return '—'
  const parts = iso.split('-')
  if (parts.length < 3) return '—'
  const [y, m, d] = parts
  if (!y || !m || !d) return '—'
  return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`
}

const MONTHS_SHORT_PT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/** "YYYY-MM-DD" → "mmm-aa" (ex: mai-26), sem dependência de locale */
export function formatMonthYear(iso: string): string {
  if (!iso) return '—'
  const parts = iso.split('-')
  if (parts.length < 2) return '—'
  const y = Number(parts[0])
  const m = Number(parts[1])
  if (!y || !m || m < 1 || m > 12) return '—'
  return `${MONTHS_SHORT_PT[m - 1]}-${String(y).slice(-2)}`
}

export function excelSerialToIso(serial: number): string {
  if (!serial || serial < 1) return ''
  const date = new Date(Math.round((serial - 25569) * 86400 * 1000))
  return date.toISOString().split('T')[0]
}

export function diffDays(start: string, end: string): number {
  if (!start || !end) return 0
  const a = new Date(start).getTime()
  const b = new Date(end).getTime()
  if (isNaN(a) || isNaN(b)) return 0
  return Math.max(0, Math.round((b - a) / 86400000))
}

/** Como diffDays, mas quando envio === entrega (mesmo dia) retorna 1.
 *  0 fica reservado apenas para quando a entrega ainda não foi preenchida. */
export function calcDias(envio: string, entrega: string): number {
  if (!envio || !entrega) return 0
  const days = diffDays(envio, entrega)
  return days === 0 ? 1 : days
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  return arr.reduce<Record<string, T[]>>((acc, item) => {
    const k = key(item)
    ;(acc[k] ??= []).push(item)
    return acc
  }, {})
}
