import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { randomInt } from 'crypto'
import { createServiceSupabase } from '@/lib/supabase/server'
import { getMember, errorResponse, audit, HttpError, MANAGERS } from '@/lib/auth/member'
import {
  metaPlatformConfig, exchangeCodeForToken, getPhoneNumber, subscribeAppToWaba, registerPhone,
  encryptToken, getConnectedAccount, sendTemplateMessage, logWaEvent, GraphError,
} from '@/lib/whatsapp/graph'
import { ensureTemplateRows, submitTemplates, syncTemplates } from '@/lib/whatsapp/templates'
import { META_LANG, type TemplateLang, VARIABLES, type VariableKey } from '@/lib/automations/definitions'
import { SITE_URL } from '@/lib/automations/engine'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** Estado completo da integração WhatsApp do hotel */
export async function GET() {
  try {
    const { hotelId } = await getMember()
    const svc = createServiceSupabase()
    const cfg = metaPlatformConfig()
    const [{ data: account }, templates, { data: events }] = await Promise.all([
      svc.from('whatsapp_accounts').select('connection_status, phone_number, display_name, waba_id, phone_number_id, connected_at, quality_rating, last_error, connection_method, last_checked_at, verification_status')
        .eq('hotel_id', hotelId).maybeSingle(),
      ensureTemplateRows(hotelId),
      svc.from('whatsapp_events').select('id, kind, level, summary, created_at, message_id').eq('hotel_id', hotelId)
        .order('created_at', { ascending: false }).limit(80),
    ])
    return NextResponse.json({
      platform: {
        embeddedSignupAvailable: cfg.hasEmbeddedSignup,
        appId: cfg.appId || null,
        configId: cfg.configId || null,
        webhookReady: cfg.hasWebhookVerify && cfg.hasAppSecret,
        webhookUrl: `${SITE_URL}/api/webhooks/whatsapp`,
      },
      account: account || null,
      templates,
      events: events || [],
    })
  } catch (e) {
    return errorResponse(e)
  }
}

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('connect_embedded'), code: z.string().min(5), waba_id: z.string().min(3), phone_number_id: z.string().min(3) }),
  z.object({ action: z.literal('connect_manual'), waba_id: z.string().regex(/^\d{5,25}$/, 'ID da conta inválido'), phone_number_id: z.string().regex(/^\d{5,25}$/, 'ID do número inválido'), access_token: z.string().min(20, 'Token inválido') }),
  z.object({ action: z.literal('check') }),
  z.object({ action: z.literal('disconnect') }),
  z.object({ action: z.literal('submit_templates') }),
  z.object({ action: z.literal('sync_templates') }),
  z.object({ action: z.literal('test_send'), to: z.string().regex(/^\+[1-9]\d{7,14}$/, 'Use o formato internacional, ex.: +5565999999999') }),
])

async function saveAccount(hotelId: string, data: {
  waba_id: string; phone_number_id: string; token: string; method: 'embedded_signup' | 'manual'
  phone_number?: string; display_name?: string; quality_rating?: string; verification?: string
}) {
  const svc = createServiceSupabase()
  const row = {
    hotel_id: hotelId, waba_id: data.waba_id, phone_number_id: data.phone_number_id,
    phone_number: data.phone_number || null, display_name: data.display_name || null,
    connection_status: 'connected', access_token_encrypted: encryptToken(data.token),
    connected_at: new Date().toISOString(), connection_method: data.method,
    quality_rating: data.quality_rating || null, verification_status: data.verification || null,
    last_error: null, last_checked_at: new Date().toISOString(),
  }
  const { error } = await svc.from('whatsapp_accounts').upsert(row, { onConflict: 'hotel_id' })
  if (error) throw error
}

