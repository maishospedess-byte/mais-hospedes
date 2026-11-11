import { NextResponse } from 'next/server'
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server'
import type { UserRole } from '@/types/database'

export type MemberContext = {
  userId: string
  email: string | null
  hotelId: string
  role: UserRole
}

export class HttpError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/**
 * Resolve o usuário autenticado e o hotel ao qual pertence (primeira membership ativa).
 * Sempre validado no servidor — nunca confiar no hotel_id vindo do navegador.
 */
export async function getMember(allowed?: UserRole[]): Promise<MemberContext> {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new HttpError(401, 'Sessão expirada. Faça login novamente.')

  const service = createServiceSupabase()
  const { data: membership } = await service
    .from('hotel_memberships')
    .select('hotel_id, role')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!membership) throw new HttpError(403, 'Nenhum hotel vinculado a esta conta.')
  const role = membership.role as UserRole
  if (allowed && !allowed.includes(role)) {
    throw new HttpError(403, 'Seu perfil não tem permissão para esta ação.')
  }
  return { userId: user.id, email: user.email ?? null, hotelId: membership.hotel_id, role }
}

export const MANAGERS: UserRole[] = ['owner', 'manager']

export function errorResponse(err: unknown) {
  if (err instanceof HttpError) {
    return NextResponse.json({ error: err.message }, { status: err.status })
  }
  console.error(err)
  const message = err instanceof Error ? err.message : 'Erro interno'
  return NextResponse.json({ error: message }, { status: 500 })
}

export async function audit(
  hotelId: string,
  userId: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  metadata: Record<string, unknown> = {}
) {
  const service = createServiceSupabase()
  await service.from('audit_logs').insert({
    hotel_id: hotelId,
    user_id: userId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata,
  })
}
