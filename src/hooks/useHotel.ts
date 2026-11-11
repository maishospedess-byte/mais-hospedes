'use client'

import { createContext, createElement, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { createBrowserSupabase } from '@/lib/supabase/client'
import type { Hotel, UserRole } from '@/types/database'

export type HotelWithRole = Hotel & { role: UserRole }
type Ctx = { hotel: HotelWithRole | null; loading: boolean; reload: () => Promise<void> }

const HotelContext = createContext<Ctx | null>(null)

async function loadHotel(): Promise<HotelWithRole | null> {
  const supabase = createBrowserSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: membership } = await supabase
    .from('hotel_memberships')
    .select('hotel_id, role')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (!membership) return null
  const { data: hotelData } = await supabase.from('hotels').select('*').eq('id', membership.hotel_id).single()
  return hotelData ? { ...hotelData, role: membership.role as UserRole } : null
}

function useHotelState(): Ctx {
  const [hotel, setHotel] = useState<HotelWithRole | null>(null)
  const [loading, setLoading] = useState(true)
  const reload = useCallback(async () => {
    const h = await loadHotel()
    setHotel(h)
    setLoading(false)
  }, [])
  useEffect(() => { reload() }, [reload])
  return { hotel, loading, reload }
}

/** Provider usado pelo layout do painel: uma única consulta compartilhada entre as telas */
export function HotelProvider({ children }: { children: ReactNode }) {
  const value = useHotelState()
  return createElement(HotelContext.Provider, { value }, children)
}

export function useHotel(): Ctx {
  const ctx = useContext(HotelContext)
  const local = useHotelStateIfNeeded(!ctx)
  return ctx || local
}

// fallback para telas fora do provider
function useHotelStateIfNeeded(enabled: boolean): Ctx {
  const [hotel, setHotel] = useState<HotelWithRole | null>(null)
  const [loading, setLoading] = useState(enabled)
  const reload = useCallback(async () => {
    const h = await loadHotel()
    setHotel(h)
    setLoading(false)
  }, [])
  useEffect(() => { if (enabled) reload() }, [enabled, reload])
  return { hotel, loading, reload }
}

export const isManager = (role?: UserRole) => role === 'owner' || role === 'manager'
