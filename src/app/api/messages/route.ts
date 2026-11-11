import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabase } from '@/lib/supabase/server'
import { getMember, errorResponse } from '@/lib/auth/member'

export const dynamic = 'force-dynamic'

/** Histórico real de envios e respostas (com filtros) */
export async function GET(req: NextRequest) {
  try {
    const { hotelId } = await getMember()
    const p = req.nextUrl.searchParams
    const svc = createServiceSupabase()
    let q = svc.from('messages')
      .select('id, direction, automation_type, status, content, recipient, scheduled_for, sent_at, delivered_at, read_at, failed_at, failure_reason, failure_code, created_at, trigger_source, attempts, guest_id, guest_profiles(full_name, whatsapp_number)')
      .eq('hotel_id', hotelId).order('created_at', { ascending: false }).limit(Math.min(Number(p.get('limit') || 200), 500))
    const type = p.get('type'), status = p.get('status'), direction = p.get('direction'), from = p.get('from'), to = p.get('to')
    if (type && type !== 'all') q = q.eq('automation_type', type)
    if (status && status !== 'all') q = status === 'sent' ? q.in('status', ['sent', 'delivered', 'read']) : status === 'pending' ? q.in('status', ['scheduled', 'queued']) : q.eq('status', status)
    if (direction && direction !== 'all') q = q.eq('direction', direction)
    if (from) q = q.gte('created_at', from)
    if (to) q = q.lt('created_at', to)
    const { data, error } = await q
    if (error) throw error
    return NextResponse.json({ messages: data || [] })
  } catch (e) {
    return errorResponse(e)
  }
}
