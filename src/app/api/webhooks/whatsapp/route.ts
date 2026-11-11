import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabase } from '@/lib/supabase/server'
import { verifyWebhookSignature, logWaEvent } from '@/lib/whatsapp/graph'
import { cancelScheduled } from '@/lib/automations/engine'

export const dynamic = 'force-dynamic'

/** Verificação do webhook (Meta envia hub.challenge) */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams
  const token = process.env.META_WEBHOOK_VERIFY_TOKEN
  if (p.get('hub.mode') === 'subscribe' && token && p.get('hub.verify_token') === token) {
    return new NextResponse(p.get('hub.challenge') || '', { status: 200 })
  }
  return NextResponse.json({ error: 'forbidden' }, { status: 403 })
}

const STATUS_RANK: Record<string, number> = { scheduled: 0, queued: 1, sent: 2, delivered: 3, read: 4 }
const OPT_OUT = new Set(['SAIR', 'PARAR', 'STOP', 'SALIR', 'BAJA', 'CANCELAR', 'UNSUBSCRIBE', 'DESCADASTRAR', 'REMOVER'])

function normalize(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toUpperCase()
}

type Svc = ReturnType<typeof createServiceSupabase>

export async function POST(req: NextRequest) {
  const raw = await req.text()
  if (!verifyWebhookSignature(raw, req.headers.get('x-hub-signature-256'))) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
  }
  let payload: { entry?: { changes?: { field?: string; value?: Record<string, unknown> }[] }[] }
  try { payload = JSON.parse(raw) } catch { return NextResponse.json({ ok: true }) }

  const svc = createServiceSupabase()
  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      try {
        if (change.field === 'message_template_status_update') await handleTemplateUpdate(svc, change.value || {})
        else await handleMessages(svc, change.value || {})
      } catch (e) {
        console.error('webhook processing error', e)
        await logWaEvent({ hotelId: null, kind: 'error', level: 'error', summary: `Erro ao processar webhook: ${String(e)}` })
      }
    }
  }
  // Sempre 200 para a Meta não reenviar em loop; erros ficam nos logs
  return NextResponse.json({ ok: true })
}

async function hotelByPhoneNumberId(svc: Svc, phoneNumberId: string | undefined) {
  if (!phoneNumberId) return null
  const { data } = await svc.from('whatsapp_accounts').select('hotel_id').eq('phone_number_id', phoneNumberId).maybeSingle()
  return data?.hotel_id as string | null
}

async function handleTemplateUpdate(svc: Svc, v: Record<string, unknown>) {
  const id = String(v.message_template_id || '')
  if (!id) return
  const status = String(v.event || '').toLowerCase()
  const { data: rows } = await svc.from('message_templates').update({
    status, rejection_reason: v.reason && v.reason !== 'NONE' ? String(v.reason) : null, last_synced_at: new Date().toISOString(),
  }).eq('meta_template_id', id).select('hotel_id, template_name, language')
  for (const r of rows || []) {
    await logWaEvent({ hotelId: r.hotel_id, kind: 'template', level: status === 'rejected' ? 'warn' : 'info', summary: `Template ${r.template_name} (${r.language}): ${status}${v.reason && v.reason !== 'NONE' ? ` — ${v.reason}` : ''}` })
  }
}

