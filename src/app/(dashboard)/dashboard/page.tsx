'use client'

import { useHotel } from '@/hooks/useHotel'
import { useRealtimeRegistrations, type RegistrationWithGuest } from '@/hooks/useRealtimeRegistrations'
import { createBrowserSupabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

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
}: {
  reg: RegistrationWithGuest
  isNew: boolean
  onConfirm: (reg: RegistrationWithGuest) => void
  onBlock: (reg: RegistrationWithGuest) => void
  onComplete: (reg: RegistrationWithGuest) => void
}) {
  const isPending = reg.status === 'registration_pending'
  const isActive = reg.stay?.status === 'stay_active'
  const isCompleted = reg.stay?.status === 'stay_completed'
  const isBlocked = reg.status === 'registration_blocked'

  const statusColor = isPending
    ? 'bg-amber-100 text-amber-700 border-amber-200'
    : isActive
    ? 'bg-green-100 text-green-700 border-green-200'
    : isCompleted
    ? 'bg-gray-100 text-gray-500 border-gray-200'
    : isBlocked
    ? 'bg-red-100 text-red-700 border-red-200'
    : 'bg-gray-100 text-gray-500 border-gray-200'

  const statusLabel = isPending
    ? 'Aguardando'
    : isActive
    ? 'Hospedado'
    : isCompleted
    ? 'Checkout'
    : isBlocked
    ? 'Bloqueado'
    : reg.status

  return (
    <div
      className={`rounded-xl border p-4 transition-all ${
        isNew
          ? 'border-red-400 bg-red-50 ring-2 ring-red-300 animate-pulse'
          : 'border-gray-200 bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 truncate">
              {reg.guest.full_name}
            </h3>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColor}`}>
              {statusLabel}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
            <span>📱 {reg.guest.whatsapp_number}</span>
            <span>🗓 {formatDate(reg.checkin_date)} → {formatDate(reg.checkout_date)}</span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
            <span>Registrado {timeAgo(reg.created_at)}</span>
            {reg.guest_count && <span>{reg.guest_count} hóspede(s)</span>}
            <span className="uppercase">{reg.guest.language}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isPending && (
            <>
              <button
                onClick={() => onConfirm(reg)}
                className="px-3 py-1.5 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 transition"
              >
                Confirmar
              </button>
              <button
                onClick={() => onBlock(reg)}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-red-300 text-red-600 hover:bg-red-50 transition"
              >
                Bloquear
              </button>
            </>
          )}
          {isActive && (
            <button
              onClick={() => onComplete(reg)}
              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition"
            >
              Finalizar estadia
            </button>
          )}
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
  const router = useRouter()
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Check auth
  useEffect(() => {
    const supabase = createBrowserSupabase()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push('/login')
    })
  }, [router])

  async function confirmRegistration(reg: RegistrationWithGuest) {
    if (actionLoading) return
    setActionLoading(reg.id)

    const supabase = createBrowserSupabase()

    // Create stay
    const { data: { user } } = await supabase.auth.getUser()

    const { error: stayError } = await supabase.from('stays').insert({
      hotel_id: reg.hotel_id,
      registration_id: reg.id,
      guest_id: reg.guest_id,
      status: 'stay_active',
      checkin_date: reg.checkin_date,
      checkout_date: reg.checkout_date,
      confirmed_by: user?.id || null,
      confirmed_at: new Date().toISOString(),
    })

    if (!stayError) {
      // No need to manually refresh — Realtime will pick it up
    }

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

    // Schedule satisfaction survey immediately
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

  async function handleLogout() {
    const supabase = createBrowserSupabase()
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Categorize registrations
  const pending = registrations.filter((r) => r.status === 'registration_pending')
  const active = registrations.filter((r) => r.stay?.status === 'stay_active')
  const completed = registrations.filter(
    (r) => r.stay?.status === 'stay_completed' || r.status === 'registration_blocked'
  )

  if (hotelLoading || regsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-200" />
          <div className="h-3 w-40 bg-indigo-100 rounded" />
        </div>
      </div>
    )
  }

  if (!hotel) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm text-center">
          <p className="text-gray-600">Nenhum hotel associado à sua conta.</p>
          <button
            onClick={handleLogout}
            className="mt-4 text-indigo-600 hover:underline text-sm"
          >
            Sair
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Notification sound */}
      <audio ref={audioRef} preload="auto">
        <source src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1hZ2lugYB8fHp9gIWMkI2JhX95cWliX2Fob3d/hYiJiYmHhYB5cWpiXF5ka3N7goiLjIuJhYB5cGhgW11ib3N8g4mMjYuIhH93bWRcWVxhbHR8goiMjYuIhH93bWRcW1tga3J7goeLjIuJhYB5cGhgXF1hanJ7goiLjIuIhH54bmZeWltfaHB5gIaKjIuIhH54bWVdWlpeZ295gIaKjIuIhH93bWReWlpdZm93f4WJi4uIhH53bWRcWVtdZm52foSIi4uIhH53bGNbWFpcZW12fYOHiouIhH53bGNbWFpcZG11fIKGiYqHg393a2JaV1lbZGx0e4GFiImHg353a2JaV1lbY2t0eoGFh4mGg353amFZVlhbYmt0eoGFh4iGg352amFZVlhaYmt0eoGFh4iFgn52amFZV1haYmt0eoGFh4iFgn51aWBYVlhbYmt0e4KGiIiFgn51aWBYV1hbYmt0e4KGiIiFgn51aWBYV1hbYmt0e4KGiIiFgn51aV9XV1hbYmt0e4KGiIiFgn5zaF5WVVdZYWl0e4KGiIiFgn5zaF5WVVdZYWl0e4KGh4iFgn5zaF5WVVdZYWl0eoGGh4iFgX5zaF5WVVdZYWl0eoGGh4eFgX5yaF5WVVdZYWl0eoGFh4eFgX5yaF5WVVdZYWl0eoGFhoeFgX5yaF5WVVdZYGl0eoGFhoeFgX5yaF5WVVdZYGl0eoGFhoeFgX5yaF5WVFdYYGhzeoGFhoeFgX5xaF5WVFdYYGhzeoGFhoaEgX5xZ15WVFdYYGhzeoGFhoaEgX5xZ11VVFdYYGhzeoCFhoaEgH5xZ11VU1ZXYGhyeoCEhYaEgH5xZ11VU1ZXYGhyeoCEhYaEgH5wZl1UU1ZXYGdyeoCEhYWEgH5wZl1UU1ZXX2dyeYCEhYWEgH5wZlxUU1VXX2dyeYCEhYWDgH5wZlxUU1VXX2dyeYCEhYWDgH5wZlxTU1VWX2dxeYCDhIWDf31wZVtTUlVWX2dxeYCDhIWDf31vZVtTUlVWX2dxeH+DhISDf31vZVtTUlRWXmdxeH+DhISDf31vZVtSUVRWXmdxeH+DhISDf31vZVpSUVRWXmdweH+ChISDf3xvZFpSUVRVXmZweH+ChIOCfnxuZFpRUFNVXmZwd3+ChIOCfnxuZFpRUFNVXmZwd3+ChIOCfnxuZFpRUFNVXmZwd3+ChIOCfnxuY1lRUFNVXmZwd3+ChIOCfnxuY1lRUFNVXmZwd3+BhIOCfnxuY1lRUFNVXWZwd36BhIOCfnxuY1lQT1JUXWVwd36BhIOBfnxuY1lQT1JUXWVwd36BhIKBfXttY1lQT1JUXWVvdn6BhIKBfXttYlhPTlFUXWVvdn6Bg4KBfXttYlhPTlFTXWVvdn6Bg4KBfXttYlhPTlFTXGRvdn6Bg4KBfXtrYlhPTlFTXGRudn2Bg4KBfHtrYVhOTVBTXGRudn2Bg4GAfHtrYVdOTVBSXGRudn2Ag4GAfHtrYVdOTVBSXGRudX2Ag4F/fHtrYVdOTVBSW2NudX2Ag4F/e3prYFdNTFBSW2NudX2Ag4F/e3pqYFdNTFBSW2NtdXyAgoF/e3pqYFZNTFBSW2NtdXyAgoF/e3pqYFZNTE9RW2NtdXyAgoB/e3pqYFZNTE9RW2JtdXyAgoB/e3pqYFZMTE9RWmJtdHyAgoB+e3lqX1ZMTE9RWmJsdHyAgoB+enpqX1ZMTE9RWmJsdHuAgn9+enppX1ZMS09RWmJsdHuAgn9+enpqX1ZMS09QWmFsdHuAgn99enpqX1ZMS09QWmFrdHuAgn99enpqX1ZMS09QWmFrdHuAgn99eXlpXlVLS05QWmFrdHuAgnx9eXlpXlVLS05QWmFrdHuAgnx8eHlpXlVLS05QWWBrdHt/gXx8eHlpXlVLS05PWWBrdHt/gXx8eHhoXlVLS05PWWBrdHt/gXx8eHhoXlVLS05PWWBqc3t/gXt8eHhoXlVLSk5PWWBqc3t/gXt8d3hoXlVLSk5PWWBqc3p/gXt7d3hoXlVLSk5PWWBqc3p/gXt7d3doXVRLSk5PWGBqc3p/gHt7d3doXVRLSk1OWGBqc3p/gHt7d3dnXVRKSk1OWGBqcnp+gHt7d3dnXVRKSk1OV2Bpcnp+gHp7d3dnXVRKSk1OV19pcnp+gHp6dnZnXFRKSU1OV19pcnl+gHp6dnZnXFNKSU1OV19pcnl+gHp6dnZnXFNJSU1OV19pcnl+f3p6dnZnXFNJSU1OV19pcnl+f3p6dnZmXFNJSU1NVl9ocnl+f3p5dnZmXFNJSU1NVl9ocnl+f3l5dXZmW1NJSE1NVl5ocXh9f3l5dXVmW1NJSE1NVl5ocXh9f3l5dXVmW1NJSE1NVl5ocXh9f3l5dXVmW1NJSE1NVl5ocXh9fnl5dXVmW1NJSE1NVl5ocXh9fnl5dXVmW1NJSE0=" type="audio/wav" />
      </audio>

      {/* Header */}
      <header className="bg-[#0F1729] text-white px-4 sm:px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-indigo-400">Mais Hóspedes</h1>
            <p className="text-sm text-gray-400">{hotel.name}</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="text-sm text-gray-400 hover:text-white transition"
              title={soundEnabled ? 'Silenciar notificações' : 'Ativar som'}
            >
              {soundEnabled ? '🔔' : '🔕'}
            </button>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-400 hover:text-white transition"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-3xl font-bold text-amber-600">{pending.length}</p>
            <p className="text-sm text-gray-500">Aguardando</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-3xl font-bold text-green-600">{active.length}</p>
            <p className="text-sm text-gray-500">Hospedados</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-3xl font-bold text-gray-400">{completed.length}</p>
            <p className="text-sm text-gray-500">Checkout / Bloqueado</p>
          </div>
        </div>

        {/* Pending */}
        {pending.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
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
                />
              ))}
            </div>
          </section>
        )}

        {/* Active stays */}
        {active.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
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
                />
              ))}
            </div>
          </section>
        )}

        {/* Completed */}
        {completed.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
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
                />
              ))}
            </div>
          </section>
        )}

        {registrations.length === 0 && (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-gray-500">Nenhum registro nos últimos 7 dias.</p>
            <p className="text-gray-400 text-sm mt-1">
              Quando um hóspede escanear o QR Code, aparecerá aqui em tempo real.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
