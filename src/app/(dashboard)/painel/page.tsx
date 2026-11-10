'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabase } from '@/lib/supabase/client'
import { useHotel } from '@/hooks/useHotel'

type Registration = {
  id: string
  guest_name: string
  guest_email: string | null
  guest_phone: string | null
  status: string
  check_in_date: string | null
  created_at: string
}

export default function PainelPage() {
  const { hotel, loading: hotelLoading } = useHotel()
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [loadingRegs, setLoadingRegs] = useState(true)
  const [userName, setUserName] = useState('')
  const [showQR, setShowQR] = useState(false)
  const qrRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Load user name
  useEffect(() => {
    async function loadUser() {
      const supabase = createBrowserSupabase()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      const { data } = await supabase.from('users').select('full_name').eq('id', user.id).single()
      if (data) setUserName(data.full_name || '')
    }
    loadUser()
  }, [router])

  // Load registrations
  useEffect(() => {
    if (!hotel) return
    async function loadRegs() {
      const supabase = createBrowserSupabase()
      const { data } = await supabase
        .from('registrations')
        .select('id, guest_name, guest_email, guest_phone, status, check_in_date, created_at')
        .eq('hotel_id', hotel!.id)
        .order('created_at', { ascending: false })
        .limit(20)
      setRegistrations(data || [])
      setLoadingRegs(false)
    }
    loadRegs()
  }, [hotel])

  async function handleLogout() {
    const supabase = createBrowserSupabase()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  if (hotelLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse w-10 h-10 rounded-full bg-indigo-500/30" />
      </div>
    )
  }

  if (!hotel) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Nenhum hotel encontrado. Faça login novamente.</p>
      </div>
    )
  }

  const qrUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/h/${hotel.slug}`
    : `/h/${hotel.slug}`

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrUrl)}`

  const statusLabel: Record<string, string> = {
    pending: 'Aguardando',
    confirmed: 'Confirmado',
    checked_in: 'Hospedado',
    checked_out: 'Checkout',
    blocked: 'Bloqueado',
  }

  const statusColor: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-blue-100 text-blue-700',
    checked_in: 'bg-green-100 text-green-700',
    checked_out: 'bg-gray-100 text-gray-600',
    blocked: 'bg-red-100 text-red-700',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-indigo-600">Mais Hóspedes</h1>
            <p className="text-sm text-gray-500">{hotel.name}</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 hidden sm:block">Olá, {userName.split(' ')[0]}</span>
            <a
              href="/dashboard"
              className="text-sm text-indigo-600 hover:text-indigo-700 transition font-medium"
            >
              Admin
            </a>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-gray-700 transition"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* QR Code section */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">QR Code do seu hotel</h2>
              <p className="text-sm text-gray-500 mt-1">
                Imprima e coloque na recepção. Hóspedes escaneiam e se cadastram.
              </p>
            </div>
            <button
              onClick={() => setShowQR(!showQR)}
              className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition"
            >
              {showQR ? 'Ocultar' : 'Ver QR Code'}
            </button>
          </div>

          {showQR && (
            <div ref={qrRef} className="flex flex-col items-center py-6 space-y-4">
              <div className="bg-white p-4 rounded-xl border-2 border-indigo-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrImageUrl}
                  alt="QR Code do hotel"
                  width={250}
                  height={250}
                  className="rounded"
                />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">{hotel.name}</p>
                <p className="text-xs text-gray-400 mt-1 font-mono">{qrUrl}</p>
              </div>
              <div className="flex gap-3">
                <a
                  href={qrImageUrl}
                  download={`qrcode-${hotel.slug}.png`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition text-gray-700"
                >
                  Baixar PNG
                </a>
                <button
                  onClick={() => {
                    try { navigator.clipboard.writeText(qrUrl) } catch {}
                  }}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition text-gray-700"
                >
                  Copiar link
                </button>
              </div>
            </div>
          )}

          <div className="mt-4 p-3 bg-indigo-50 rounded-xl">
            <p className="text-sm text-indigo-700">
              <strong>Link do formulário:</strong>{' '}
              <a href={`/h/${hotel.slug}`} target="_blank" rel="noopener noreferrer" className="underline font-mono">
                /h/{hotel.slug}
              </a>
            </p>
          </div>
        </section>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: registrations.length, color: 'text-gray-900' },
            { label: 'Aguardando', value: registrations.filter(r => r.status === 'pending').length, color: 'text-yellow-600' },
            { label: 'Hospedados', value: registrations.filter(r => r.status === 'checked_in').length, color: 'text-green-600' },
            { label: 'Checkout', value: registrations.filter(r => r.status === 'checked_out').length, color: 'text-gray-500' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Registrations */}
        <section className="bg-white rounded-2xl border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Últimos registros</h2>
          </div>
          {loadingRegs ? (
            <div className="p-8 text-center text-gray-400">Carregando...</div>
          ) : registrations.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-4xl mb-3">📋</div>
              <p className="text-gray-500 font-medium">Nenhum registro ainda</p>
              <p className="text-sm text-gray-400 mt-1">
                Quando um hóspede escanear o QR Code, aparecerá aqui.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {registrations.map((reg) => (
                <div key={reg.id} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{reg.guest_name}</p>
                    <p className="text-sm text-gray-500">
                      {reg.guest_phone || reg.guest_email || 'Sem contato'}
                      {reg.check_in_date && ` · Check-in: ${new Date(reg.check_in_date).toLocaleDateString('pt-BR')}`}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor[reg.status] || 'bg-gray-100 text-gray-600'}`}>
                    {statusLabel[reg.status] || reg.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
