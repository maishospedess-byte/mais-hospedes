// Rótulos e cores de status — status da ESTADIA separado do status da MENSAGEM

export type Tone = 'success' | 'warn' | 'danger' | 'info' | 'neutral' | 'accent'

export const STAY_STATUS: Record<string, { label: string; tone: Tone }> = {
  pending: { label: 'Aguardando check-in', tone: 'warn' },
  active: { label: 'Check-in confirmado', tone: 'success' },
  completed: { label: 'Estadia finalizada', tone: 'neutral' },
  blocked: { label: 'Cadastro bloqueado', tone: 'danger' },
  none: { label: 'Sem estadia', tone: 'neutral' },
}

export const MSG_STATUS: Record<string, { label: string; tone: Tone }> = {
  none: { label: 'Aguardando mensagem', tone: 'neutral' },
  scheduled: { label: 'Mensagem programada', tone: 'warn' },
  queued: { label: 'Enviando', tone: 'info' },
  sent: { label: 'Enviada', tone: 'info' },
  delivered: { label: 'Entregue', tone: 'success' },
  read: { label: 'Lida', tone: 'success' },
  failed: { label: 'Falha no envio', tone: 'danger' },
  cancelled: { label: 'Cancelada', tone: 'neutral' },
}

export const AUTOMATION_LABEL: Record<string, string> = {
  welcome: 'Boas-vindas',
  checkin_info: 'Check-in e informações',
  during_stay: 'Durante a hospedagem',
  checkout_survey: 'Checkout + pesquisa + Google',
  satisfaction_survey: 'Pesquisa de satisfação',
  test: 'Teste',
}

export function stayKey(regStatus?: string | null, stayStatus?: string | null) {
  if (regStatus === 'registration_blocked') return 'blocked'
  if (stayStatus === 'stay_completed') return 'completed'
  if (stayStatus === 'stay_active') return 'active'
  return 'pending'
}

export function fmtDate(d: string | null | undefined) {
  if (!d) return '-'
  const date = d.length === 10 ? new Date(d + 'T12:00:00') : new Date(d)
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}
export function fmtDateTime(d: string | null | undefined) {
  if (!d) return '-'
  return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}
export function fmtTime(d: string | null | undefined) {
  if (!d) return '-'
  return new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}
export function fmtPhone(p: string | null | undefined) {
  if (!p) return '-'
  const m = p.match(/^\+55(\d{2})(\d{4,5})(\d{4})$/)
  return m ? `+55 (${m[1]}) ${m[2]}-${m[3]}` : p
}
export function timeAgo(d: string) {
  const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `há ${mins} min`
  const h = Math.floor(mins / 60)
  if (h < 24) return `há ${h} h`
  return `há ${Math.floor(h / 24)} d`
}
