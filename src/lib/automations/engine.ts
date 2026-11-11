// Motor de automações: agendamento idempotente + disparo real via WhatsApp Cloud API
import { createServiceSupabase } from '@/lib/supabase/server'
import {
  AUTOMATIONS, type AutomationType, type TemplateLang, META_LANG, LANGS,
} from './definitions'
import { getConnectedAccount, sendTemplateMessage, GraphError, logWaEvent } from '@/lib/whatsapp/graph'

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://mais-hospedes.vercel.app').replace(/\/$/, '')

type Svc = ReturnType<typeof createServiceSupabase>

export function normalizeLang(l: string | null | undefined): TemplateLang {
  return (LANGS as string[]).includes(l || '') ? (l as TemplateLang) : 'pt-BR'
}

/** Agenda uma mensagem. A chave de idempotência impede duplicidade mesmo com cliques repetidos. */
export async function scheduleMessage(args: {
  hotelId: string
  guestId: string
  registrationId?: string | null
  stayId?: string | null
  type: AutomationType
  language: string
  scheduledFor: Date
  idempotencyKey: string
  source?: 'auto' | 'manual' | 'test'
  userId?: string | null
}, svc: Svc = createServiceSupabase()) {
  const { data: existing } = await svc
    .from('messages').select('id, status').eq('idempotency_key', args.idempotencyKey).maybeSingle()
  if (existing) return { id: existing.id as string, created: false, status: existing.status as string }

  const { data, error } = await svc.from('messages').insert({
    hotel_id: args.hotelId,
    guest_id: args.guestId,
    registration_id: args.registrationId || null,
    stay_id: args.stayId || null,
    direction: 'outbound',
    status: 'scheduled',
    automation_type: args.type,
    language: normalizeLang(args.language),
    scheduled_for: args.scheduledFor.toISOString(),
    idempotency_key: args.idempotencyKey,
    trigger_source: args.source || 'auto',
    triggered_by: args.userId || null,
  }).select('id').single()

  if (error) {
    // corrida: outro processo inseriu a mesma chave
    const { data: again } = await svc.from('messages').select('id, status').eq('idempotency_key', args.idempotencyKey).maybeSingle()
    if (again) return { id: again.id as string, created: false, status: again.status as string }
    throw error
  }
  return { id: data.id as string, created: true, status: 'scheduled' }
}

/** Cancela mensagens ainda não enviadas (agendadas) que batem com o filtro */
export async function cancelScheduled(filter: { registrationId?: string; stayId?: string; guestIds?: string[]; types?: AutomationType[] }, reason: string, svc: Svc = createServiceSupabase()) {
  let q = svc.from('messages').update({ status: 'cancelled', failure_reason: reason, failure_code: 'cancelled' })
    .eq('status', 'scheduled').eq('direction', 'outbound')
  if (filter.registrationId) q = q.eq('registration_id', filter.registrationId)
  if (filter.stayId) q = q.eq('stay_id', filter.stayId)
  if (filter.guestIds) q = q.in('guest_id', filter.guestIds)
  if (filter.types) q = q.in('automation_type', filter.types)
  await q
}

export async function isAutomationEnabled(hotelId: string, type: AutomationType, svc: Svc = createServiceSupabase()) {
  const def = AUTOMATIONS[type]
  if (def.mandatory) return true
  const { data } = await svc.from('automation_settings').select('enabled').eq('hotel_id', hotelId).eq('automation_type', type).maybeSingle()
  return data ? !!data.enabled : def.defaultEnabled
}

function cleanParam(v: string | null | undefined): string {
  const s = (v || '').replace(/[\r\n\t]+/g, ' ').replace(/ {2,}/g, ' ').trim()
  return s || '-'
}

type MsgRow = {
  id: string; hotel_id: string; guest_id: string | null; stay_id: string | null; registration_id: string | null
  automation_type: string | null; language: string; attempts: number; status: string; trigger_source: string | null
}

export type DispatchResult = { processed: number; sent: number; failed: number; cancelled: number; retried: number; results: { id: string; status: string; reason?: string }[] }

/**
 * Processa mensagens vencidas. Cada mensagem é "reivindicada" de forma atômica
 * (scheduled → queued) antes do envio, impedindo envios duplicados entre execuções paralelas.
 */
