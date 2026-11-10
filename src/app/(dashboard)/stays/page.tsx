'use client'

import { useHotel } from '@/hooks/useHotel'
import { createBrowserSupabase } from '@/lib/supabase/client'
import { useState, useEffect, useCallback } from 'react'
import { Building2, Phone, CalendarDays } from 'lucide-react'

type StayWithGuest = {
  id: string
  status: string
  checkin_date: string
  checkout_date: string
  confirmed_at: string | null
  completed_at: string | null
  created_at: string
  guest_profiles: { full_name: string; whatsapp_number: string } | null
}

export default function StaysPage() {
  const { hotel, loading: hotelLoading } = useHotel()
  const [stays, setStays] = useState<StayWithGuest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'stay_active' | 'stay_completed'>('all')

  const fetchStays = useCallback(async () => {
    if (!hotel) return
    const supabase = createBrowserSupabase()
    let query = supabase
      .from('stays')
      .select('*, guest_profiles(full_name, whatsapp_number)')
      .eq('hotel_id', hotel.id)
      .order('created_at', { ascending: false })
      .limit(100)

    if (filter !== 'all') {
      query = query.eq('status', filter)
    }

    const { data } = await query
    setStays((data as unknown as StayWithGuest[]) || [])
    setLoading(false)
  }, [hotel, filter])

  useEffect(() => {
    fetchStays()
  }, [fetchStays])

  if (hotelLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full animate-pulse" style={{ background: 'rgba(99,102,241,.3)' }} />
      </div>
    )
  }

  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    stay_active: { bg: 'rgba(37,211,102,.15)', text: '#25D366', label: 'Ativa' },
    stay_completed: { bg: 'rgba(100,116,139,.15)', text: '#94A3B8', label: 'Concluída' },
    cancelled: { bg: 'rgba(239,68,68,.15)', text: '#F87171', label: 'Cancelada' },
  }

  return (
    <div>
      <div className="px-6 py-5 flex items-center justify-between" style={{
        borderBottom: '1px solid var(--glass-border)',
      }}>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            <Building2 size={22} className="shrink-0" style={{ color: 'var(--bb)' }} />
            Estadias
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--fg3)' }}>{stays.length} estadias</p>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* Filters */}
        <div className="flex gap-2">
          {([['all', 'Todas'], ['stay_active', 'Ativas'], ['stay_completed', 'Concluídas']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className="px-4 py-2 text-sm font-medium rounded-xl transition-all"
              style={{
                background: filter === key ? 'rgba(99,102,241,.15)' : 'rgba(255,255,255,.03)',
                color: filter === key ? 'var(--bb)' : 'var(--fg3)',
                border: `1px solid ${filter === key ? 'rgba(99,102,241,.3)' : 'var(--glass-border)'}`,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Stay list */}
        <div className="space-y-2">
          {stays.map(stay => {
            const sc = statusConfig[stay.status] || statusConfig.cancelled
            return (
              <div key={stay.id} className="glass-card p-4 hover:translate-y-0">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{stay.guest_profiles?.full_name || 'Hóspede'}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{
                        background: sc.bg,
                        color: sc.text,
                      }}>{sc.label}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm" style={{ color: 'var(--fg2)' }}>
                      <span className="inline-flex items-center gap-1"><Phone size={13} className="shrink-0" /> {stay.guest_profiles?.whatsapp_number}</span>
                      <span className="inline-flex items-center gap-1"><CalendarDays size={13} className="shrink-0" /> {new Date(stay.checkin_date + 'T00:00:00').toLocaleDateString('pt-BR')} → {new Date(stay.checkout_date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                  <div className="text-xs shrink-0" style={{ color: 'var(--fg3)' }}>
                    {stay.confirmed_at && `Check-in: ${new Date(stay.confirmed_at).toLocaleDateString('pt-BR')}`}
                    {stay.completed_at && ` · Check-out: ${new Date(stay.completed_at).toLocaleDateString('pt-BR')}`}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {stays.length === 0 && (
          <div className="text-center py-12">
            <div className="mb-3"><Building2 size={36} style={{ color: 'var(--fg3)' }} /></div>
            <p style={{ color: 'var(--fg2)' }}>Nenhuma estadia encontrada</p>
          </div>
        )}
      </div>
    </div>
  )
}
