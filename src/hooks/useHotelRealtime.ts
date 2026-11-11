'use client'

import { useEffect, useRef } from 'react'
import { createBrowserSupabase } from '@/lib/supabase/client'

/**
 * Escuta mudanças em tempo real (cadastros, estadias, mensagens) do hotel e chama onChange
 * com debounce. Também reconecta e ressincroniza quando a aba volta a ficar visível.
 */
export function useHotelRealtime(
  hotelId: string | undefined,
  onChange: (evt: { table: string; type: string; record: Record<string, unknown> }) => void,
  tables: string[] = ['registrations', 'stays', 'messages']
) {
  const cb = useRef(onChange)
  cb.current = onChange
  useEffect(() => {
    if (!hotelId) return
    const supabase = createBrowserSupabase()
    let timer: ReturnType<typeof setTimeout> | null = null
    let last: { table: string; type: string; record: Record<string, unknown> } | null = null
    const fire = () => { if (last) cb.current(last); last = null }
    let channel = supabase.channel(`hotel-${hotelId}-${Math.random().toString(36).slice(2)}`)
    for (const table of tables) {
      channel = channel.on('postgres_changes', { event: '*', schema: 'public', table, filter: `hotel_id=eq.${hotelId}` }, (payload) => {
        const evt = { table, type: payload.eventType, record: (payload.new || payload.old || {}) as Record<string, unknown> }
        // INSERT de cadastro dispara imediatamente (alerta); demais com debounce
        if (table === 'registrations' && payload.eventType === 'INSERT') { cb.current(evt); return }
        last = evt
        if (timer) clearTimeout(timer)
        timer = setTimeout(fire, 400)
      })
    }
    channel.subscribe()
    const onVisible = () => { if (document.visibilityState === 'visible') cb.current({ table: '*', type: 'resync', record: {} }) }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onVisible)
    return () => {
      if (timer) clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onVisible)
      supabase.removeChannel(channel)
    }
  }, [hotelId, tables.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps
}
