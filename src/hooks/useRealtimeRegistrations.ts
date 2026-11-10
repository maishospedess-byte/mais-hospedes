'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createBrowserSupabase } from '@/lib/supabase/client'
import type { Registration, GuestProfile, Stay } from '@/types/database'

export type RegistrationWithGuest = Registration & {
  guest: GuestProfile
  stay: Stay | null
}

export function useRealtimeRegistrations(hotelId: string | undefined) {
  const [registrations, setRegistrations] = useState<RegistrationWithGuest[]>([])
  const [loading, setLoading] = useState(true)
  const [newRegistrationId, setNewRegistrationId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(true)

  const fetchRegistrations = useCallback(async () => {
    if (!hotelId) return

    const supabase = createBrowserSupabase()

    // Fetch recent registrations (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const { data: regs } = await supabase
      .from('registrations')
      .select('*')
      .eq('hotel_id', hotelId)
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: false })

    if (!regs) {
      setLoading(false)
      return
    }

    // Fetch guest profiles
    const guestIds = Array.from(new Set(regs.map((r: { guest_id: string }) => r.guest_id)))
    const { data: guests } = await supabase
      .from('guest_profiles')
      .select('*')
      .in('id', guestIds)

    // Fetch stays
    const regIds = regs.map((r) => r.id)
    const { data: stays } = await supabase
      .from('stays')
      .select('*')
      .in('registration_id', regIds)

    const guestMap = new Map((guests || []).map((g) => [g.id, g]))
    const stayMap = new Map((stays || []).map((s) => [s.registration_id, s]))

    const combined: RegistrationWithGuest[] = regs
      .map((reg) => ({
        ...reg,
        guest: guestMap.get(reg.guest_id)!,
        stay: stayMap.get(reg.id) || null,
      }))
      .filter((r) => r.guest)

    setRegistrations(combined)
    setLoading(false)
  }, [hotelId])

  // Initial load
  useEffect(() => {
    fetchRegistrations()
  }, [fetchRegistrations])

  // Realtime subscription
  useEffect(() => {
    if (!hotelId) return

    const supabase = createBrowserSupabase()

    const channel = supabase
      .channel('registrations-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'registrations',
          filter: `hotel_id=eq.${hotelId}`,
        },
        async (payload) => {
          // Fetch the complete registration with guest
          const newReg = payload.new as Registration

          const { data: guest } = await supabase
            .from('guest_profiles')
            .select('*')
            .eq('id', newReg.guest_id)
            .single()

          if (guest) {
            const combined: RegistrationWithGuest = {
              ...newReg,
              guest,
              stay: null,
            }

            setRegistrations((prev) => [combined, ...prev])
            setNewRegistrationId(newReg.id)

            // Play sound
            if (soundEnabled && audioRef.current) {
              audioRef.current.play().catch(() => {})
            }

            // Clear highlight after 10 seconds
            setTimeout(() => setNewRegistrationId(null), 10000)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'registrations',
          filter: `hotel_id=eq.${hotelId}`,
        },
        () => {
          // Refetch on updates (status changes)
          fetchRegistrations()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stays',
        },
        () => {
          fetchRegistrations()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [hotelId, soundEnabled, fetchRegistrations])

  return {
    registrations,
    loading,
    newRegistrationId,
    soundEnabled,
    setSoundEnabled,
    audioRef,
    refetch: fetchRegistrations,
  }
}
