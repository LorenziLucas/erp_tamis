export interface TRT {
  id: string
  numero: number
  descricao: string
  cidadeSede: string
}

export interface PeritoCadastro {
  id: string
  nome: string
  trtsVinculados: TRT[]
}

export interface Lote {
  id: string
  trt: string
  regiao: string
  perito: string
  trtId?: string
  peritoId?: string
  lote: number
  analista: string
  qtdAnalisada: number
  analise: '1ª' | '2ª'
  tipo: 'PJE' | 'MISTO' | 'FÍSICO' | 'CONF. ALVARÁ'
  formato: 'NOVO' | 'REVISÃO' | 'MISTO'
  envio: string        // ISO date string
  entrega: string      // ISO date string
  mesRef: string       // ISO date string
  qtdDias: number
  valorDevido: number
  pago: boolean
  qtdTotal: number
  qtdP: number
  totalSentencas: number
}

export const TRT_OPTIONS = [
  { value: 'TRT_1', label: 'TRT1 (RJ)' },
  { value: 'TRT_4', label: 'TRT4 (RS)' },
  { value: 'TRT_6', label: 'TRT6 (PE)' },
  { value: 'TRT_12', label: 'TRT12 (SC)' },
] as const

export const REGIAO_MAP: Record<string, string> = {
  TRT_1: 'TRT1 (RJ)',
  TRT_4: 'TRT4 (RS)',
  TRT_6: 'TRT6 (PE)',
  TRT_12: 'TRT12 (SC)',
}

export const ANALISTA_OPTIONS = [
  'Mabel Pilla',
  'Renatha Menezes',
  'Matheus Moreno',
  'Rodrigo Baptista',
]

export const TIPO_OPTIONS = ['PJE', 'MISTO', 'FÍSICO', 'CONF. ALVARÁ'] as const
export const FORMATO_OPTIONS = ['NOVO', 'REVISÃO', 'MISTO'] as const
export const ANALISE_OPTIONS = ['1ª', '2ª'] as const

// Column header mapping from original spreadsheet
export const COLUMN_MAP: Record<string, keyof Lote | null> = {
  'REGIÃO': 'regiao',
  'REGIAO': 'regiao',
  'PERITO': 'perito',
  'LOTE': 'lote',
  'ANALISTA': 'analista',
  'QTD ANALISADA': 'qtdAnalisada',
  'QTD. ANALISADA': 'qtdAnalisada',
  'ANÁLISE': 'analise',
  'ANALISE': 'analise',
  'TIPO': 'tipo',
  'FORMATO': 'formato',
  'ENVIO': 'envio',
  'ENTREGA': 'entrega',
  'MÊS REF.': 'mesRef',
  'MES REF.': 'mesRef',
  'MES REF': 'mesRef',
  'QTD DIAS': 'qtdDias',
  'VALOR DEVIDO': 'valorDevido',
  'PAGO': 'pago',
  'QTD TOTAL': 'qtdTotal',
  'QTD DE "P"': 'qtdP',
  'QTD DE P': 'qtdP',
  'QTD_P': 'qtdP',
  'TOTAL SENTENÇAS': 'totalSentencas',
  'TOTAL SENTENCAS': 'totalSentencas',
}
