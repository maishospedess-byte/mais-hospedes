// Cliente da WhatsApp Cloud API (API oficial da Meta — Graph API)
import { createCipheriv, createDecipheriv, createHash, randomBytes, createHmac, timingSafeEqual } from 'crypto'
import { createServiceSupabase } from '@/lib/supabase/server'

export const GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v23.0'
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`

/** Quais credenciais da plataforma (app Meta da Mais Hóspedes) estão configuradas */
export function metaPlatformConfig() {
  return {
    appId: process.env.NEXT_PUBLIC_META_APP_ID || '',
    configId: process.env.NEXT_PUBLIC_META_ES_CONFIG_ID || '',
    appSecret: process.env.META_APP_SECRET || '',
    webhookVerifyToken: process.env.META_WEBHOOK_VERIFY_TOKEN || '',
    hasEmbeddedSignup: !!(process.env.NEXT_PUBLIC_META_APP_ID && process.env.NEXT_PUBLIC_META_ES_CONFIG_ID && process.env.META_APP_SECRET),
    hasWebhookVerify: !!process.env.META_WEBHOOK_VERIFY_TOKEN,
    hasAppSecret: !!process.env.META_APP_SECRET,
  }
}

// ---------- criptografia do token de acesso (AES-256-GCM) ----------
function key() {
  const base = process.env.WHATSAPP_ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!base) throw new Error('Chave de criptografia indisponível')
  return createHash('sha256').update('mh-wa-token:' + base).digest()
}
export function encryptToken(token: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const enc = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`
}
export function decryptToken(payload: string) {
  const [v, ivB, tagB, encB] = payload.split(':')
  if (v !== 'v1') throw new Error('Formato de token desconhecido')
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(ivB, 'base64'))
  decipher.setAuthTag(Buffer.from(tagB, 'base64'))
  return Buffer.concat([decipher.update(Buffer.from(encB, 'base64')), decipher.final()]).toString('utf8')
}

/** Valida a assinatura X-Hub-Signature-256 enviada pela Meta nos webhooks */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.META_APP_SECRET
  if (!secret || !signature?.startsWith('sha256=')) return false
  const expected = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')
  const got = signature.slice(7)
  if (got.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(got, 'hex'), Buffer.from(expected, 'hex'))
}

// ---------- chamadas Graph ----------
export class GraphError extends Error {
  status: number
  code?: number
  subcode?: number
  transient: boolean
  details: unknown
  constructor(status: number, body: Record<string, unknown> | null, fallback: string) {
    const err = (body?.error || {}) as Record<string, unknown>
    const msg = (err.error_user_msg as string) || (err.message as string) || fallback
    super(msg)
    this.status = status
    this.code = err.code as number | undefined
    this.subcode = err.error_subcode as number | undefined
    this.transient = status >= 500 || status === 429 || err.is_transient === true || err.code === 2 || err.code === 4
    this.details = body
  }
}

export async function graph<T = Record<string, unknown>>(
  path: string,
  opts: { method?: string; token: string; body?: unknown; query?: Record<string, string> }
): Promise<T> {
  const url = new URL(path.startsWith('http') ? path : `${GRAPH}/${path.replace(/^\//, '')}`)
  if (opts.query) for (const [k, v] of Object.entries(opts.query)) url.searchParams.set(k, v)
  let res: Response
  try {
    res = await fetch(url, {
      method: opts.method || 'GET',
      headers: {
        Authorization: `Bearer ${opts.token}`,
        ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      cache: 'no-store',
    })
  } catch (e) {
    const err = new GraphError(503, null, 'Falha de rede ao contatar a Meta')
    err.details = String(e)
    throw err
  }
  const json = (await res.json().catch(() => null)) as Record<string, unknown> | null
  if (!res.ok || json?.error) throw new GraphError(res.status, json, `Erro ${res.status} da Meta`)
  return json as T
}

/** Troca o "code" do Embedded Signup por um token de acesso do negócio */
export async function exchangeCodeForToken(code: string): Promise<string> {
  const cfg = metaPlatformConfig()
  const url = new URL(`${GRAPH}/oauth/access_token`)
  url.searchParams.set('client_id', cfg.appId)
  url.searchParams.set('client_secret', cfg.appSecret)
  url.searchParams.set('code', code)
  const res = await fetch(url, { cache: 'no-store' })
  const json = (await res.json().catch(() => null)) as Record<string, unknown> | null
  if (!res.ok || !json?.access_token) throw new GraphError(res.status, json, 'Não foi possível validar a autorização com a Meta')
  return json.access_token as string
}

export type PhoneInfo = {
  id: string
  display_phone_number?: string
  verified_name?: string
  quality_rating?: string
  code_verification_status?: string
  name_status?: string
}

export function getPhoneNumber(phoneNumberId: string, token: string) {
  return graph<PhoneInfo>(phoneNumberId, {
    token,
    query: { fields: 'id,display_phone_number,verified_name,quality_rating,code_verification_status,name_status' },
  })
}

export function subscribeAppToWaba(wabaId: string, token: string) {
  return graph(`${wabaId}/subscribed_apps`, { method: 'POST', token })
}

export function registerPhone(phoneNumberId: string, token: string, pin: string) {
  return graph(`${phoneNumberId}/register`, { method: 'POST', token, body: { messaging_product: 'whatsapp', pin } })
}

export async function sendTemplateMessage(args: {
  phoneNumberId: string
  token: string
  to: string
  templateName: string
  language: string
  params: string[]
}) {
  const to = args.to.replace(/\D/g, '')
  const body: Record<string, unknown> = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'template',
    template: {
      name: args.templateName,
      language: { code: args.language },
      ...(args.params.length
        ? { components: [{ type: 'body', parameters: args.params.map(text => ({ type: 'text', text })) }] }
        : {}),
    },
  }
  const res = await graph<{ messages?: { id: string }[] }>(`${args.phoneNumberId}/messages`, {
    method: 'POST',
    token: args.token,
    body,
  })
  const id = res.messages?.[0]?.id
  if (!id) throw new GraphError(500, null, 'A Meta não retornou o ID da mensagem')
  return id
}

