import { NextResponse } from 'next/server'
import { createServiceSupabase } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createServiceSupabase()

    const { data: existing } = await supabase.from('plans').select('id').limit(1)
    if (existing && existing.length > 0) {
      return NextResponse.json({ message: 'Plans already seeded', skipped: true })
    }

    const { error } = await supabase.from('plans').insert([
      {
        tier: 'essencial',
        name: 'Essencial',
        price_cents: 9700,
        stay_limit: 100,
        user_limit: 3,
        hotel_limit: 1,
        features: {
          whatsapp_checkin: true,
          satisfaction_survey: true,
          google_review_redirect: true,
          automation_flows: 1,
          support: 'email',
        },
      },
      {
        tier: 'profissional',
        name: 'Profissional',
        price_cents: 19700,
        stay_limit: 300,
        user_limit: 10,
        hotel_limit: 1,
        features: {
          whatsapp_checkin: true,
          satisfaction_survey: true,
          google_review_redirect: true,
          automation_flows: 5,
          custom_messages: true,
          analytics_dashboard: true,
          support: 'priority',
        },
      },
      {
        tier: 'premium',
        name: 'Premium',
        price_cents: 39700,
        stay_limit: -1,
        user_limit: -1,
        hotel_limit: 5,
        features: {
          whatsapp_checkin: true,
          satisfaction_survey: true,
          google_review_redirect: true,
          automation_flows: -1,
          custom_messages: true,
          analytics_dashboard: true,
          api_access: true,
          multi_hotel: true,
          support: 'dedicated',
        },
      },
    ])

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'Plans seeded successfully' })
  } catch (err) {
    console.error('Seed error:', err)
    return NextResponse.json({ error: 'Seed failed' }, { status: 500 })
  }
}
