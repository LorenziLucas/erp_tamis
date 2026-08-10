import { supabase } from '../lib/supabaseClient'

interface NotificarEmailParams {
  to: string
  subject: string
  html: string
}

export function montarDestinatarios(
  emails: (string | null | undefined)[],
  autorEmail: string | null | undefined,
): string[] {
  const vistos = new Set<string>()
  const destinatarios: string[] = []
  const chaveAutor = autorEmail ? autorEmail.toLowerCase() : null

  for (const email of emails) {
    if (!email) continue
    const chave = email.toLowerCase()
    if (vistos.has(chave)) continue
    if (chaveAutor && chave === chaveAutor) continue
    vistos.add(chave)
    destinatarios.push(email)
  }

  return destinatarios
}

export async function notificarEmail({ to, subject, html }: NotificarEmailParams): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('notify-email', {
      body: { to, subject, html },
    })
    if (error) {
      console.warn('[notificacoesService] Falha ao enviar e-mail de notificação:', error)
    }
  } catch (err) {
    console.warn('[notificacoesService] Falha ao enviar e-mail de notificação:', err)
  }
}