export type MetaTemplate = { id: string; name: string; language: string; status: string; category: string; rejected_reason?: string }

export async function listTemplates(wabaId: string, token: string): Promise<MetaTemplate[]> {
  const out: MetaTemplate[] = []
  let next: string | undefined = `${wabaId}/message_templates?fields=id,name,language,status,category,rejected_reason&limit=100`
  while (next) {
    const res: { data: MetaTemplate[]; paging?: { next?: string } } = await graph(next, { token })
    out.push(...(res.data || []))
    next = res.paging?.next
  }
  return out
}

export function createTemplate(wabaId: string, token: string, t: {
  name: string; language: string; category: string; body: string; examples: string[]
}) {
  return graph<{ id: string; status: string; category: string }>(`${wabaId}/message_templates`, {
    method: 'POST',
    token,
    body: {
      name: t.name,
      language: t.language,
      category: t.category,
      components: [{
        type: 'BODY',
        text: t.body,
        ...(t.examples.length ? { example: { body_text: [t.examples] } } : {}),
      }],
    },
  })
}

export function editTemplate(templateId: string, token: string, t: { body: string; examples: string[] }) {
  return graph(`${templateId}`, {
    method: 'POST',
    token,
    body: {
      components: [{
        type: 'BODY',
        text: t.body,
        ...(t.examples.length ? { example: { body_text: [t.examples] } } : {}),
      }],
    },
  })
}

// ---------- conta do hotel ----------
export type HotelWaAccount = {
  id: string
  hotel_id: string
  waba_id: string | null
  phone_number_id: string | null
  phone_number: string | null
  display_name: string | null
  connection_status: string
  access_token_encrypted: string | null
}

export async function getConnectedAccount(hotelId: string): Promise<(HotelWaAccount & { token: string }) | null> {
  const service = createServiceSupabase()
  const { data } = await service.from('whatsapp_accounts').select('*').eq('hotel_id', hotelId).maybeSingle()
  if (!data || data.connection_status !== 'connected' || !data.access_token_encrypted || !data.phone_number_id) return null
  try {
    return { ...(data as HotelWaAccount), token: decryptToken(data.access_token_encrypted) }
  } catch {
    return null
  }
}

/** Registra um evento técnico (logs de diagnóstico) */
export async function logWaEvent(e: {
  hotelId: string | null
  kind: string
  level?: 'info' | 'warn' | 'error'
  summary: string
  messageId?: string | null
  payload?: unknown
}) {
  try {
    const service = createServiceSupabase()
    await service.from('whatsapp_events').insert({
      hotel_id: e.hotelId,
      kind: e.kind,
      level: e.level || 'info',
      summary: e.summary.slice(0, 500),
      message_id: e.messageId || null,
      payload: e.payload === undefined ? null : JSON.parse(JSON.stringify(e.payload, (_k, v) =>
        typeof v === 'string' && /^EAA/.test(v) ? '[token]' : v)),
    })
  } catch (err) {
    console.error('logWaEvent failed', err)
  }
}
