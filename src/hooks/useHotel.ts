'use client'

import { useEffect, useState } from 'react'
import { createBrowserSupabase } from '@/lib/supabase/client'
import type { Hotel, UserRole } from '@/types/database'

type HotelWithRole = Hotel & { role: UserRole }

export function useHotel() {
  const [hotel, setHotel] = useState<HotelWithRole | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createBrowserSupabase()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      // Get first hotel membership
      const { data: membership } = await supabase
        .from('hotel_memberships')
        .select('hotel_id, role')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .single()

      if (!membership) {
        setLoading(false)
        return
      }

      const { data: hotelData } = await supabase
        .from('hotels')
        .select('*')
        .eq('id', membership.hotel_id)
        .single()

      if (hotelData) {
        setHotel({ ...hotelData, role: membership.role as UserRole })
      }
      setLoading(false)
    }

    load()
  }, [])

  return { hotel, loading }
}
