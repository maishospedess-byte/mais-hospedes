import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabase } from '@/lib/supabase/server'
import { registrationSchema } from '@/lib/validators/registration'
import { randomUUID } from 'crypto'
import { scheduleMessage } from '@/lib/automations/engine'
import { WELCOME_DELAY_SECONDS } from '@/lib/automations/definitions'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const parsed = registrationSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]
      return NextResponse.json(
        { error: firstError.message, field: firstError.path[0] },
        { status: 400 }
      )
    }

    const data = parsed.data
    const supabase = createServiceSupabase()

    // 1. Find hotel by slug
    const { data: hotel, error: hotelError } = await supabase
      .from('hotels')
      .select('id, is_active')
      .eq('slug', data.hotel_slug)
      .single()

    if (hotelError || !hotel) {
      return NextResponse.json(
        { error: 'Hotel not found', code: 'HOTEL_NOT_FOUND' },
        { status: 404 }
      )
    }

    if (!hotel.is_active) {
      return NextResponse.json(
        { error: 'Hotel is not active', code: 'HOTEL_INACTIVE' },
        { status: 403 }
      )
    }

    const hotelId = hotel.id
    const whatsappNumber = data.whatsapp_number

    // 2. Find existing guest profile (by phone + hotel)
    const { data: existingProfile } = await supabase
      .from('guest_profiles')
      .select('id')
      .eq('hotel_id', hotelId)
      .eq('whatsapp_number', whatsappNumber)
      .maybeSingle()

    // 3. Duplicate check: same guest with a pending registration in the last 24h
    if (existingProfile) {
      const { data: dup } = await supabase
        .from('registrations')
        .select('id')
        .eq('hotel_id', hotelId)
        .eq('guest_id', existingProfile.id)
        .eq('status', 'registration_pending')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .limit(1)
      if (dup && dup.length > 0) {
        return NextResponse.json(
          { error: 'Duplicate registration', code: 'DUPLICATE' },
          { status: 409 }
        )
      }
    }

    let guestId: string

    if (existingProfile) {
      guestId = existingProfile.id
      // Update name/email/language
      await supabase
        .from('guest_profiles')
        .update({
          full_name: data.full_name,
          email: data.email || null,
          language: data.language,
        })
        .eq('id', guestId)
    } else {
      const { data: newProfile, error: profileError } = await supabase
        .from('guest_profiles')
        .insert({
          hotel_id: hotelId,
          full_name: data.full_name,
          whatsapp_number: whatsappNumber,
          email: data.email || null,
          language: data.language,
        })
        .select('id')
        .single()

      if (profileError || !newProfile) {
        console.error('Failed to create guest profile:', profileError)
        return NextResponse.json(
          { error: 'Failed to create guest profile' },
          { status: 500 }
        )
      }
      guestId = newProfile.id
    }

    // 4. Create registration
    const idempotencyKey = randomUUID()
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                      request.headers.get('x-real-ip') ||
                      'unknown'
    const userAgent = request.headers.get('user-agent') || null

    const { data: registration, error: regError } = await supabase
      .from('registrations')
      .insert({
        hotel_id: hotelId,
        guest_id: guestId,
        status: 'registration_pending',
        idempotency_key: idempotencyKey,
        checkin_date: data.checkin_date,
        checkout_date: data.checkout_date,
        guest_count: data.guest_count || null,
        ip_address: ipAddress,
        user_agent: userAgent,
      })
      .select('id')
      .single()

    if (regError || !registration) {
      console.error('Failed to create registration:', regError)
      return NextResponse.json(
        { error: 'Failed to create registration' },
        { status: 500 }
      )
    }

    // 5. Record consent
    const consentText = {
      'pt-BR': 'Aceito receber mensagens pelo WhatsApp sobre minha estadia',
      es: 'Acepto recibir mensajes por WhatsApp sobre mi estadía',
      en: 'I agree to receive WhatsApp messages about my stay',
    }

    await supabase.from('consent_records').insert({
      hotel_id: hotelId,
      guest_id: guestId,
      registration_id: registration.id,
      consent_type: 'whatsapp_messaging',
      consented: true,
      consent_text: consentText[data.language] || consentText['pt-BR'],
      ip_address: ipAddress,
      user_agent: userAgent,
    })

    // 6. Schedule welcome message (5 minutes). Sent by the server-side dispatcher,
    //    even with the reception browser closed. Idempotent per registration.
    try {
      await scheduleMessage({
      hotelId,
      guestId,
      registrationId: registration.id,
      type: 'welcome',
      language: data.language,
      scheduledFor: new Date(Date.now() + WELCOME_DELAY_SECONDS * 1000),
      idempotencyKey: `welcome-${registration.id}`,
      }, supabase)
    } catch (scheduleErr) {
      // O cadastro já foi gravado; a recepção pode enviar manualmente.
      console.error('Failed to schedule welcome message:', scheduleErr)
    }

    return NextResponse.json({
      success: true,
      registration_id: registration.id,
    })
  } catch (err) {
    console.error('Registration error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
