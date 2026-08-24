/** Converte um erro de tipo desconhecido (ex.: retorno do Supabase, que não é
 *  instância de Error) em uma mensagem de texto legível para exibição. */
export function getErrorMessage(err: unknown): string {
  if (typeof err === 'string') return err

  if (err instanceof Error) return err.message

  if (err && typeof err === 'object') {
    const obj = err as Record<string, unknown>
    if (typeof obj.message === 'string') {
      const code = obj.code
      return typeof code === 'string' || typeof code === 'number'
        ? `${obj.message} (${code})`
        : obj.message
    }
    try {
      return JSON.stringify(err)
    } catch {
      return 'Ocorreu um erro inesperado'
    }
  }

  return 'Ocorreu um erro inesperado'
}
