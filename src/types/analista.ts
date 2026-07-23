export type TipoAcessoAnalista = 'admin' | 'analista'

export interface Analista {
  id: string
  nome: string
  email: string | null
  tipoAcesso: TipoAcessoAnalista
}
