'use client'

import { createBrowserSupabase } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'
import { CreditCard } from 'lucide-react'

type Subscription = {
  id: string
  status: string
  plan: string | null
  trial_ends_at: string | null
  current_period_end: string | null
  created_at: string
  hotel_id: string
  hotels?: { name: string } | null
}

export default function AdminSubscriptionsPage() {
  const [subs, setSubs] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    async function load() {
      const supabase = createBrowserSupabase()
      const { data } = await supabase
        .from('subscriptions')
        .select('id, status, plan, trial_ends_at, current_period_end, created_at, hotel_id, hotels(name)')
        .order('created_at', { ascending: false })
      setSubs((data as unknown as Subscription[]) || [])
      setLoading(false)
    }
    load()
  }, [])

  const statusLabel = (status: string) => {
    switch (status) {
      case 'trial': return { text: 'Trial', bg: 'rgba(234,179,8,.12)', color: '#FACC15' }
      case 'active': return { text: 'Ativa', bg: 'rgba(34,197,94,.12)', color: '#22C55E' }
      case 'past_due': return { text: 'Vencida', bg: 'rgba(239,68,68,.12)', color: '#EF4444' }
      case 'canceled': return { text: 'Cancelada', bg: 'rgba(148,163,184,.12)', color: '#94A3B8' }
      default: return { text: status, bg: 'rgba(148,163,184,.12)', color: '#94A3B8' }
    }
  }

  const planLabel = (plan: string | null) => {
    switch (plan) {
      case 'essential': return 'Essencial · R$97'
      case 'professional': return 'Profissional · R$197'
      case 'premium': return 'Premium · R$347'
      default: return plan || 'N/A'
    }
  }

  const filtered = filter === 'all' ? subs : subs.filter(s => s.status === filter)

  const counts = {
    all: subs.length,
    trial: subs.filter(s => s.status === 'trial').length,
    active: subs.filter(s => s.status === 'active').length,
    past_due: subs.filter(s => s.status === 'past_due').length,
    canceled: subs.filter(s => s.status === 'canceled').length,
  }

  return (
    <div>
      <div className="px-6 py-5" style={{ borderBottom: '1px solid var(--glass-border)' }}>
        <h1 className="text-xl font-bold flex items-center gap-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          <CreditCard size={22} className="shrink-0" style={{ color: 'var(--bb)' }} />
          Assinaturas
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--fg3)' }}>
          {subs.length} assinatura(s) total
        </p>
      </div>

      <div className="px-6 pt-4">
        <div className="flex flex-wrap gap-2">
          {(['all', 'trial', 'active', 'past_due', 'canceled'] as const).map(key => {
            const labels: Record<string, string> = { all: 'Todas', trial: 'Trial', active: 'Ativas', past_due: 'Vencidas', canceled: 'Canceladas' }
            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: filter === key ? 'rgba(99,102,241,.15)' : 'rgba(255,255,255,.03)',
                  color: filter === key ? 'var(--bb)' : 'var(--fg3)',
                  border: '1px solid ' + (filter === key ? 'rgba(99,102,241,.3)' : 'var(--glass-border)'),
                }}
              >
                {labels[key]} ({counts[key]})
              </button>
            )
          })}
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 rounded-full animate-pulse" style={{ background: 'rgba(99,102,241,.3)' }} />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center py-10" style={{ color: 'var(--fg3)' }}>Nenhuma assinatura encontrada.</p>
        ) : (
          <div className="space-y-3">
            {filtered.map(sub => {
              const sl = statusLabel(sub.status)
              return (
                <div key={sub.id} className="glass-card p-5 hover:translate-y-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold">{sub.hotels?.name || 'Hotel removido'}</h3>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{
                          background: sl.bg,
                          color: sl.color,
                        }}>
                          {sl.text}
                        </span>
                      </div>
                      <p className="text-sm mt-1" style={{ color: 'var(--fg2)' }}>
                        {planLabel(sub.plan)}
                      </p>
                      {sub.trial_ends_at && sub.status === 'trial' && (
                        <p className="text-xs mt-1" style={{ color: 'var(--star)' }}>
                          Trial até {new Date(sub.trial_ends_at).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                      {sub.current_period_end && sub.status === 'active' && (
                        <p className="text-xs mt-1" style={{ color: 'var(--fg3)' }}>
                          Renova em {new Date(sub.current_period_end).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs" style={{ color: 'var(--fg3)' }}>
                        Criada {new Date(sub.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
