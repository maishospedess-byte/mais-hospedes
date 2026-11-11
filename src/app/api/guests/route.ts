import { NextRequest, NextResponse } from 'next/server'
import { getMember, errorResponse } from '@/lib/auth/member'
import { listGuests } from '@/lib/guests'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { hotelId } = await getMember()
    const p = req.nextUrl.searchParams
    const rows = await listGuests(hotelId, {
      q: p.get('q'), from: p.get('from'), to: p.get('to'), status: p.get('status'), sort: p.get('sort'),
    })
    return NextResponse.json({ rows })
  } catch (e) {
    return errorResponse(e)
  }
}
