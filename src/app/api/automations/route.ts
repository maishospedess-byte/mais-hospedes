import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceSupabase } from '@/lib/supabase/server'
import { getMember, errorResponse, audit, HttpError, MANAGERS } from '@/lib/auth/member'
import { AUTOMATIONS, AUTOMATION_TYPES, validateTemplateText, type AutomationType } from '@/lib/automations/definitions'
import { ensureTemplateRows } from '@/lib/whatsapp/templates'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { hotelId, role } = await getMember()
    const svc = createServiceSupabase()
    const since = new Date(Date.now() - 30 * 86400_000).toISOString()
    const [templates, { data: settings }, { data: msgs }, { data: hotel }] = await Promise.all([
      ensureTemplateRows(hotelId),
      svc.from('automation_settings').select('automation_type, enabled').eq('hotel_id', hotelId),
      svc.from('messages').select('id, automation_type, status, scheduled_for, sent_at, delivered_at, read_at, failed_at, failure_reason, created_at, trigger_source, guest_id, guest_profiles(full_name)')
        .eq('hotel_id', hotelId).eq('direction', 'outbound').gte('created_at', since)
        .order('created_at', { ascending: false }).limit(1000),
      svc.from('hotels').select('name, breakfast_time, wifi_info, checkin_time, checkout_time, reception_contact, whatsapp_number, rules, google_review_url').eq('id', hotelId).single(),
    ])

    const cards = AUTOMATION_TYPES.map(type => {
      const def = AUTOMATIONS[type]
      const s = (settings || []).find(x => x.automation_type === type)
      const enabled = def.mandatory ? true : (s ? s.enabled : def.defaultEnabled)
      const mine = (msgs || []).filter(m => m.automation_type === type)
      const count = (st: string) => mine.filter(m => m.status === st).length
      return {
        type, title: def.title, objective: def.objective, trigger: def.trigger, mandatory: def.mandatory, enabled,
        allowedVars: def.allowedVars, requiredVars: def.requiredVars, defaults: def.defaults,
        templates: templates.filter(t => t.automation_type === type),
        stats: {
          total: mine.length, scheduled: count('scheduled') + count('queued'), sent: count('sent'),
          delivered: count('delivered'), read: count('read'), failed: count('failed'), cancelled: count('cancelled'),
        },
        recent: mine.slice(0, 8),
      }
    })
    return NextResponse.json({ cards, canEdit: MANAGERS.includes(role), hotel })
  } catch (e) {
    return errorResponse(e)
  }
}

const patchSchema = z.union([
  z.object({ type: z.enum(['welcome', 'checkin_info', 'during_stay', 'checkout_survey']), enabled: z.boolean() }),
  z.object({ type: z.enum(['welcome', 'checkin_info', 'during_stay', 'checkout_survey']), language: z.enum(['pt-BR', 'es', 'en']), text: z.string().max(1000) }),
  z.object({ type: z.enum(['welcome', 'checkin_info', 'during_stay', 'checkout_survey']), language: z.enum(['pt-BR', 'es', 'en']), reset: z.literal(true) }),
])

export async function PATCH(req: NextRequest) {
  try {
    const member = await getMember(MANAGERS)
    const parsed = patchSchema.safeParse(await req.json())
    if (!parsed.success) throw new HttpError(400, 'Requisição inválida')
    const body = parsed.data
    const type = body.type as AutomationType
    const def = AUTOMATIONS[type]
    const svc = createServiceSupabase()

    if ('enabled' in body) {
      if (def.mandatory && !body.enabled) throw new HttpError(400, 'Este fluxo é obrigatório e não pode ser desativado.')
      await svc.from('automation_settings').upsert({ hotel_id: member.hotelId, automation_type: type, enabled: body.enabled }, { onConflict: 'hotel_id,automation_type' })
      if (!body.enabled) {
        await svc.from('messages').update({ status: 'cancelled', failure_code: 'disabled', failure_reason: 'Automação desativada pelo hotel' })
          .eq('hotel_id', member.hotelId).eq('automation_type', type).eq('status', 'scheduled')
      }
      await audit(member.hotelId, member.userId, 'automation.toggled', 'automation', null, { type, enabled: body.enabled })
      return NextResponse.json({ ok: true })
    }

    const rows = await ensureTemplateRows(member.hotelId)
    const row = rows.find(r => r.automation_type === type && r.language === body.language)
    if (!row) throw new HttpError(404, 'Template não encontrado')
    const text = 'reset' in body ? def.defaults[body.language] : body.text.trim()
    const errors = validateTemplateText(type, text)
    if (errors.length) throw new HttpError(400, errors.join(' '))

    // Nunca enviado à Meta: o próprio texto base é atualizado. Já enviado: fica como rascunho até nova aprovação.
    const neverSubmitted = !row.meta_template_id && row.status === 'draft'
    const patch = neverSubmitted
      ? { body_text: text, draft_text: null, variables: Array.from(text.matchAll(/\{([a-z_]+)\}/g)).map(m => m[1]) }
      : { draft_text: text === row.body_text ? null : text }
    await svc.from('message_templates').update(patch).eq('id', row.id)
    await audit(member.hotelId, member.userId, 'automation.text_updated', 'message_template', row.id, { type, language: body.language })
    return NextResponse.json({ ok: true, needsApproval: !neverSubmitted && text !== row.body_text })
  } catch (e) {
    return errorResponse(e)
  }
}
