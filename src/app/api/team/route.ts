import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceSupabase } from '@/lib/supabase/server'
import { getMember, errorResponse, audit, HttpError } from '@/lib/auth/member'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { hotelId, userId, role } = await getMember()
    const svc = createServiceSupabase()
    const { data: members } = await svc.from('hotel_memberships')
      .select('id, user_id, role, is_active, created_at, users!hotel_memberships_user_id_fkey(email, full_name)')
      .eq('hotel_id', hotelId).order('created_at', { ascending: true })
    return NextResponse.json({ members: members || [], me: userId, myRole: role })
  } catch (e) {
    return errorResponse(e)
  }
}

const addSchema = z.object({
  full_name: z.string().trim().min(2, 'Informe o nome').max(120),
  email: z.string().trim().toLowerCase().email('E-mail inválido'),
  password: z.string().min(8, 'A senha provisória deve ter pelo menos 8 caracteres').max(72),
  role: z.enum(['manager', 'receptionist']),
})

/** Somente o proprietário adiciona membros (com senha provisória que ele repassa ao funcionário). */
export async function POST(req: NextRequest) {
  try {
    const member = await getMember(['owner'])
    const parsed = addSchema.safeParse(await req.json())
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0].message)
    const { full_name, email, password, role } = parsed.data
    const svc = createServiceSupabase()

    // limite de usuários do plano
    const { data: hotel } = await svc.from('hotels').select('organization_id').eq('id', member.hotelId).single()
    const { data: sub } = await svc.from('subscriptions').select('plans(user_limit)').eq('organization_id', hotel!.organization_id).order('created_at', { ascending: false }).limit(1).maybeSingle()
    const limit = (sub?.plans as unknown as { user_limit: number } | null)?.user_limit
    const { count } = await svc.from('hotel_memberships').select('id', { count: 'exact', head: true }).eq('hotel_id', member.hotelId).eq('is_active', true)
    if (limit && (count || 0) >= limit) throw new HttpError(400, `Seu plano permite até ${limit} usuários.`)

    let userId: string
    const { data: existing } = await svc.from('users').select('id').eq('email', email).maybeSingle()
    if (existing) {
      userId = existing.id
    } else {
      const { data: auth, error } = await svc.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name } })
      if (error) throw new HttpError(400, error.message.includes('already') ? 'Este e-mail já possui conta.' : error.message)
      userId = auth.user.id
      await svc.from('users').insert({ id: userId, email, full_name })
    }
    const { error: mErr } = await svc.from('hotel_memberships').upsert({
      user_id: userId, hotel_id: member.hotelId, role, is_active: true, invited_by: member.userId,
    }, { onConflict: 'user_id,hotel_id' })
    if (mErr) throw mErr
    await audit(member.hotelId, member.userId, 'team.member_added', 'user', userId, { role })
    return NextResponse.json({ ok: true, existingAccount: !!existing })
  } catch (e) {
    return errorResponse(e)
  }
}

const patchSchema = z.object({
  membership_id: z.string().uuid(),
  role: z.enum(['manager', 'receptionist']).optional(),
  is_active: z.boolean().optional(),
})

export async function PATCH(req: NextRequest) {
  try {
    const member = await getMember(['owner'])
    const parsed = patchSchema.safeParse(await req.json())
    if (!parsed.success) throw new HttpError(400, 'Requisição inválida')
    const svc = createServiceSupabase()
    const { data: target } = await svc.from('hotel_memberships').select('id, user_id, role').eq('id', parsed.data.membership_id).eq('hotel_id', member.hotelId).maybeSingle()
    if (!target) throw new HttpError(404, 'Membro não encontrado')
    if (target.role === 'owner') throw new HttpError(400, 'O proprietário não pode ser alterado aqui.')
    const patch: Record<string, unknown> = {}
    if (parsed.data.role) patch.role = parsed.data.role
    if (parsed.data.is_active !== undefined) patch.is_active = parsed.data.is_active
    await svc.from('hotel_memberships').update(patch).eq('id', target.id)
    await audit(member.hotelId, member.userId, 'team.member_updated', 'user', target.user_id, patch)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return errorResponse(e)
  }
}
