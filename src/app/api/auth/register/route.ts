import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabase } from '@/lib/supabase/server'

function generateSlug(hotelName: string): string {
  const base = hotelName
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  const suffix = Math.random().toString(36).substring(2, 8)
  return `${base}-${suffix}`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { full_name, hotel_name, email, password } = body

    if (!full_name || !hotel_name || !email || !password) {
      return NextResponse.json(
        { error: 'Todos os campos são obrigatórios' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'A senha deve ter pelo menos 6 caracteres' },
        { status: 400 }
      )
    }

    const supabase = createServiceSupabase()

    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // auto-confirm for now
      user_metadata: { full_name },
    })

    if (authError) {
      if (authError.message?.includes('already been registered')) {
        return NextResponse.json(
          { error: 'Este e-mail já está cadastrado. Faça login.' },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    const userId = authData.user.id

    // 2. Create user record
    const { error: userError } = await supabase.from('users').insert({
      id: userId,
      email,
      full_name,
    })

    if (userError) {
      console.error('User insert error:', userError)
    }

    // 3. Create organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: hotel_name,
        owner_user_id: userId,
      })
      .select('id')
      .single()

    if (orgError) {
      console.error('Org insert error:', orgError)
      return NextResponse.json({ error: 'Erro ao criar organização' }, { status: 500 })
    }

    // 4. Create hotel
    const slug = generateSlug(hotel_name)
    const { data: hotel, error: hotelError } = await supabase
      .from('hotels')
      .insert({
        organization_id: org.id,
        name: hotel_name,
        slug,
      })
      .select('id')
      .single()

    if (hotelError) {
      console.error('Hotel insert error:', hotelError)
      return NextResponse.json({ error: 'Erro ao criar hotel' }, { status: 500 })
    }

    // 5. Create membership (owner)
    await supabase.from('hotel_memberships').insert({
      user_id: userId,
      hotel_id: hotel.id,
      role: 'owner',
    })

    // 6. Get profissional plan and create trial subscription
    const { data: plan } = await supabase
      .from('plans')
      .select('id')
      .eq('tier', 'profissional')
      .single()

    if (plan) {
      const trialEnd = new Date()
      trialEnd.setDate(trialEnd.getDate() + 7)

      await supabase.from('subscriptions').insert({
        organization_id: org.id,
        plan_id: plan.id,
        status: 'trial',
        trial_ends_at: trialEnd.toISOString(),
        current_period_end: trialEnd.toISOString(),
      })
    }

    return NextResponse.json({
      success: true,
      user_id: userId,
      hotel_id: hotel.id,
      slug,
    })
  } catch (err) {
    console.error('Register error:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