export async function dispatchDue(opts: { hotelId?: string; messageIds?: string[]; limit?: number } = {}): Promise<DispatchResult> {
  const svc = createServiceSupabase()
  const out: DispatchResult = { processed: 0, sent: 0, failed: 0, cancelled: 0, retried: 0, results: [] }

  let q = svc.from('messages')
    .select('id, hotel_id, guest_id, stay_id, registration_id, automation_type, language, attempts, status, trigger_source')
    .eq('status', 'scheduled').eq('direction', 'outbound')
    .lte('scheduled_for', new Date().toISOString())
    .order('scheduled_for', { ascending: true })
    .limit(opts.limit || 25)
  if (opts.hotelId) q = q.eq('hotel_id', opts.hotelId)
  if (opts.messageIds?.length) q = q.in('id', opts.messageIds)

  const { data: due } = await q
  for (const m of (due || []) as MsgRow[]) {
    const { data: claimed } = await svc.from('messages')
      .update({ status: 'queued', attempts: (m.attempts || 0) + 1 })
      .eq('id', m.id).eq('status', 'scheduled')
      .select('id')
    if (!claimed?.length) continue // outro processo já pegou
    out.processed++
    const r = await processOne(svc, { ...m, attempts: (m.attempts || 0) + 1 })
    out.results.push({ id: m.id, ...r })
    if (r.status === 'sent') out.sent++
    else if (r.status === 'failed') out.failed++
    else if (r.status === 'cancelled') out.cancelled++
    else if (r.status === 'scheduled') out.retried++
  }
  return out
}

async function finish(svc: Svc, id: string, patch: Record<string, unknown>) {
  await svc.from('messages').update(patch).eq('id', id)
}

