import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceSupabase } from '@/lib/supabase/server'
import { getMember, errorResponse, audit, HttpError, MANAGERS } from '@/lib/auth/member'

export const dynamic = 'force-dynamic'

const opt = (max: number) => z.string().trim().max(max).optional().nullable().transform(v => (v ? v : null))
const url = z.string().trim().max(500).optional().nullable()
  .refine(v => !v || /^https?:\/\/\S+$/i.test(v), 'Informe um link completo começando com https://')
  .transform(v => (v ? v : null))

const schema = z.object({
  name: z.string().trim().min(2, 'Nome do hotel obrigatório').max(120).optional(),
  phone: opt(40),
  whatsapp_number: z.string().trim().max(20).optional().nullable()
    .refine(v => !v || /^\+[1-9]\d{7,14}$/.test(v.replace(/[\s()-]/g, '')), 'WhatsApp no formato internacional, ex.: +5565999999999')
    .transform(v => (v ? v.replace(/[\s()-]/g, '') : null)),
  instagram_url: url,
  google_review_url: url,
  checkin_time: opt(40),
  checkout_time: opt(40),
  breakfast_time: opt(80),
  wifi_info: opt(200),
  rules: opt(1000),
  reception_contact: opt(80),
  timezone: z.string().max(60).optional(),
  primary_language: z.enum(['pt-BR', 'es', 'en']).optional(),
  country: z.enum(['BR', 'PY']).optional(),
}).strict()

export async function GET() {
  try {
    const { hotelId, role } = await getMember()
    const svc = createServiceSupabase()
    const { data: hotel } = await svc.from('hotels').select('*').eq('id', hotelId).single()
    const { count: qrRegistrations } = await svc.from('registrations').select('id', { count: 'exact', head: true }).eq('hotel_id', hotelId)
    return NextResponse.json({ hotel, role, qrRegistrations: qrRegistrations || 0 })
  } catch (e) {
    return errorResponse(e)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const member = await getMember(MANAGERS)
    const parsed = schema.safeParse(await req.json())
    if (!parsed.success) {
      const i = parsed.error.issues[0]
      throw new HttpError(400, `${i.path.join('.') ? i.path.join('.') + ': ' : ''}${i.message}`)
    }
    const patch = Object.fromEntries(Object.entries(parsed.data).filter(([, v]) => v !== undefined))
    if (!Object.keys(patch).length) return NextResponse.json({ ok: true })
    const svc = createServiceSupabase()
    const { data, error } = await svc.from('hotels').update(patch).eq('id', member.hotelId).select('*').single()
    if (error) throw error
    await audit(member.hotelId, member.userId, 'settings.updated', 'hotel', member.hotelId, { fields: Object.keys(patch) })
    return NextResponse.json({ ok: true, hotel: data })
  } catch (e) {
    return errorResponse(e)
  }
}
