import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceSupabase } from '@/lib/supabase/server'
import { getMember, errorResponse, audit, HttpError } from '@/lib/auth/member'
import { scheduleMessage, cancelScheduled, dispatchDue, isAutomationEnabled } from '@/lib/automations/engine'
import { DURING_STAY_DELAY_HOURS } from '@/lib/automations/definitions'
import { getConnectedAccount } from '@/lib/whatsapp/graph'

export const dynamic = 'force-dynamic'

type Row = Record<string, unknown> & { id: string }

/** Quadro da recepção: cadastros pendentes, hospedados e finalizados recentes */
export async function GET() {
  try {
    const { hotelId } = await getMember()
    const svc = createServiceSupabase()
    const since = new Date(Date.now() - 14 * 86400_000).toISOString()

    const { data: regs } = await svc.from('registrations').select('*')
      .eq('hotel_id', hotelId)
      .or(`status.eq.registration_pending,created_at.gte.${since}`)
      .order('created_at', { ascending: false }).limit(300)

    const { data: activeStays } = await svc.from('stays').select('*')
      .eq('hotel_id', hotelId).eq('status', 'stay_active').limit(500)

    const regMap = new Map<string, Row>((regs || []).map(r => [r.id, r]))
    const missingRegIds = (activeStays || []).map(s => s.registration_id).filter(id => !regMap.has(id))
    if (missingRegIds.length) {
      const { data: extra } = await svc.from('registrations').select('*').in('id', missingRegIds)
      for (const r of extra || []) regMap.set(r.id, r)
    }
    const regIds = Array.from(regMap.keys())
    if (!regIds.length) return NextResponse.json({ items: [], whatsappConnected: !!(await getConnectedAccount(hotelId)) })

    const [{ data: stays }, { data: msgs }] = await Promise.all([
      svc.from('stays').select('*').in('registration_id', regIds).neq('status', 'cancelled'),
      svc.from('messages').select('id, registration_id, stay_id, automation_type, status, scheduled_for, sent_at, delivered_at, read_at, failed_at, failure_reason, failure_code, created_at')
        .eq('hotel_id', hotelId).eq('direction', 'outbound').in('registration_id', regIds)
        .order('created_at', { ascending: false }),
    ])
    const stayIds = (stays || []).map(s => s.id)
    let stayMsgs: Row[] = []
    if (stayIds.length) {
      const { data } = await svc.from('messages').select('id, registration_id, stay_id, automation_type, status, scheduled_for, sent_at, delivered_at, read_at, failed_at, failure_reason, failure_code, created_at')
        .eq('hotel_id', hotelId).eq('direction', 'outbound').in('stay_id', stayIds)
        .order('created_at', { ascending: false })
      stayMsgs = data || []
    }
    const guestIds = Array.from(new Set(Array.from(regMap.values()).map(r => r.guest_id as string)))
    const { data: guests } = await svc.from('guest_profiles').select('*').in('id', guestIds)
    const guestMap = new Map((guests || []).map(g => [g.id, g]))
    const stayByReg = new Map((stays || []).map(s => [s.registration_id, s]))

    const allMsgs = [...(msgs || []), ...stayMsgs]
    const items = Array.from(regMap.values()).map(reg => {
      const stay = stayByReg.get(reg.id) || null
      const related = allMsgs.filter(m => m.registration_id === reg.id || (stay && m.stay_id === stay.id))
      const uniq = Array.from(new Map(related.map(m => [m.id, m])).values())
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
      return {
        registration: reg,
        guest: guestMap.get(reg.guest_id as string) || null,
        stay,
        welcome: uniq.find(m => m.automation_type === 'welcome') || null,
        lastMessage: uniq[0] || null,
        messages: uniq,
      }
    }).filter(i => i.guest)
      .sort((a, b) => String(b.registration.created_at).localeCompare(String(a.registration.created_at)))

    return NextResponse.json({ items, whatsappConnected: !!(await getConnectedAccount(hotelId)) })
  } catch (e) {
    return errorResponse(e)
  }
}

const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('welcome_now'), registration_id: z.string().uuid() }),
  z.object({
    action: z.literal('confirm_checkin'),
    registration_id: z.string().uuid(),
    checkin_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    checkout_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }),
  z.object({ action: z.literal('block'), registration_id: z.string().uuid(), reason: z.string().max(300).optional() }),
  z.object({ action: z.literal('complete'), stay_id: z.string().uuid() }),
  z.object({ action: z.literal('resend'), message_id: z.string().uuid() }),
])

