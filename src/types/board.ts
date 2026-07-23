export { TIPO_OPTIONS, FORMATO_OPTIONS } from './index'

export type BoardStatus =
  | 'nao_ativo'
  | 'ativo'
  | 'analise_1'
  | 'analise_2'
  | 'padronizacao'
  | 'entrega'

export interface BoardPerito {
  id: string
  peritoId: string
  nome: string
  regiao: string
  status: BoardStatus
  analista: string | null
  provisionado: number
  entregue: number
  mesRef: string | null
  ordem: number
  planilhaUrl: string | null
  statusChangedAt: string
}

export const BOARD_STATUS: { value: BoardStatus; label: string }[] = [
  { value: 'nao_ativo',     label: 'Sem lote previsto' },
  { value: 'ativo',         label: 'Aguardando lote previsto' },
  { value: 'analise_1',     label: '1ª análise' },
  { value: 'analise_2',     label: '2ª análise' },
  { value: 'padronizacao',  label: 'Padronização e upload para o BD' },
  { value: 'entrega',       label: 'Entrega do lote' },
]

export interface BoardLote {
  id: string
  boardPeritoId: string
  numero: number
  mesRef: string | null
  tipo: string | null
  formato: string | null
  entregue: boolean
  ordem: number
}

export interface BoardComentario {
  id: string
  boardPeritoId: string
  autorId: string
  autorEmail: string | null
  texto: string
  mencionados: string[]
  createdAt: string
  updatedAt: string
}

export interface BoardHistorico {
  id: string
  boardPeritoId: string
  autorEmail: string | null
  tipo: string
  descricao: string
  createdAt: string
}
