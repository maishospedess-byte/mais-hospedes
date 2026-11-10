'use client'

import { useHotel } from '@/hooks/useHotel'
import { useRealtimeRegistrations, type RegistrationWithGuest } from '@/hooks/useRealtimeRegistrations'
import { createBrowserSupabase } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'
import {
  BellRing, Bell, BellOff, Phone, CalendarDays, ClipboardList, Check
} from 'lucide-react'

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  })
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `${mins}min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

function RegistrationCard({
  reg,
  isNew,
  onConfirm,
  onBlock,
  onComplete,
  actionLoading,
  countdown,
}: {
  reg: RegistrationWithGuest
  isNew: boolean
  onConfirm: (reg: RegistrationWithGuest) => void
  onBlock: (reg: RegistrationWithGuest) => void
  onComplete: (reg: RegistrationWithGuest) => void
  actionLoading: string | null
  countdown?: number
}) {
  const isPending = reg.status === 'registration_pending'
  const isActive = reg.stay?.status === 'stay_active'
  const isCompleted = reg.stay?.status === 'stay_completed'
  const isBlocked = reg.status === 'registration_blocked'
  const isLoading = actionLoading === reg.id

  const statusConfig = isPending
    ? { bg: 'rgba(245,158,11,.15)', text: '#FBBF24', label: 'Aguardando' }
    : isActive
    ? { bg: 'rgba(37,211,102,.15)', text: '#25D366', label: 'Hospedado' }
    : isCompleted
    ? { bg: 'rgba(100,116,139,.15)', text: '#94A3B8', label: 'Checkout' }
    : isBlocked
    ? { bg: 'rgba(239,68,68,.15)', text: '#F87171', label: 'Bloqueado' }
    : { bg: 'rgba(100,116,139,.15)', text: '#94A3B8', label: reg.status }

  return (
    <div>
      {isPending && countdown != null && countdown > 0 && (
        <div className="flex items-center gap-2 mb-2 ml-1">
          <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(239,68,68,.15)' }}>
            <div className="h-full rounded-full transition-all" style={{
              width: `${(countdown / 50) * 100}%`,
              background: countdown < 10 ? '#EF4444' : '#FBBF24',
            }} />
          </div>
          <span className="text-xs font-mono font-bold" style={{
            color: countdown < 10 ? '#EF4444' : '#FBBF24',
          }}>
            {countdown}s
          </span>
          <span className="text-xs" style={{ color: 'var(--fg3)' }}>para mensagem automática</span>
        </div>
      )}
      <div
        className={`glass-card p-5 hover:translate-y-0 transition-all ${
          isNew ? 'ring-2 ring-red-500/50' : ''
        }`}
        style={isNew ? { borderColor: 'rgba(239,68,68,.4)' } : undefined}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold truncate">{reg.guest.full_name}</h3>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-medium" style={{
                background: statusConfig.bg,
                color: statusConfig.text,
              }}>
                {statusConfig.label}
              </span>
              {isNew && (
                <span className="text-xs px-2 py-0.5 rounded-full font-bold animate-pulse" style={{
                  background: 'rgba(239,68,68,.2)',
                  color: '#F87171',
                }}>
                  NOVO
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1.5 text-sm flex-wrap" style={{ color: 'var(--fg2)' }}>
              <span className="inline-flex items-center gap-1"><Phone size={13} className="shrink-0" /> {reg.guest.whatsapp_number}</span>
              <span className="inline-flex items-center gap-1"><CalendarDays size={13} className="shrink-0" /> {formatDate(reg.checkin_date)} → {formatDate(reg.checkout_date)}</span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs flex-wrap" style={{ color: 'var(--fg3)' }}>
              <span>Registrado {timeAgo(reg.created_at)}</span>
              {reg.guest_count && <span>{reg.guest_count} hóspede(s)</span>}
              {reg.guest.email && <span>{reg.guest.email}</span>}
              <span className="uppercase">{reg.guest.language}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isPending && (
              <>
                <button
                  onClick={() => onConfirm(reg)}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-semibold rounded-xl transition-all disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(135deg, #25D366, #128C7E)',
                    color: '#fff',
                    boxShadow: '0 2px 10px rgba(37,211,102,.3)',
                  }}
                >
                  {isLoading ? '...' : <span className="inline-flex items-center gap-1"><Check size={14} /> Confirmar</span>}
                </button>
                <button
                  onClick={() => onBlock(reg)}
                  disabled={isLoading}
                  className="px-3 py-2 text-sm font-medium rounded-xl transition-all disabled:opacity-50"
                  style={{
                    background: 'rgba(239,68,68,.1)',
                    color: '#F87171',
                    border: '1px solid rgba(239,68,68,.2)',
                  }}
                >
                  Bloquear
                </button>
              </>
            )}
            {isActive && (
              <button
                onClick={() => onComplete(reg)}
                disabled={isLoading}
                className="btn-primary !py-2 !px-4 !text-sm !rounded-xl disabled:opacity-50"
              >
                {isLoading ? '...' : 'Finalizar estadia'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { hotel, loading: hotelLoading } = useHotel()
  const {
    registrations,
    loading: regsLoading,
    newRegistrationId,
    soundEnabled,
    setSoundEnabled,
    audioRef,
  } = useRealtimeRegistrations(hotel?.id)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [countdown, setCountdown] = useState<Record<string, number>>({})

  // Countdown timer for pending registrations (50s welcome message timer)
  useEffect(() => {
    const pending = registrations.filter(r => r.status === 'registration_pending')
    const interval = setInterval(() => {
      const newCountdown: Record<string, number> = {}
      pending.forEach(reg => {
        const elapsed = (Date.now() - new Date(reg.created_at).getTime()) / 1000
        const remaining = Math.max(0, 50 - elapsed)
        if (remaining > 0) newCountdown[reg.id] = Math.ceil(remaining)
      })
      setCountdown(newCountdown)
    }, 1000)
    return () => clearInterval(interval)
  }, [registrations])

  async function confirmRegistration(reg: RegistrationWithGuest) {
    if (actionLoading) return
    setActionLoading(reg.id)

    const supabase = createBrowserSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    await supabase.from('stays').insert({
      hotel_id: reg.hotel_id,
      registration_id: reg.id,
      guest_id: reg.guest_id,
      status: 'stay_active',
      checkin_date: reg.checkin_date,
      checkout_date: reg.checkout_date,
      confirmed_by: user?.id || null,
      confirmed_at: new Date().toISOString(),
    })

    setActionLoading(null)
  }

  async function blockRegistration(reg: RegistrationWithGuest) {
    if (actionLoading) return
    setActionLoading(reg.id)

    const supabase = createBrowserSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    await supabase
      .from('registrations')
      .update({
        status: 'registration_blocked',
        blocked_by: user?.id || null,
        blocked_at: new Date().toISOString(),
        block_reason: 'Bloqueado pela recepção',
      })
      .eq('id', reg.id)

    // Cancel scheduled welcome message
    await supabase
      .from('messages')
      .update({ status: 'cancelled' })
      .eq('idempotency_key', `welcome-${reg.id}`)
      .eq('status', 'scheduled')

    setActionLoading(null)
  }

  async function completeStay(reg: RegistrationWithGuest) {
    if (actionLoading || !reg.stay) return
    setActionLoading(reg.id)

    const supabase = createBrowserSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    await supabase
      .from('stays')
      .update({
        status: 'stay_completed',
        completed_by: user?.id || null,
        completed_at: new Date().toISOString(),
      })
      .eq('id', reg.stay.id)

    // Schedule satisfaction survey
    await supabase.from('messages').insert({
      hotel_id: reg.hotel_id,
      guest_id: reg.guest_id,
      stay_id: reg.stay.id,
      direction: 'outbound',
      status: 'scheduled',
      automation_type: 'satisfaction_survey',
      language: reg.guest.language,
      scheduled_for: new Date().toISOString(),
      idempotency_key: `satisfaction-${reg.stay.id}`,
    })

    setActionLoading(null)
  }

  // Categorize registrations
  const pending = registrations.filter((r) => r.status === 'registration_pending')
  const active = registrations.filter((r) => r.stay?.status === 'stay_active')
  const completed = registrations.filter(
    (r) => r.stay?.status === 'stay_completed' || r.status === 'registration_blocked'
  )

  if (hotelLoading || regsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="w-10 h-10 rounded-full animate-pulse" style={{ background: 'rgba(99,102,241,.3)' }} />
      </div>
    )
  }

  if (!hotel) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="glass-card p-8 text-center max-w-sm">
          <p style={{ color: 'var(--fg2)' }}>Nenhum hotel associado à sua conta.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Notification sound */}
      <audio ref={audioRef} preload="auto">
        <source src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1hZ2lugYB8fHp9gIWMkI2JhX95cWliX2Fob3d/hYiJiYmHhYB5cWpiXF5ka3N7goiLjIuJhYB5cGhgW11ib3N8g4mMjYuIhH93bWRcWVxhbHR8goiMjYuIhH93bWRcW1tga3J7goeLjIuJhYB5cGhgXF1hanJ7goiLjIuIhH54bmZeWltfaHB5gIaKjIuIhH54bWVdWlpeZ295gIaKjIuIhH93bWReWlpdZm93f4WJi4uIhH53bWRcWVtdZm52foSIi4uIhH53bGNbWFpcZW12fYOHiouIhH53bGNbWFpcZG11fIKGiYqHg393a2JaV1lbZGx0e4GFiImHg353a2JaV1lbY2t0eoGFh4mGg353amFZVlhbYmt0eoGFh4iGg352amFZVlhaYmt0eoGFh4iFgn52amFZV1haYmt0eoGFh4iFgn51aWBYVlhbYmt0e4KGiIiFgn51aWBYV1hbYmt0e4KGiIiFgn51aWBYV1hbYmt0e4KGiIiFgn51aV9XV1hbYmt0e4KGiIiFgn5zaF5WVVdZYWl0e4KGiIiFgn5zaF5WVVdZYWl0e4KGh4iFgn5zaF5WVVdZYWl0eoGGh4iFgX5zaF5WVVdZYWl0eoGGh4eFgX5yaF5WVVdZYWl0eoGFh4eFgX5yaF5WVVdZYWl0eoGFhoeFgX5yaF5WVVdZYGl0eoGFhoeFgX5yaF5WVVdZYGl0eoGFhoeFgX5yaF5WVFdYYGhzeoGFhoeFgX5xaF5WVFdYYGhzeoGFhoaEgX5xZ15WVFdYYGhzeoGFhoaEgX5xZ11VVFdYYGhzeoCFhoaEgH5xZ11VU1ZXYGhyeoCEhYaEgH5xZ11VU1ZXYGhyeoCEhYaEgH5wZl1UU1ZXYGdyeoCEhYWEgH5wZl1UU1ZXX2dyeYCEhYWEgH5wZlxUU1VXX2dyeYCEhYWDgH5wZlxUU1VXX2dyeYCEhYWDgH5wZlxTU1VWX2dxeYCDhIWDf31wZVtTUlVWX2dxeYCDhIWDf31vZVtTUlVWX2dxeH+DhISDf31vZVtTUlRWXmdxeH+DhISDf31vZVtSUVRWXmdxeH+DhISDf31vZVpSUVRWXmdweH+ChISDf3xvZFpSUVRVXmZweH+ChIOCfnxuZFpRUFNVXmZwd3+ChIOCfnxuZFpRUFNVXmZwd3+ChIOCfnxuZFpRUFNVXmZwd3+ChIOCfnxuY1lRUFNVXmZwd3+ChIOCfnxuY1lRUFNVXmZwd3+BhIOCfnxuY1lRUFNVXWZwd36BhIOCfnxuY1lQT1JUXWVwd36BhIOBfnxuY1lQT1JUXWVwd36BhIKBfXttY1lQT1JUXWVvdn6BhIKBfXttYlhPTlFUXWVvdn6Bg4KBfXttYlhPTlFTXWVvdn6Bg4KBfXttYlhPTlFTXGRvdn6Bg4KBfXtrYlhPTlFTXGRudn2Bg4KBfHtrYVhOTVBTXGRudn2Bg4GAfHtrYVdOTVBSXGRudn2Ag4GAfHtrYVdOTVBSXGRudX2Ag4F/fHtrYVdOTVBSW2NudX2Ag4F/e3prYFdNTFBSW2NudX2Ag4F/e3pqYFdNTFBSW2NtdXyAgoF/e3pqYFZNTFBSW2NtdXyAgoF/e3pqYFZNTE9RW2NtdXyAgoB/e3pqYFZNTE9RW2JtdXyAgoB/e3pqYFZMTE9RWmJtdHyAgoB+e3lqX1ZMTE9RWmJsdHyAgoB+enpqX1ZMTE9RWmJsdHuAgn9+enppX1ZMS09RWmJsdHuAgn9+enpqX1ZMS09QWmFsdHuAgn99enpqX1ZMS09QWmFrdHuAgn99enpqX1ZMS09QWmFrdHuAgn99eXlpXlVLS05QWmFrdHuAgnx9eXlpXlVLS05QWmFrdHuAgnx8eHlpXlVLS05QWWBrdHt/gXx8eHlpXlVLS05PWWBrdHt/gXx8eHhoXlVLS05PWWBrdHt/gXx8eHhoXlVLS05PWWBqc3t/gXt8eHhoXlVLSk5PWWBqc3t/gXt8d3hoXlVLSk5PWWBqc3p/gXt7d3hoXlVLSk5PWWBqc3p/gXt7d3doXVRLSk5PWGBqc3p/gHt7d3doXVRLSk1OWGBqc3p/gHt7d3dnXVRKSk1OWGBqcnp+gHt7d3dnXVRKSk1OV2Bpcnp+gHp7d3dnXVRKSk1OV19pcnp+gHp6dnZnXFRKSU1OV19pcnl+gHp6dnZnXFNKSU1OV19pcnl+gHp6dnZnXFNJSU1OV19pcnl+f3p6dnZnXFNJSU1OV19pcnl+f3p6dnZmXFNJSU1NVl9ocnl+f3p5dnZmXFNJSU1NVl9ocnl+f3l5dXZmW1NJSE1NVl5ocXh9f3l5dXVmW1NJSE1NVl5ocXh9f3l5dXVmW1NJSE1NVl5ocXh9f3l5dXVmW1NJSE1NVl5ocXh9fnl5dXVmW1NJSE1NVl5ocXh9fnl5dXVmW1NJSE0=" type="audio/wav" />
      </audio>

      {/* Page header */}
      <div className="px-6 py-5 flex items-center justify-between" style={{
        borderBottom: '1px solid var(--glass-border)',
      }}>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            <BellRing size={22} className="shrink-0" style={{ color: 'var(--bb)' }} />
            Recepção
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--fg3)' }}>{hotel.name} · Registros em tempo real</p>
        </div>
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="text-sm px-3 py-1.5 rounded-lg transition-colors"
          style={{
            background: soundEnabled ? 'rgba(245,158,11,.1)' : 'rgba(100,116,139,.1)',
            color: soundEnabled ? 'var(--star)' : 'var(--fg3)',
          }}
          title={soundEnabled ? 'Silenciar notificações' : 'Ativar som'}
        >
          {soundEnabled ? <span className="inline-flex items-center gap-1.5"><Bell size={14} /> Som ativo</span> : <span className="inline-flex items-center gap-1.5"><BellOff size={14} /> Silenciado</span>}
        </button>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Aguardando', value: pending.length, color: 'var(--star)', pulse: pending.length > 0 },
            { label: 'Hospedados', value: active.length, color: 'var(--green)', pulse: false },
            { label: 'Finalizados', value: completed.length, color: 'var(--fg3)', pulse: false },
          ].map(s => (
            <div key={s.label} className="glass-card p-5 text-center hover:translate-y-0" style={
              s.pulse ? { animation: 'cardGlow 3s ease-in-out infinite' } : undefined
            }>
              <div className="text-3xl font-black" style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                color: s.color,
              }}>{s.value}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--fg3)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Pending */}
        {pending.length > 0 && (
          <section>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif"
            }}>
              <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: 'var(--star)' }} />
              Aguardando confirmação ({pending.length})
            </h2>
            <div className="space-y-3">
              {pending.map((reg) => (
                <RegistrationCard
                  key={reg.id}
                  reg={reg}
                  isNew={reg.id === newRegistrationId}
                  onConfirm={confirmRegistration}
                  onBlock={blockRegistration}
                  onComplete={completeStay}
                  actionLoading={actionLoading}
                  countdown={countdown[reg.id]}
                />
              ))}
            </div>
          </section>
        )}

        {/* Active stays */}
        {active.length > 0 && (
          <section>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif"
            }}>
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--green)' }} />
              Hospedados ({active.length})
            </h2>
            <div className="space-y-3">
              {active.map((reg) => (
                <RegistrationCard
                  key={reg.id}
                  reg={reg}
                  isNew={false}
                  onConfirm={confirmRegistration}
                  onBlock={blockRegistration}
                  onComplete={completeStay}
                  actionLoading={actionLoading}
                />
              ))}
            </div>
          </section>
        )}

        {/* Completed */}
        {completed.length > 0 && (
          <section>
            <h2 className="text-lg font-bold mb-4" style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              color: 'var(--fg2)'
            }}>
              Checkout / Bloqueado ({completed.length})
            </h2>
            <div className="space-y-3 opacity-60">
              {completed.map((reg) => (
                <RegistrationCard
                  key={reg.id}
                  reg={reg}
                  isNew={false}
                  onConfirm={confirmRegistration}
                  onBlock={blockRegistration}
                  onComplete={completeStay}
                  actionLoading={actionLoading}
                />
              ))}
            </div>
          </section>
        )}

        {registrations.length === 0 && (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{
              background: 'rgba(99,102,241,.06)'
            }}><ClipboardList size={36} style={{ color: 'var(--fg3)' }} /></div>
            <p className="font-medium text-lg" style={{ color: 'var(--fg2)' }}>Nenhum registro nos últimos 7 dias</p>
            <p className="text-sm mt-2" style={{ color: 'var(--fg3)' }}>
              Quando um hóspede escanear o QR Code, aparecerá aqui em tempo real.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
