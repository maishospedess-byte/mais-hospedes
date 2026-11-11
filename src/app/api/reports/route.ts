import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabase } from '@/lib/supabase/server'
import { getMember, errorResponse, HttpError, MANAGERS } from '@/lib/auth/member'

export const dynamic = 'force-dynamic'

/** Séries diárias do período (dados reais do banco), agrupadas no fuso do navegador */
export async function GET(req: NextRequest) {
  try {
    const { hotelId } = await getMember(MANAGERS)
    const p = req.nextUrl.searchParams
    const from = p.get('from'), to = p.get('to')
    const tz = Number(p.get('tz') || '0') // minutos (Date.getTimezoneOffset)
    if (!from || !to || isNaN(Date.parse(from)) || isNaN(Date.parse(to))) throw new HttpError(400, 'Período inválido')
    if (Date.parse(to) - Date.parse(from) > 400 * 86400_000) throw new HttpError(400, 'Período máximo: 400 dias')
    const svc = createServiceSupabase()

    const fetchCol = async (table: string, col: string, extra = '') => {
      let q = svc.from(table).select(`${col}${extra ? ',' + extra : ''}`).eq('hotel_id', hotelId).gte(col, from).lt(col, to).limit(20000)
      if (table === 'stays') q = q.neq('status', 'cancelled')
      if (table === 'messages') q = q.eq('direction', 'outbound').neq('automation_type', 'test')
      const { data } = await q
      return (data || []) as unknown as Record<string, unknown>[]
    }
    const [regs, checkins, checkouts, msgs, sat, clicks] = await Promise.all([
      fetchCol('registrations', 'created_at'),
      fetchCol('stays', 'confirmed_at'),
      fetchCol('stays', 'completed_at'),
      fetchCol('messages', 'created_at', 'status'),
      fetchCol('satisfaction_responses', 'responded_at', 'score'),
      fetchCol('review_link_clicks', 'clicked_at'),
    ])

    const dayKey = (iso: unknown) => new Date(Date.parse(String(iso)) - tz * 60000).toISOString().slice(0, 10)
    const days: string[] = []
    for (let t = Date.parse(from); t < Date.parse(to); t += 86400_000) days.push(dayKey(new Date(t).toISOString()))
    const uniqDays = Array.from(new Set(days))
    const series = uniqDays.map(d => {
      const s = sat.filter(x => dayKey(x.responded_at) === d).map(x => Number(x.score))
      return {
        day: d,
        registrations: regs.filter(x => dayKey(x.created_at) === d).length,
        checkins: checkins.filter(x => dayKey(x.confirmed_at) === d).length,
        checkouts: checkouts.filter(x => dayKey(x.completed_at) === d).length,
        messagesSent: msgs.filter(x => dayKey(x.created_at) === d && ['sent', 'delivered', 'read'].includes(String(x.status))).length,
        messagesFailed: msgs.filter(x => dayKey(x.created_at) === d && x.status === 'failed').length,
        responses: s.length,
        avgScore: s.length ? Math.round((s.reduce((a, b) => a + b, 0) / s.length) * 10) / 10 : null,
        reviewClicks: clicks.filter(x => dayKey(x.clicked_at) === d).length,
      }
    })
    const distribution = Array.from({ length: 11 }, (_, i) => ({ score: i, count: sat.filter(x => Number(x.score) === i).length }))
    return NextResponse.json({ series, distribution, totals: {
      registrations: regs.length, checkins: checkins.length, checkouts: checkouts.length,
      messagesSent: msgs.filter(x => ['sent', 'delivered', 'read'].includes(String(x.status))).length,
      messagesFailed: msgs.filter(x => x.status === 'failed').length,
      responses: sat.length, reviewClicks: clicks.length,
    } })
  } catch (e) {
    return errorResponse(e)
  }
}