export async function POST(req: NextRequest) {
  try {
    const member = await getMember()
    const parsed = actionSchema.safeParse(await req.json())
    if (!parsed.success) throw new HttpError(400, 'Requisição inválida')
    const body = parsed.data
    const svc = createServiceSupabase()

    const loadReg = async (id: string) => {
      const { data } = await svc.from('registrations').select('*').eq('id', id).eq('hotel_id', member.hotelId).maybeSingle()
      if (!data) throw new HttpError(404, 'Cadastro não encontrado')
      return data
    }

    // ---------- Enviar boas-vindas agora ----------
    if (body.action === 'welcome_now') {
      const reg = await loadReg(body.registration_id)
      if (reg.status === 'registration_blocked') throw new HttpError(409, 'Cadastro bloqueado — mensagens desativadas')
      const { data: guest } = await svc.from('guest_profiles').select('language').eq('id', reg.guest_id).single()
      const sched = await scheduleMessage({
        hotelId: member.hotelId, guestId: reg.guest_id, registrationId: reg.id, type: 'welcome',
        language: guest?.language || 'pt-BR', scheduledFor: new Date(), idempotencyKey: `welcome-${reg.id}`,
        source: 'manual', userId: member.userId,
      }, svc)
      const { data: msg } = await svc.from('messages').select('id, status').eq('id', sched.id).single()
      if (msg && ['sent', 'delivered', 'read'].includes(msg.status)) {
        throw new HttpError(409, 'A mensagem de boas-vindas já foi enviada para este hóspede')
      }
      if (msg && msg.status === 'queued') throw new HttpError(409, 'A mensagem já está sendo enviada')
      // antecipa o disparo agendado (ou reativa após falha) — a mesma linha, sem duplicar
      await svc.from('messages').update({
        status: 'scheduled', scheduled_for: new Date().toISOString(), trigger_source: 'manual',
        triggered_by: member.userId, failure_reason: null, failure_code: null,
      }).eq('id', sched.id).in('status', ['scheduled', 'failed', 'cancelled'])
      const result = await dispatchDue({ messageIds: [sched.id], limit: 1 })
      await audit(member.hotelId, member.userId, 'message.welcome_sent_manually', 'registration', reg.id, { result: result.results[0] })
      return NextResponse.json({ ok: true, result: result.results[0] || null })
    }

    // ---------- Confirmar check-in ----------
    if (body.action === 'confirm_checkin') {
      const reg = await loadReg(body.registration_id)
      if (reg.status === 'registration_blocked') throw new HttpError(409, 'Cadastro bloqueado não pode ter check-in confirmado')
      const checkin = body.checkin_date || reg.checkin_date
      const checkout = body.checkout_date || reg.checkout_date
      if (checkout <= checkin) throw new HttpError(400, 'A data de saída deve ser depois da entrada')

      let { data: stay } = await svc.from('stays').select('*').eq('registration_id', reg.id).neq('status', 'cancelled').maybeSingle()
      if (!stay) {
        const { data: created, error } = await svc.from('stays').insert({
          hotel_id: member.hotelId, registration_id: reg.id, guest_id: reg.guest_id, status: 'stay_active',
          checkin_date: checkin, checkout_date: checkout, confirmed_by: member.userId, confirmed_at: new Date().toISOString(),
        }).select('*').single()
        if (error) {
          // índice único: outra aba confirmou ao mesmo tempo
          const { data: again } = await svc.from('stays').select('*').eq('registration_id', reg.id).neq('status', 'cancelled').maybeSingle()
          if (!again) throw error
          stay = again
        } else stay = created
      }
      await svc.from('registrations').update({
        status: 'registration_confirmed', confirmed_at: new Date().toISOString(), confirmed_by: member.userId,
        checkin_date: checkin, checkout_date: checkout,
      }).eq('id', reg.id)

      // Boas-vindas ainda não enviada: substituída pela mensagem de check-in (evita duas mensagens seguidas)
      await cancelScheduled({ registrationId: reg.id, types: ['welcome'] }, 'Substituída pela mensagem de check-in', svc)

      const { data: guest } = await svc.from('guest_profiles').select('language').eq('id', reg.guest_id).single()
      const lang = guest?.language || 'pt-BR'
      const info = await scheduleMessage({
        hotelId: member.hotelId, guestId: reg.guest_id, registrationId: reg.id, stayId: stay!.id, type: 'checkin_info',
        language: lang, scheduledFor: new Date(), idempotencyKey: `checkin-${stay!.id}`, source: 'auto', userId: member.userId,
      }, svc)
      if (await isAutomationEnabled(member.hotelId, 'during_stay', svc)) {
        const when = new Date(Date.now() + DURING_STAY_DELAY_HOURS * 3600_000)
        if (when.toISOString().slice(0, 10) < String(checkout)) {
          await scheduleMessage({
            hotelId: member.hotelId, guestId: reg.guest_id, registrationId: reg.id, stayId: stay!.id, type: 'during_stay',
            language: lang, scheduledFor: when, idempotencyKey: `during-${stay!.id}`,
          }, svc)
        }
      }
      const result = await dispatchDue({ messageIds: [info.id], limit: 1 })
      await audit(member.hotelId, member.userId, 'stay.confirmed', 'stay', stay!.id, { registration_id: reg.id })
      return NextResponse.json({ ok: true, stay_id: stay!.id, result: result.results[0] || null })
    }

    // ---------- Bloquear cadastro ----------
    if (body.action === 'block') {
      const reg = await loadReg(body.registration_id)
      if (reg.status === 'registration_confirmed') throw new HttpError(409, 'Check-in já confirmado. Use "Finalizar estadia".')
      await svc.from('registrations').update({
        status: 'registration_blocked', blocked_by: member.userId, blocked_at: new Date().toISOString(),
        block_reason: body.reason || 'Bloqueado pela recepção',
      }).eq('id', reg.id)
      await cancelScheduled({ registrationId: reg.id }, 'Cadastro bloqueado pela recepção', svc)
      await audit(member.hotelId, member.userId, 'registration.blocked', 'registration', reg.id, { reason: body.reason })
      return NextResponse.json({ ok: true })
    }

    // ---------- Finalizar estadia ----------
    if (body.action === 'complete') {
      const { data: stay } = await svc.from('stays').select('*').eq('id', body.stay_id).eq('hotel_id', member.hotelId).maybeSingle()
      if (!stay) throw new HttpError(404, 'Estadia não encontrada')
      // transição atômica: só uma requisição consegue finalizar (sem pesquisa duplicada)
      const { data: updated } = await svc.from('stays').update({
        status: 'stay_completed', completed_by: member.userId, completed_at: new Date().toISOString(),
      }).eq('id', stay.id).eq('status', 'stay_active').select('id')
      if (!updated?.length) throw new HttpError(409, 'Esta estadia já foi finalizada')

      await cancelScheduled({ stayId: stay.id, types: ['during_stay', 'checkin_info', 'welcome'] }, 'Estadia finalizada', svc)
      const { data: guest } = await svc.from('guest_profiles').select('language').eq('id', stay.guest_id).single()
      const survey = await scheduleMessage({
        hotelId: member.hotelId, guestId: stay.guest_id, registrationId: stay.registration_id, stayId: stay.id,
        type: 'checkout_survey', language: guest?.language || 'pt-BR', scheduledFor: new Date(),
        idempotencyKey: `survey-${stay.id}`, userId: member.userId,
      }, svc)
      const result = await dispatchDue({ messageIds: [survey.id], limit: 1 })
      await audit(member.hotelId, member.userId, 'stay.completed', 'stay', stay.id)
      return NextResponse.json({ ok: true, result: result.results[0] || null })
    }

    // ---------- Reenviar mensagem com falha ----------
    if (body.action === 'resend') {
      const { data: msg } = await svc.from('messages').select('id, status').eq('id', body.message_id).eq('hotel_id', member.hotelId).maybeSingle()
      if (!msg) throw new HttpError(404, 'Mensagem não encontrada')
      if (msg.status !== 'failed') throw new HttpError(409, 'Só é possível reenviar mensagens com falha')
      await svc.from('messages').update({ status: 'scheduled', scheduled_for: new Date().toISOString(), failure_reason: null, failure_code: null, trigger_source: 'manual', triggered_by: member.userId })
        .eq('id', msg.id).eq('status', 'failed')
      const result = await dispatchDue({ messageIds: [msg.id], limit: 1 })
      await audit(member.hotelId, member.userId, 'message.resend', 'message', msg.id, { result: result.results[0] })
      return NextResponse.json({ ok: true, result: result.results[0] || null })
    }

    throw new HttpError(400, 'Ação desconhecida')
  } catch (e) {
    return errorResponse(e)
  }
}