async function processOne(svc: Svc, m: MsgRow): Promise<{ status: string; reason?: string }> {
  const type = m.automation_type as AutomationType
  const def = AUTOMATIONS[type]
  const now = new Date().toISOString()
  const fail = async (code: string, reason: string) => {
    await finish(svc, m.id, { status: 'failed', failure_code: code, failure_reason: reason, failed_at: now })
    await logWaEvent({ hotelId: m.hotel_id, kind: 'dispatch', level: 'warn', summary: `${def?.title || type}: ${reason}`, messageId: m.id })
    return { status: 'failed', reason }
  }
  const cancel = async (code: string, reason: string) => {
    await finish(svc, m.id, { status: 'cancelled', failure_code: code, failure_reason: reason })
    await logWaEvent({ hotelId: m.hotel_id, kind: 'dispatch', summary: `${def?.title || type} cancelada: ${reason}`, messageId: m.id })
    return { status: 'cancelled', reason }
  }

  if (!def) return fail('unknown_type', `Tipo de automação desconhecido: ${type}`)
  if (!m.guest_id) return fail('no_guest', 'Mensagem sem hóspede vinculado')

  const [{ data: hotel }, { data: guest }] = await Promise.all([
    svc.from('hotels').select('*').eq('id', m.hotel_id).single(),
    svc.from('guest_profiles').select('*').eq('id', m.guest_id).single(),
  ])
  if (!hotel || !guest) return fail('not_found', 'Hotel ou hóspede não encontrado')

  // ---- elegibilidade ----
  const { data: optOut } = await svc.from('opt_out_records').select('id')
    .eq('hotel_id', m.hotel_id).eq('whatsapp_number', guest.whatsapp_number).maybeSingle()
  if (optOut) return cancel('opted_out', 'Hóspede pediu para não receber mensagens (opt-out)')

  const { data: consent } = await svc.from('consent_records').select('id')
    .eq('hotel_id', m.hotel_id).eq('guest_id', m.guest_id).eq('consented', true).limit(1)
  if (!consent?.length) return cancel('no_consent', 'Sem consentimento registrado')

  let registration: Record<string, unknown> | null = null
  if (m.registration_id) {
    const { data } = await svc.from('registrations').select('*').eq('id', m.registration_id).maybeSingle()
    registration = data
  }
  let stay: Record<string, unknown> | null = null
  if (m.stay_id) {
    const { data } = await svc.from('stays').select('*').eq('id', m.stay_id).maybeSingle()
    stay = data
  }

  if (registration?.status === 'registration_blocked') return cancel('blocked', 'Cadastro bloqueado pela recepção')
  if (type === 'checkin_info' && stay?.status !== 'stay_active') return cancel('stay_not_active', 'Estadia não está ativa')
  if (type === 'during_stay' && stay?.status !== 'stay_active') return cancel('stay_not_active', 'Hóspede não está mais hospedado')
  if (type === 'checkout_survey' && stay?.status !== 'stay_completed') return cancel('stay_not_completed', 'Estadia não foi finalizada')
  if (!(await isAutomationEnabled(m.hotel_id, type, svc))) return cancel('disabled', 'Automação desativada pelo hotel')

  // ---- conexão e template ----
  const account = await getConnectedAccount(m.hotel_id)
  if (!account) return fail('whatsapp_not_connected', 'WhatsApp do hotel não está conectado. Conecte em WhatsApp e Automações.')

  const lang = normalizeLang(m.language)
  const { data: tpl } = await svc.from('message_templates').select('*')
    .eq('hotel_id', m.hotel_id).eq('automation_type', type).eq('language', lang).maybeSingle()
  if (!tpl || tpl.status !== 'approved') {
    const st = tpl?.status ? ` (status: ${tpl.status})` : ' (ainda não enviado à Meta)'
    return fail('template_not_approved', `Template "${def.title}" em ${lang} não está aprovado pela Meta${st}`)
  }

  if (type === 'checkout_survey' && !hotel.google_review_url) {
    return fail('missing_google_link', 'Configure o link de avaliação do Google em Configurações')
  }

  const values: Record<string, string> = {
    nome_hospede: String(guest.full_name || '').split(' ')[0],
    nome_hotel: hotel.name,
    cafe_da_manha: hotel.breakfast_time,
    wifi: hotel.wifi_info,
    horario_checkin: hotel.checkin_time,
    horario_checkout: hotel.checkout_time,
    contato_recepcao: hotel.reception_contact || hotel.whatsapp_number || hotel.phone,
    regras: hotel.rules,
    link_google: stay ? `${SITE_URL}/r/${stay.id}` : (hotel.google_review_url || ''),
  }
  const variables: string[] = Array.isArray(tpl.variables) ? tpl.variables : []
  const params = variables.map(v => cleanParam(values[v]))
  const content = String(tpl.body_text || '').replace(/\{\{(\d+)\}\}/g, (_x, n) => params[Number(n) - 1] ?? '')
    .replace(/\{([a-z_]+)\}/g, (_x, name) => cleanParam(values[name]))

  try {
    const wamid = await sendTemplateMessage({
      phoneNumberId: account.phone_number_id!,
      token: account.token,
      to: guest.whatsapp_number,
      templateName: tpl.template_name,
      language: META_LANG[lang],
      params,
    })
    await finish(svc, m.id, {
      status: 'sent', sent_at: new Date().toISOString(), whatsapp_message_id: wamid,
      content, template_name: tpl.template_name, params, recipient: guest.whatsapp_number,
      failure_reason: null, failure_code: null,
    })
    await logWaEvent({ hotelId: m.hotel_id, kind: 'send', summary: `${def.title} enviada para ${guest.whatsapp_number}`, messageId: m.id, payload: { wamid, template: tpl.template_name, lang } })
    return { status: 'sent' }
  } catch (e) {
    const err = e instanceof GraphError ? e : new GraphError(500, null, String(e))
    await logWaEvent({ hotelId: m.hotel_id, kind: 'send', level: 'error', summary: `Erro ao enviar ${def.title}: ${err.message}`, messageId: m.id, payload: err.details })
    if (err.transient && m.attempts < 3) {
      await finish(svc, m.id, {
        status: 'scheduled', failure_reason: `Tentativa ${m.attempts} falhou: ${err.message}`,
        scheduled_for: new Date(Date.now() + 60_000 * m.attempts).toISOString(),
      })
      return { status: 'scheduled', reason: err.message }
    }
    await finish(svc, m.id, {
      status: 'failed', failed_at: new Date().toISOString(), failure_code: `meta_${err.code ?? err.status}`,
      failure_reason: err.message, recipient: guest.whatsapp_number, content,
    })
    return { status: 'failed', reason: err.message }
  }
}
