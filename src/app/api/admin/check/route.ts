import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ isAdmin: false })
    }

    const service = createServiceSupabase()
    const { data } = await service
      .from('users')
      .select('is_super_admin')
      .eq('id', user.id)
      .single()

    return NextResponse.json({ isAdmin: !!data?.is_super_admin })
  } catch {
    return NextResponse.json({ isAdmin: false })
  }
}
