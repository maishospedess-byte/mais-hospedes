import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabase } from '@/lib/supabase/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params

    if (!slug || slug.length > 100) {
      return NextResponse.json(
        { error: 'Invalid slug', code: 'INVALID_SLUG' },
        { status: 400 }
      )
    }

    // Validate env vars at runtime (common deploy issue)
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase env vars — NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set')
      return NextResponse.json(
        { error: 'Server configuration error', code: 'SERVER_ERROR' },
        { status: 500 }
      )
    }

    const supabase = createServiceSupabase()

    const { data: hotel, error } = await supabase
      .from('hotels')
      .select('*') // '*' mantém o formulário funcionando mesmo antes de novas colunas existirem
      .eq('slug', slug)
      .single()

    if (error || !hotel) {
      console.error('Hotel lookup DB error:', error?.message, 'slug:', slug)
      return NextResponse.json(
        { error: 'Hotel not found', code: 'HOTEL_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Cache for 60s on CDN, stale-while-revalidate for 5min
    const headers = {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    }

    return NextResponse.json(
      {
        id: hotel.id,
        name: hotel.name,
        slug: hotel.slug,
        is_active: hotel.is_active,
        instagram_url: hotel.instagram_url || null,
        whatsapp_number: hotel.whatsapp_number || null,
        logo_url: (hotel as { logo_url?: string | null }).logo_url || null,
        primary_language: hotel.primary_language || 'pt-BR',
      },
      { headers }
    )
  } catch (err) {
    console.error('Hotel lookup error:', err)
    return NextResponse.json(
      { error: 'Internal server error', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}
