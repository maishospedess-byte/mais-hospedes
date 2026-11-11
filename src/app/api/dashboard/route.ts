import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabase } from '@/lib/supabase/server'
import { getMember, errorResponse, HttpError } from '@/lib/auth/member'
import { getConnectedAccount } from '@/lib/whatsapp/graph'

export const dynamic = 'force-dynamic'

type Svc = ReturnType<typeof createServiceSupabase>

async function metrics(svc: Svc, hotelId: string, from: string, to: string) {
  const count = async (table: string, col: string, extra?: (q: any) => any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    let q = svc.from(table).select('id', { count: 'exact', head: true }).eq('hotel_id', hotelId).gte(col, from).lt(col, to)
    if (extra) q = extra(q)
    const { count: c } = await q
    return c || 0
  }
  const [registrations, checkins, checkouts, reviewClicks, blocked] = await Promise.all([
    count('registrations', 'created_at'),
    count('stays', 'confirmed_at', q => q.neq('status', 'cancelled')),
    count('stays', 'completed_at', q => q.eq('status', 'stay_completed')),
    count('review_link_clicks', 'clicked_at'),
    count('registrations', 'blocked_at'),
  ])
  const { data: msgs } = await svc.from('messages').select('status, automation_type')
    .eq('hotel_id', hotelId).eq('direction', 'outbound').gte('created_at', from).lt('created_at', to).limit(10000)
  const m = (msgs || []).filter(x => x.automation_type !== 'test')
  const { data: sat } = await svc.from('satisfaction_responses').select('score')
    .eq('hotel_id', hotelId).gte('responded_at', from).lt('responded_at', to).limit(10000)
  const scores = (sat || []).map(s => s.score as number)
  const { count: surveysSent } = await svc.from('messages').select('id', { count: 'exact', head: true })
    .eq('hotel_id', hotelId).eq('automation_type', 'checkout_survey').in('status', ['sent', 'delivered', 'read'])
    .gte('created_at', from).lt('created_at', to)
  return {
    registrations, checkins, checkouts, blocked, reviewClicks,
    messages: {
      sent: m.filter(x => ['sent', 'delivered', 'read'].includes(x.status)).length,
      delivered: m.filter(x => ['delivered', 'read'].includes(x.status)).length,
      read: m.filter(x => x.status === 'read').length,
      failed: m.filter(x => x.status === 'failed').length,
      scheduled: m.filter(x => ['scheduled', 'queued'].includes(x.status)).length,
    },
    surveysSent: surveysSent || 0,
    surveysAnswered: scores.length,
    avgSatisfaction: scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null,
    promoters: scores.filter(s => s >= 9).length,
    detractors: scores.filter(s => s <= 6).length,
  }
}

