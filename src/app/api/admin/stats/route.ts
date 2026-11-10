import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // 1. Verify the requesting user is authenticated and is super_admin
    const supabase = await createServerSupabase()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // 2. Check super_admin status using service role (bypasses RLS)
    const service = createServiceSupabase()
    const { data: userData } = await service
      .from('users')
      .select('is_super_admin')
      .eq('id', user.id)
      .single()

    if (!userData?.is_super_admin) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // 3. Fetch all stats using service role (bypasses RLS)
    const [orgs, hotels, users, guests, stays, messages, subs] = await Promise.all([
      service.from('organizations').select('id', { count: 'exact', head: true }),
      service.from('hotels').select('id, is_active'),
      service.from('users').select('id', { count: 'exact', head: true }),
      service.from('guest_profiles').select('id', { count: 'exact', head: true }),
      service.from('stays').select('id', { count: 'exact', head: true }),
      service.from('messages').select('id', { count: 'exact', head: true }),
      service.from('subscriptions').select('id, status'),
    ])

    const hotelData = hotels.data || []
    const subData = subs.data || []

    return NextResponse.json({
      totalOrgs: orgs.count || 0,
      totalHotels: hotelData.length,
      activeHotels: hotelData.filter((h: { is_active: boolean }) => h.is_active).length,
      totalUsers: users.count || 0,
      totalGuests: guests.count || 0,
      totalStays: stays.count || 0,
      totalMessages: messages.count || 0,
      trialSubs: subData.filter((s: { status: string }) => s.status === 'trial').length,
      activeSubs: subData.filter((s: { status: string }) => s.status === 'active').length,
    })
  } catch (err) {
    console.error('Admin stats error:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