async function handleMessages(svc: Svc, v: Record<string, unknown>) {
  const metadata = (v.metadata || {}) as { phone_number_id?: string }
  const hotelId = await hotelByPhoneNumberId(svc, metadata.phone_number_id)

  // ---------- status de entrega ----------
  for (const st of (v.statuses || []) as { id: string; status: string; timestamp?: string; errors?: { title?: string; message?: string; code?: number; error_data?: { details?: string } }[] }[]) {
    const { data: msg } = await svc.from('messages').select('id, hotel_id, status').eq('whatsapp_message_id', st.id).maybeSingle()
    if (!msg) continue
    const at = st.timestamp ? new Date(Number(st.timestamp) * 1000).toISOString() : new Date().toISOString()
    const patch: Record<string, unknown> = {}
    if (st.status === 'failed') {
      const err = st.errors?.[0]
      patch.status = 'failed'
      patch.failed_at = at
      patch.failure_code = err?.code ? `meta_${err.code}` : 'meta_failed'
      patch.failure_reason = err?.error_data?.details || err?.message || err?.title || 'Falha informada pela Meta'
    } else if ((STATUS_RANK[st.status] ?? -1) > (STATUS_RANK[msg.status] ?? -1)) {
      patch.status = st.status
      if (st.status === 'delivered') patch.delivered_at = at
      if (st.status === 'read') { patch.read_at = at; patch.delivered_at = patch.delivered_at || at }
    }
    if (Object.keys(patch).length) await svc.from('messages').update(patch).eq('id', msg.id)
    if (st.status === 'failed') {
      await logWaEvent({ hotelId: msg.hotel_id, kind: 'webhook_status', level: 'error', summary: `Meta informou falha na entrega: ${patch.failure_reason}`, messageId: msg.id, payload: st })
    }
  }

  // ---------- mensagens recebidas ----------
  if (!hotelId) return
  for (const m of (v.messages || []) as { id: string; from: string; type: string; text?: { body?: string }; button?: { text?: string }; interactive?: { button_reply?: { title?: string } } ; timestamp?: string }[]) {
    const text = m.text?.body || m.button?.text || m.interactive?.button_reply?.title || ''
    const phone = `+${m.from.replace(/\D/g, '')}`
    const { data: guest } = await svc.from('guest_profiles').select('id, full_name').eq('hotel_id', hotelId).eq('whatsapp_number', phone).maybeSingle()

    // registra a mensagem recebida (idempotente por ID da Meta)
    const { error: dupErr } = await svc.from('messages').insert({
      hotel_id: hotelId, guest_id: guest?.id || null, direction: 'inbound', status: 'delivered',
      whatsapp_message_id: m.id, content: text || `[${m.type}]`, language: 'pt-BR', recipient: phone,
      idempotency_key: `in-${m.id}`, sent_at: m.timestamp ? new Date(Number(m.timestamp) * 1000).toISOString() : new Date().toISOString(),
    })
    if (dupErr) continue // já processada (reenvio da Meta)

    const norm = normalize(text)

    // opt-out
    if (OPT_OUT.has(norm)) {
      await svc.from('opt_out_records').upsert({ hotel_id: hotelId, whatsapp_number: phone, source: 'whatsapp_reply', opted_out_at: new Date().toISOString() }, { onConflict: 'hotel_id,whatsapp_number' })
      const { data: profiles } = await svc.from('guest_profiles').select('id').eq('hotel_id', hotelId).eq('whatsapp_number', phone)
      if (profiles?.length) await cancelScheduled({ guestIds: profiles.map(p => p.id) }, 'Hóspede pediu para sair (opt-out)', svc)
      await logWaEvent({ hotelId, kind: 'webhook_inbound', level: 'warn', summary: `Opt-out recebido de ${phone}` })
      continue
    }

    // nota de satisfação 0–10
    const scoreMatch = norm.length <= 20 ? norm.match(/(?:^|\D)(10|[0-9])(?:\D|$)/) : null
    if (guest && scoreMatch) {
      const score = Number(scoreMatch[1])
      const since = new Date(Date.now() - 30 * 86400_000).toISOString()
      const { data: surveys } = await svc.from('messages').select('id, stay_id')
        .eq('hotel_id', hotelId).eq('guest_id', guest.id).eq('automation_type', 'checkout_survey')
        .in('status', ['sent', 'delivered', 'read']).gte('created_at', since)
        .order('created_at', { ascending: false }).limit(5)
      for (const s of surveys || []) {
        if (!s.stay_id) continue
        const { error } = await svc.from('satisfaction_responses').insert({
          hotel_id: hotelId, stay_id: s.stay_id, guest_id: guest.id, score, message_id: s.id,
        })
        if (!error) {
          await logWaEvent({ hotelId, kind: 'webhook_inbound', summary: `Nota ${score} recebida de ${guest.full_name}` })
          break
        }
      }
      continue
    }
    await logWaEvent({ hotelId, kind: 'webhook_inbound', summary: `Mensagem recebida de ${guest?.full_name || phone}` })
  }
}
