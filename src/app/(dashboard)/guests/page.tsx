'use client'

import { useHotel } from '@/hooks/useHotel'
import { createBrowserSupabase } from '@/lib/supabase/client'
import { useState, useEffect, useCallback } from 'react'
import type { GuestProfile } from '@/types/database'
import { Users, Phone, Mail } from 'lucide-react'

export default function GuestsPage() {
  const { hotel, loading: hotelLoading } = useHotel()
  const [guests, setGuests] = useState<GuestProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const fetchGuests = useCallback(async () => {
    if (!hotel) return
    const supabase = createBrowserSupabase()
    let query = supabase
      .from('guest_profiles')
      .select('*')
      .eq('hotel_id', hotel.id)
      .order('created_at', { ascending: false })
      .limit(100)

    if (search.trim()) {
      query = query.or(`full_name.ilike.%${search}%,whatsapp_number.ilike.%${search}%,email.ilike.%${search}%`)
    }

    const { data } = await query
    setGuests(data || [])
    setLoading(false)
  }, [hotel, search])

  useEffect(() => {
    fetchGuests()
  }, [fetchGuests])

  if (hotelLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full animate-pulse" style={{ background: 'rgba(99,102,241,.3)' }} />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="px-6 py-5 flex items-center justify-between" style={{
        borderBottom: '1px solid var(--glass-border)',
      }}>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            <Users size={22} className="shrink-0" style={{ color: 'var(--bb)' }} />
            Hóspedes
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--fg3)' }}>{guests.length} hóspedes cadastrados</p>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* Search */}
        <input
          type="text"
          placeholder="Buscar por nome, telefone ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-dark w-full max-w-md"
        />

        {/* Guest list */}
        <div className="space-y-2">
          {guests.map(guest => (
            <div key={guest.id} className="glass-card p-4 hover:translate-y-0">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{guest.full_name}</h3>
                  <div className="flex items-center gap-3 mt-1 text-sm" style={{ color: 'var(--fg2)' }}>
                    <span className="inline-flex items-center gap-1"><Phone size={13} className="shrink-0" /> {guest.whatsapp_number}</span>
                    {guest.email && <span className="inline-flex items-center gap-1"><Mail size={13} className="shrink-0" /> {guest.email}</span>}
                    <span className="uppercase text-xs px-1.5 py-0.5 rounded" style={{
                      background: 'rgba(99,102,241,.1)',
                      color: 'var(--bl)',
                    }}>{guest.language}</span>
                  </div>
                </div>
                <div className="text-xs shrink-0" style={{ color: 'var(--fg3)' }}>
                  {new Date(guest.created_at).toLocaleDateString('pt-BR')}
                </div>
              </div>
            </div>
          ))}
        </div>

        {guests.length === 0 && (
          <div className="text-center py-12">
            <div className="mb-3"><Users size={36} style={{ color: 'var(--fg3)' }} /></div>
            <p style={{ color: 'var(--fg2)' }}>Nenhum hóspede encontrado</p>
          </div>
        )}
      </div>
    </div>
  )
}
