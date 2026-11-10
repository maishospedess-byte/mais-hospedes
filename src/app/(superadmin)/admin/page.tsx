'use client'

import { createBrowserSupabase } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Building, Building2, CheckCircle, Users, User,
  BedDouble, MessageSquare, Clock, CreditCard, type LucideIcon
} from 'lucide-react'

type AdminStats = {
  totalOrgs: number
  totalHotels: number
  activeHotels: number
  totalUsers: number
  totalGuests: number
  totalStays: number
  totalMessages: number
  trialSubs: number
  activeSubs: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadStats() {
      const supabase = createBrowserSupabase()

      const [orgs, hotels, users, guests, stays, messages, subs] = await Promise.all([
        supabase.from('organizations').select('id', { count: 'exact', head: true }),
        supabase.from('hotels').select('id, is_active'),
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase.from('guest_profiles').select('id', { count: 'exact', head: true }),
        supabase.from('stays').select('id', { count: 'exact', head: true }),
        supabase.from('messages').select('id', { count: 'exact', head: true }),
        supabase.from('subscriptions').select('id, status'),
      ])

      const hotelData = hotels.data || []
      const subData = subs.data || []

      setStats({
        totalOrgs: orgs.count || 0,
        totalHotels: hotelData.length,
        activeHotels: hotelData.filter(h => h.is_active).length,
        totalUsers: users.count || 0,
        totalGuests: guests.count || 0,
        totalStays: stays.count || 0,
        totalMessages: messages.count || 0,
        trialSubs: subData.filter(s => s.status === 'trial').length,
        activeSubs: subData.filter(s => s.status === 'active').length,
      })
      setLoading(false)
    }
    loadStats()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full animate-pulse" style={{ background: 'rgba(99,102,241,.3)' }} />
      </div>
    )
  }

  const cards: { label: string; value: number; Icon: LucideIcon; color: string }[] = stats ? [
    { label: 'Organizações', value: stats.totalOrgs, Icon: Building, color: 'var(--bb)' },
    { label: 'Hotéis', value: stats.totalHotels, Icon: Building2, color: '#6366F1' },
    { label: 'Hotéis Ativos', value: stats.activeHotels, Icon: CheckCircle, color: 'var(--green)' },
    { label: 'Usuários', value: stats.totalUsers, Icon: Users, color: '#3B82F6' },
    { label: 'Hóspedes', value: stats.totalGuests, Icon: User, color: '#8B5CF6' },
    { label: 'Estadias', value: stats.totalStays, Icon: BedDouble, color: '#10B981' },
    { label: 'Mensagens', value: stats.totalMessages, Icon: MessageSquare, color: '#25D366' },
    { label: 'Assinaturas Trial', value: stats.trialSubs, Icon: Clock, color: 'var(--star)' },
    { label: 'Assinaturas Ativas', value: stats.activeSubs, Icon: CreditCard, color: 'var(--green)' },
  ] : []

  return (
    <div>
      <div className="px-6 py-5" style={{ borderBottom: '1px solid var(--glass-border)' }}>
        <h1 className="text-xl font-bold flex items-center gap-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          <LayoutDashboard size={22} className="shrink-0" style={{ color: 'var(--bb)' }} />
          Admin Dashboard
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--fg3)' }}>
          Visão geral da plataforma Mais Hóspedes
        </p>
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
      </div>
    </div>
  )
}