export async function GET(req: NextRequest) {
  try {
    const { hotelId } = await getMember()
    const p = req.nextUrl.searchParams
    const from = p.get('from'), to = p.get('to')
    if (!from || !to || isNaN(Date.parse(from)) || isNaN(Date.parse(to)) || Date.parse(to) <= Date.parse(from)) {
      throw new HttpError(400, 'Período inválido')
    }
    const span = Date.parse(to) - Date.parse(from)
    const prevFrom = new Date(Date.parse(from) - span).toISOString()
    const svc = createServiceSupabase()

    // início do dia/mês no fuso do navegador do hotel (o servidor roda em UTC)
    const todayParam = p.get('today'), monthParam = p.get('month')
    const startOfToday = todayParam && !isNaN(Date.parse(todayParam)) ? new Date(todayParam) : new Date(new Date().setHours(0, 0, 0, 0))
    const monthStart = monthParam && !isNaN(Date.parse(monthParam)) ? new Date(monthParam) : new Date(new Date(new Date().setDate(1)).setHours(0, 0, 0, 0))

    const [current, previous, account, pendingRegs, { count: hostedNow }, { data: recentRegs }, { count: monthStays }, { data: hotel }] = await Promise.all([
      metrics(svc, hotelId, from, to),
      metrics(svc, hotelId, prevFrom, from),
      getConnectedAccount(hotelId),
      svc.from('registrations').select('id').eq('hotel_id', hotelId).eq('status', 'registration_pending').limit(1000),
      svc.from('stays').select('id', { count: 'exact', head: true }).eq('hotel_id', hotelId).eq('status', 'stay_active'),
      svc.from('registrations').select('id, status, created_at, checkin_date, checkout_date, guest_id, guest_profiles(full_name, whatsapp_number, language)')
        .eq('hotel_id', hotelId).gte('created_at', from).lt('created_at', to).order('created_at', { ascending: false }).limit(12),
      svc.from('stays').select('id', { count: 'exact', head: true }).eq('hotel_id', hotelId).neq('status', 'cancelled').gte('confirmed_at', monthStart.toISOString()),
      svc.from('hotels').select('organization_id, google_review_url, instagram_url, logo_url, wifi_info, breakfast_time, checkout_time, reception_contact').eq('id', hotelId).single(),
    ])

    const pendingIds = (pendingRegs.data || []).map(r => r.id)
    let awaitingWelcome = 0
    if (pendingIds.length) {
      const { count } = await svc.from('messages').select('id', { count: 'exact', head: true })
        .in('registration_id', pendingIds).eq('automation_type', 'welcome').in('status', ['scheduled', 'queued'])
      awaitingWelcome = count || 0
    }
    const { count: checkoutsToday } = await svc.from('stays').select('id', { count: 'exact', head: true })
      .eq('hotel_id', hotelId).eq('status', 'stay_completed').gte('completed_at', startOfToday.toISOString())

    // estado + boas-vindas dos cadastros recentes
    const regIds = (recentRegs || []).map(r => r.id)
    const [{ data: rStays }, { data: rMsgs }] = regIds.length ? await Promise.all([
      svc.from('stays').select('id, registration_id, status').in('registration_id', regIds).neq('status', 'cancelled'),
      svc.from('messages').select('registration_id, status, scheduled_for, failure_reason').in('registration_id', regIds).eq('automation_type', 'welcome'),
    ]) : [{ data: [] }, { data: [] }]
    const recent = (recentRegs || []).map(r => ({
      ...r,
      stay: (rStays || []).find(s => s.registration_id === r.id) || null,
      welcome: (rMsgs || []).find(m => m.registration_id === r.id) || null,
    }))

    // plano
    let plan: { name: string; stay_limit: number; status: string; trial_ends_at: string | null } | null = null
    if (hotel?.organization_id) {
      const { data: sub } = await svc.from('subscriptions').select('status, trial_ends_at, plans(name, stay_limit)')
        .eq('organization_id', hotel.organization_id).order('created_at', { ascending: false }).limit(1).maybeSingle()
      const pl = (sub?.plans || null) as unknown as { name: string; stay_limit: number } | null
      if (sub && pl) plan = { name: pl.name, stay_limit: pl.stay_limit, status: sub.status, trial_ends_at: sub.trial_ends_at }
    }

    return NextResponse.json({
      period: { from, to, prevFrom },
      current, previous,
      ops: {
        awaitingWelcome,
        awaitingCheckin: pendingIds.length,
        hostedNow: hostedNow || 0,
        checkoutsToday: checkoutsToday || 0,
      },
      whatsapp: { connected: !!account, phone: account?.phone_number || null, name: account?.display_name || null },
      recent,
      usage: { staysThisMonth: monthStays || 0, plan },
      setup: {
        google: !!hotel?.google_review_url, instagram: !!hotel?.instagram_url, logo: !!hotel?.logo_url,
        info: !!(hotel?.wifi_info && hotel?.breakfast_time && hotel?.checkout_time && hotel?.reception_contact),
      },
    })
  } catch (e) {
    return errorResponse(e)
  }
}
