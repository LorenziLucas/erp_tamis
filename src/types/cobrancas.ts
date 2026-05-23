export interface Cobranca {
  id: string
  perito: string
  cpfPerito: string | null
  regiao: string
  mesRef: string | null        // 'YYYY-MM-01'
  dataEnvio: string | null     // ISO date
  valor: number
  tipo: 'Comissão' | 'Lote'
  recebido: boolean
  dataRecebimento: string | null
  notaFiscal: 'Emitida' | 'Não Emitida'
  linkPdf: string | null
  userId: string
  createdAt: string
}

export interface Perito {
  id: string
  nome: string
  cpf: string | null
  userId: string
}

export const TIPO_COBRANCA_OPTIONS = ['Comissão', 'Lote'] as const
export const NOTA_FISCAL_OPTIONS   = ['Emitida', 'Não Emitida'] as const
