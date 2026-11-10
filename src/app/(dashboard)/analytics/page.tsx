'use client'

import { useHotel } from '@/hooks/useHotel'
import { createBrowserSupabase } from '@/lib/supabase/client'
import { useState, useEffect, useCallback } from 'react'
import {
  TrendingUp, Users, Building2, CheckCircle, MessageSquare, XCircle, Star, type LucideIcon
} from 'lucide-react'

type Stats = {
  totalGuests: number
  totalStays: number
  activeStays: number
  completedStays: number
  totalMessages: number
  sentMessages: number
  failedMessages: number
  avgSatisfaction: number
  satisfactionCount: number
}

export default function AnalyticsPage() {
  const { hotel, loading: hotelLoading } = useHotel()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    if (!hotel) return
    const supabase = createBrowserSupabase()

    const [guests, stays, messages, satisfaction] = await Promise.all([
      supabase.from('guest_profiles').select('id', { count: 'exact', head: true }).eq('hotel_id', hotel.id),
      supabase.from('stays').select('id, status').eq('hotel_id', hotel.id),
      supabase.from('messages').select('id, status').eq('hotel_id', hotel.id).eq('direction', 'outbound'),
      supabase.from('satisfaction_responses').select('score').eq('hotel_id', hotel.id),
    ])

    const stayData = stays.data || []
    const msgData = messages.data || []
    const satData = satisfaction.data || []
    const avgScore = satData.length > 0 ? satData.reduce((a, s) => a + s.score, 0) / satData.length : 0

    setStats({
      totalGuests: guests.count || 0,
      totalStays: stayData.length,
      activeStays: stayData.filter(s => s.status === 'stay_active').length,
      completedStays: stayData.filter(s => s.status === 'stay_completed').length,
      totalMessages: msgData.length,
      sentMessages: msgData.filter(m => ['sent', 'delivered', 'read'].includes(m.status)).length,
      failedMessages: msgData.filter(m => m.status === 'failed').length,
      avgSatisfaction: Math.round(avgScore * 10) / 10,
      satisfactionCount: satData.length,
    })
    setLoading(false)
  }, [hotel])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  if (hotelLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full animate-pulse" style={{ background: 'rgba(99,102,241,.3)' }} />
      </div>
    )
  }

  const cards: { label: string; value: number | string; Icon: LucideIcon; color: string }[] = stats ? [
    { label: 'Total Hospedes', value: stats.totalGuests, Icon: Users, color: 'var(--bb)' },
    { label: 'Estadias Ativas', value: stats.activeStays, Icon: Building2, color: 'var(--green)' },
    { label: 'Estadias Concluidas', value: stats.completedStays, Icon: CheckCircle, color: '#10B981' },
    { label: 'Mensagens Enviadas', value: stats.sentMessages, Icon: MessageSquare, color: '#25D366' },
    { label: 'Mensagens Falharam', value: stats.failedMessages, Icon: XCircle, color: '#EF4444' },
    { label: 'Nota Media', value: stats.avgSatisfaction > 0 ? `${stats.avgSatisfaction}/5` : 'N/A', Icon: Star, color: 'var(--star)' },
  ] : []

  return (
    <div>
      <div className="px-6 py-5" style={{ borderBottom: '1px solid var(--glass-border)' }}>
        <h1 className="text-xl font-bold flex items-center gap-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          <TrendingUp size={22} className="shrink-0" style={{ color: 'var(--bb)' }} />
          Relatorios
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--fg3)' }}>Metricas gerais do hotel</p>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map(card => (
            <div key={card.label} className="glass-card p-5 hover:translate-y-0">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--fg3)' }}>{card.label}</p>
                  <p className="text-3xl font-black mt-2" style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    color: card.color,
                  }}>{card.value}</p>
                </div>
                <card.Icon size={24} style={{ color: card.color }} />
              </div>
            </div>
          ))}
        </div>

        {stats && stats.satisfactionCount > 0 && (
          <div className="glass-card p-5 mt-6 hover:translate-y-0">
            <h3 className="font-semibold mb-2">Satisfacao</h3>
            <p className="text-sm" style={{ color: 'var(--fg2)' }}>
              {stats.satisfactionCount} resposta(s) recebida(s) · Nota media: <strong style={{ color: 'var(--star)' }}>{stats.avgSatisfaction}/5</strong>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
