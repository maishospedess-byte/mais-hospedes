import { createServiceSupabase } from '@/lib/supabase/server'

export type GuestFilters = {
  q?: string | null
  from?: string | null
  to?: string | null
  status?: string | null // all | pending | active | completed | blocked
  sort?: string | null   // recent | oldest | name
}

export type GuestListRow = {
  id: string
  full_name: string
  whatsapp_number: string
  email: string | null
  language: string
  hotel_name: string
  registered_at: string
  checkin_date: string | null
  checkout_date: string | null
  stay_status: 'pending' | 'active' | 'completed' | 'blocked' | 'none'
  registrations: number
  last_message: { automation_type: string | null; status: string; at: string; failure_reason: string | null } | null
  score: number | null
  opted_out: boolean
}

export function stayStatusOf(regStatus: string | undefined, stayStatus: string | undefined): GuestListRow['stay_status'] {
  if (regStatus === 'registration_blocked') return 'blocked'
  if (stayStatus === 'stay_completed') return 'completed'
  if (stayStatus === 'stay_active') return 'active'
  if (regStatus === 'registration_pending' || regStatus === 'registration_confirmed') return 'pending'
  return 'none'
}

export async function listGuests(hotelId: string, f: GuestFilters): Promise<GuestListRow[]> {
  const svc = createServiceSupabase()
  const { data: hotel } = await svc.from('hotels').select('name').eq('id', hotelId).single()
  let gq = svc.from('guest_profiles').select('*').eq('hotel_id', hotelId).limit(2000)
  const q = (f.q || '').trim()
  if (q) {
    const safe = q.replace(/[%,()]/g, ' ').trim()
    const digits = q.replace(/\D/g, '')
    gq = digits.length >= 3
      ? gq.or(`full_name.ilike.%${safe}%,whatsapp_number.ilike.%${digits}%`)
      : gq.ilike('full_name', `%${safe}%`)
  }
  const { data: guests } = await gq
  if (!guests?.length) return []
  const ids = guests.map(g => g.id)

  const chunk = <T,>(arr: T[], n = 300) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n))
  const regs: Record<string, unknown>[] = [], stays: Record<string, unknown>[] = [], msgs: Record<string, unknown>[] = [], sats: Record<string, unknown>[] = []
  for (const part of chunk(ids)) {
    const [r, s, m, sa] = await Promise.all([
      svc.from('registrations').select('id, guest_id, status, created_at, checkin_date, checkout_date').in('guest_id', part).order('created_at', { ascending: false }),
      svc.from('stays').select('id, guest_id, registration_id, status').in('guest_id', part).neq('status', 'cancelled'),
      svc.from('messages').select('guest_id, automation_type, status, created_at, failure_reason').in('guest_id', part).eq('direction', 'outbound').order('created_at', { ascending: false }).limit(5000),
      svc.from('satisfaction_responses').select('guest_id, score, responded_at').in('guest_id', part).order('responded_at', { ascending: false }),
    ])
    regs.push(...(r.data || [])); stays.push(...(s.data || [])); msgs.push(...(m.data || [])); sats.push(...(sa.data || []))
  }
  const { data: optOuts } = await svc.from('opt_out_records').select('whatsapp_number').eq('hotel_id', hotelId)
  const optSet = new Set((optOuts || []).map(o => o.whatsapp_number))

  let rows: GuestListRow[] = guests.map(g => {
    const gRegs = regs.filter(r => r.guest_id === g.id)
    const last = gRegs[0] as { id: string; status: string; created_at: string; checkin_date: string; checkout_date: string } | undefined
    const stay = last ? stays.find(s => s.registration_id === last.id) as { status: string } | undefined : undefined
    const lm = msgs.find(m => m.guest_id === g.id) as { automation_type: string | null; status: string; created_at: string; failure_reason: string | null } | undefined
    const sc = sats.find(s => s.guest_id === g.id) as { score: number } | undefined
    return {
      id: g.id, full_name: g.full_name, whatsapp_number: g.whatsapp_number, email: g.email, language: g.language,
      hotel_name: hotel?.name || '',
      registered_at: last?.created_at || g.created_at,
      checkin_date: last?.checkin_date || null, checkout_date: last?.checkout_date || null,
      stay_status: stayStatusOf(last?.status, stay?.status),
      registrations: gRegs.length,
      last_message: lm ? { automation_type: lm.automation_type, status: lm.status, at: lm.created_at, failure_reason: lm.failure_reason } : null,
      score: sc ? sc.score : null,
      opted_out: optSet.has(g.whatsapp_number),
    }
  })

  if (f.from) rows = rows.filter(r => r.registered_at >= f.from!)
  if (f.to) rows = rows.filter(r => r.registered_at < f.to!)
  if (f.status && f.status !== 'all') rows = rows.filter(r => r.stay_status === f.status)
  if (f.sort === 'name') rows.sort((a, b) => a.full_name.localeCompare(b.full_name, 'pt-BR'))
  else if (f.sort === 'oldest') rows.sort((a, b) => a.registered_at.localeCompare(b.registered_at))
  else rows.sort((a, b) => b.registered_at.localeCompare(a.registered_at))
  return rows
}
