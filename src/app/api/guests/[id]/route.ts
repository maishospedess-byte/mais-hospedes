import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabase } from '@/lib/supabase/server'
import { getMember, errorResponse, HttpError } from '@/lib/auth/member'

export const dynamic = 'force-dynamic'

/** Ficha do hóspede: cadastros, estadias, mensagens, consentimento e notas */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { hotelId } = await getMember()
    const svc = createServiceSupabase()
    const { data: guest } = await svc.from('guest_profiles').select('*').eq('id', params.id).eq('hotel_id', hotelId).maybeSingle()
    if (!guest) throw new HttpError(404, 'Hóspede não encontrado')
    const [regs, stays, msgs, consent, sat, opt] = await Promise.all([
      svc.from('registrations').select('id, status, created_at, checkin_date, checkout_date, guest_count, block_reason, confirmed_at').eq('guest_id', guest.id).order('created_at', { ascending: false }),
      svc.from('stays').select('id, registration_id, status, checkin_date, checkout_date, confirmed_at, completed_at').eq('guest_id', guest.id).neq('status', 'cancelled').order('created_at', { ascending: false }),
      svc.from('messages').select('id, direction, automation_type, status, content, scheduled_for, sent_at, delivered_at, read_at, failed_at, failure_reason, created_at, trigger_source').eq('guest_id', guest.id).order('created_at', { ascending: false }).limit(200),
      svc.from('consent_records').select('consented, consent_text, created_at').eq('guest_id', guest.id).order('created_at', { ascending: false }),
      svc.from('satisfaction_responses').select('stay_id, score, responded_at').eq('guest_id', guest.id).order('responded_at', { ascending: false }),
      svc.from('opt_out_records').select('opted_out_at, source').eq('hotel_id', hotelId).eq('whatsapp_number', guest.whatsapp_number).maybeSingle(),
    ])
    return NextResponse.json({
      guest, registrations: regs.data || [], stays: stays.data || [], messages: msgs.data || [],
      consent: consent.data || [], satisfaction: sat.data || [], optOut: opt.data || null,
    })
  } catch (e) {
    return errorResponse(e)
  }
}
