import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabase } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Link de avaliação Google enviado na mensagem de checkout.
 * Registra o clique (não prova que a avaliação foi publicada) e redireciona ao Google.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.redirect('https://www.google.com', 302)
  const svc = createServiceSupabase()
  const { data: stay } = await svc.from('stays').select('id, hotel_id, guest_id').eq('id', id).maybeSingle()
  if (!stay) return NextResponse.redirect('https://www.google.com', 302)
  const { data: hotel } = await svc.from('hotels').select('google_review_url').eq('id', stay.hotel_id).single()
  await svc.from('review_link_clicks').insert({ hotel_id: stay.hotel_id, stay_id: stay.id, guest_id: stay.guest_id })
  const target = hotel?.google_review_url && /^https?:\/\//.test(hotel.google_review_url) ? hotel.google_review_url : 'https://www.google.com'
  return NextResponse.redirect(target, 302)
}