export async function POST(req: NextRequest) {
  try {
    const parsed = schema.safeParse(await req.json())
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message || 'Requisição inválida')
    const body = parsed.data
    const member = await getMember(MANAGERS)
    const hotelId = member.hotelId
    const svc = createServiceSupabase()

    if (body.action === 'connect_embedded') {
      const cfg = metaPlatformConfig()
      if (!cfg.hasEmbeddedSignup) throw new HttpError(400, 'O cadastro incorporado da Meta ainda não foi configurado na plataforma.')
      const token = await exchangeCodeForToken(body.code)
      const phone = await getPhoneNumber(body.phone_number_id, token)
      try { await subscribeAppToWaba(body.waba_id, token) } catch (e) {
        await logWaEvent({ hotelId, kind: 'connect', level: 'warn', summary: `Assinatura de webhooks falhou: ${(e as Error).message}` })
      }
      try { await registerPhone(body.phone_number_id, token, String(randomInt(100000, 999999))) } catch (e) {
        await logWaEvent({ hotelId, kind: 'connect', level: 'warn', summary: `Registro do número na Cloud API: ${(e as Error).message}` })
      }
      await saveAccount(hotelId, {
        waba_id: body.waba_id, phone_number_id: body.phone_number_id, token, method: 'embedded_signup',
        phone_number: phone.display_phone_number, display_name: phone.verified_name,
        quality_rating: phone.quality_rating, verification: phone.code_verification_status,
      })
      await logWaEvent({ hotelId, kind: 'connect', summary: `WhatsApp conectado via Meta: ${phone.display_phone_number || body.phone_number_id}` })
      await audit(hotelId, member.userId, 'whatsapp.connected', 'whatsapp_account', null, { method: 'embedded_signup' })
      const templates = await submitTemplates(hotelId).catch(e => [{ ok: false, error: String(e) }])
      return NextResponse.json({ ok: true, phone, templates })
    }

    if (body.action === 'connect_manual') {
      // Validação real: só marca como conectado se a Meta reconhecer o número com este token
      let phone
      try {
        phone = await getPhoneNumber(body.phone_number_id, body.access_token)
      } catch (e) {
        const msg = e instanceof GraphError ? e.message : String(e)
        await logWaEvent({ hotelId, kind: 'connect', level: 'error', summary: `Conexão manual recusada pela Meta: ${msg}` })
        throw new HttpError(400, `A Meta recusou os dados informados: ${msg}`)
      }
      try { await subscribeAppToWaba(body.waba_id, body.access_token) } catch (e) {
        await logWaEvent({ hotelId, kind: 'connect', level: 'warn', summary: `Não foi possível assinar webhooks na conta: ${(e as Error).message}` })
      }
      await saveAccount(hotelId, {
        waba_id: body.waba_id, phone_number_id: body.phone_number_id, token: body.access_token, method: 'manual',
        phone_number: phone.display_phone_number, display_name: phone.verified_name,
        quality_rating: phone.quality_rating, verification: phone.code_verification_status,
      })
      await logWaEvent({ hotelId, kind: 'connect', summary: `WhatsApp conectado manualmente: ${phone.display_phone_number || body.phone_number_id}` })
      await audit(hotelId, member.userId, 'whatsapp.connected', 'whatsapp_account', null, { method: 'manual' })
      const templates = await submitTemplates(hotelId).catch(e => [{ ok: false, error: String(e) }])
      return NextResponse.json({ ok: true, phone, templates })
    }

    if (body.action === 'check') {
      const account = await getConnectedAccount(hotelId)
      if (!account) throw new HttpError(400, 'WhatsApp não conectado')
      try {
        const phone = await getPhoneNumber(account.phone_number_id!, account.token)
        await svc.from('whatsapp_accounts').update({
          phone_number: phone.display_phone_number, display_name: phone.verified_name,
          quality_rating: phone.quality_rating, verification_status: phone.code_verification_status,
          last_error: null, last_checked_at: new Date().toISOString(),
        }).eq('hotel_id', hotelId)
        await logWaEvent({ hotelId, kind: 'connect', summary: 'Verificação de conexão: OK' })
        return NextResponse.json({ ok: true, phone })
      } catch (e) {
        const msg = e instanceof GraphError ? e.message : String(e)
        await svc.from('whatsapp_accounts').update({ connection_status: 'error', last_error: msg, last_checked_at: new Date().toISOString() }).eq('hotel_id', hotelId)
        await logWaEvent({ hotelId, kind: 'connect', level: 'error', summary: `Verificação de conexão falhou: ${msg}` })
        throw new HttpError(400, `Conexão com a Meta falhou: ${msg}`)
      }
    }

    if (body.action === 'disconnect') {
      await svc.from('whatsapp_accounts').update({ connection_status: 'disconnected', access_token_encrypted: null }).eq('hotel_id', hotelId)
      await logWaEvent({ hotelId, kind: 'connect', level: 'warn', summary: 'WhatsApp desconectado pelo hotel' })
      await audit(hotelId, member.userId, 'whatsapp.disconnected', 'whatsapp_account', null)
      return NextResponse.json({ ok: true })
    }

    if (body.action === 'submit_templates') {
      const results = await submitTemplates(hotelId)
      return NextResponse.json({ ok: true, results })
    }

    if (body.action === 'sync_templates') {
      const r = await syncTemplates(hotelId)
      return NextResponse.json({ ok: true, ...r })
    }

    if (body.action === 'test_send') {
      const account = await getConnectedAccount(hotelId)
      if (!account) throw new HttpError(400, 'Conecte o WhatsApp antes de enviar um teste.')
      const { data: tpls } = await svc.from('message_templates').select('*').eq('hotel_id', hotelId).eq('status', 'approved')
      const tpl = (tpls || []).find(t => t.automation_type === 'welcome' && t.language === 'pt-BR') || (tpls || [])[0]
      const { data: hotel } = await svc.from('hotels').select('name, reception_contact, google_review_url').eq('id', hotelId).single()
      const templateName = tpl?.template_name || 'hello_world'
      const lang = tpl ? META_LANG[tpl.language as TemplateLang] : 'en_US'
      const values: Record<string, string> = {
        nome_hospede: 'Teste', nome_hotel: hotel?.name || 'Hotel', contato_recepcao: hotel?.reception_contact || '-',
        link_google: hotel?.google_review_url || SITE_URL,
      }
      const params = tpl ? (tpl.variables as string[]).map(v => values[v] || VARIABLES[v as VariableKey]?.example || '-') : []
      const { data: msgRow } = await svc.from('messages').insert({
        hotel_id: hotelId, direction: 'outbound', status: 'queued', automation_type: 'test', language: tpl?.language || 'en',
        trigger_source: 'test', triggered_by: member.userId, recipient: body.to, template_name: templateName, params,
        idempotency_key: `test-${hotelId}-${Date.now()}`,
      }).select('id').single()
      try {
        const wamid = await sendTemplateMessage({ phoneNumberId: account.phone_number_id!, token: account.token, to: body.to, templateName, language: lang, params })
        await svc.from('messages').update({ status: 'sent', sent_at: new Date().toISOString(), whatsapp_message_id: wamid }).eq('id', msgRow!.id)
        await logWaEvent({ hotelId, kind: 'send', summary: `Mensagem de teste (${templateName}) enviada para ${body.to}`, messageId: msgRow!.id })
        return NextResponse.json({ ok: true, template: templateName })
      } catch (e) {
        const msg = e instanceof GraphError ? e.message : String(e)
        await svc.from('messages').update({ status: 'failed', failed_at: new Date().toISOString(), failure_reason: msg }).eq('id', msgRow!.id)
        await logWaEvent({ hotelId, kind: 'send', level: 'error', summary: `Teste falhou: ${msg}`, messageId: msgRow!.id, payload: e instanceof GraphError ? e.details : undefined })
        throw new HttpError(400, `A Meta recusou o envio de teste: ${msg}`)
      }
    }

    throw new HttpError(400, 'Ação desconhecida')
  } catch (e) {
    return errorResponse(e)
  }
}
