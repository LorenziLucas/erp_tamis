import { supabase } from '../lib/supabaseClient'

interface NotificarEmailParams {
  to: string
  subject: string
  html: string
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
