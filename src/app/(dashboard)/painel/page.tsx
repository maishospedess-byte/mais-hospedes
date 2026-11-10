'use client'

import { useEffect, useState, useRef } from 'react'
import { createBrowserSupabase } from '@/lib/supabase/client'
import { useHotel } from '@/hooks/useHotel'
import {
  LayoutDashboard, Users, Building2, CheckCircle, MessageSquare,
  QrCode, BellRing, Settings, Download, Copy, Link2, type LucideIcon
} from 'lucide-react'

export default function PainelPage() {
  const { hotel, loading: hotelLoading } = useHotel()
  const [userName, setUserName] = useState('')
  const [showQR, setShowQR] = useState(false)
  const qrRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)

  // Stats
  const [stats, setStats] = useState({ guests: 0, active: 0, completed: 0, messages: 0 })
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    async function loadUser() {
      const supabase = createBrowserSupabase()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('users').select('full_name').eq('id', user.id).single()
      if (data) setUserName(data.full_name || '')
    }
    loadUser()
  }, [])

  useEffect(() => {
    if (!hotel) return
    async function loadStats() {
      const supabase = createBrowserSupabase()
      const [guestsRes, staysRes, msgsRes] = await Promise.all([
        supabase.from('guest_profiles').select('id', { count: 'exact', head: true }).eq('hotel_id', hotel!.id),
        supabase.from('stays').select('id, status').eq('hotel_id', hotel!.id),
        supabase.from('messages').select('id', { count: 'exact', head: true }).eq('hotel_id', hotel!.id).eq('direction', 'outbound'),
      ])
      const stayData = staysRes.data || []
      setStats({
        guests: guestsRes.count || 0,
        active: stayData.filter(s => s.status === 'stay_active').length,
        completed: stayData.filter(s => s.status === 'stay_completed').length,
        messages: msgsRes.count || 0,
      })
      setLoadingStats(false)
    }
    loadStats()
  }, [hotel])

  if (hotelLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 rounded-full animate-pulse" style={{ background: 'rgba(99,102,241,.3)' }} />
      </div>
    )
  }

  if (!hotel) {
    return (
      <div className="flex items-center justify-center h-64">
        <p style={{ color: 'var(--fg3)' }}>Nenhum hotel encontrado.</p>
      </div>
    )
  }

  // Always use production URL for QR codes — they must work on external devices
  const PRODUCTION_URL = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '')
  const qrUrl = `${PRODUCTION_URL}/h/${hotel.slug}`

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrUrl)}`

  const statCards: { label: string; value: number; icon: LucideIcon; color: string }[] = [
    { label: 'Hospedes', value: stats.guests, icon: Users, color: 'var(--bb)' },
    { label: 'Hospedados', value: stats.active, icon: Building2, color: 'var(--green)' },
    { label: 'Checkout', value: stats.completed, icon: CheckCircle, color: 'var(--fg3)' },
    { label: 'Mensagens', value: stats.messages, icon: MessageSquare, color: '#25D366' },
  ]

  const quickLinks: { href: string; icon: LucideIcon; label: string; desc: string }[] = [
    { href: '/dashboard', icon: BellRing, label: 'Recepcao', desc: 'Registros em tempo real' },
    { href: '/guests', icon: Users, label: 'Hospedes', desc: 'Lista de hospedes' },
    { href: '/settings', icon: Settings, label: 'Configuracoes', desc: 'Horarios, Wi-Fi, links' },
  ]

  return (
    <div>
      {/* Page header */}
      <div className="px-6 py-5" style={{ borderBottom: '1px solid var(--glass-border)' }}>
        <div className="flex items-center gap-2">
          <LayoutDashboard size={22} className="shrink-0" style={{ color: 'var(--bb)' }} />
          <h1 className="text-xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Painel
          </h1>
        </div>
        <p className="text-sm mt-0.5" style={{ color: 'var(--fg3)' }}>
          {userName ? `Ola, ${userName.split(' ')[0]}! ` : ''}Visao geral de {hotel.name}
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {statCards.map(s => (
            <div key={s.label} className="glass-card p-5 text-center hover:translate-y-0">
              <div className="flex justify-center mb-2">
                <s.icon size={24} style={{ color: loadingStats ? 'var(--fg3)' : s.color }} />
              </div>
              <div className="text-2xl font-black" style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                color: loadingStats ? 'var(--fg3)' : s.color,
              }}>{loadingStats ? '...' : s.value}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--fg3)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* QR Code */}
        <section className="glass-card p-6 hover:translate-y-0">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <QrCode size={20} className="shrink-0" style={{ color: 'var(--bb)' }} />
                <h2 className="text-lg font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  QR Code do hotel
                </h2>
              </div>
              <p className="text-sm mt-1" style={{ color: 'var(--fg2)' }}>
                Imprima e coloque na recepcao. Hospedes escaneiam e se cadastram.
              </p>
            </div>
            <button
              onClick={() => setShowQR(!showQR)}
              className="btn-primary !py-[10px] !px-5 !text-sm !rounded-xl"
            >
              {showQR ? 'Ocultar' : 'Ver QR Code'}
            </button>
          </div>

          {showQR && (
            <div ref={qrRef} className="flex flex-col items-center py-6 space-y-4">
              <div className="p-4 rounded-xl" style={{
                background: '#fff',
                boxShadow: '0 0 40px rgba(99,102,241,.15)'
              }}>
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
                <p className="text-sm font-medium">{hotel.name}</p>
                <p className="text-xs font-mono mt-1" style={{ color: 'var(--fg3)' }}>{qrUrl}</p>
              </div>
              <div className="flex gap-3">
                <a
                  href={qrImageUrl}
                  download={`qrcode-${hotel.slug}.png`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-glass !py-[8px] !px-4 !text-sm !rounded-lg flex items-center gap-2"
                >
                  <Download size={14} className="shrink-0" />
                  Baixar PNG
                </a>
                <button
                  onClick={() => {
                    try {
                      navigator.clipboard.writeText(qrUrl)
                      setCopied(true)
                      setTimeout(() => setCopied(false), 2000)
                    } catch {}
                  }}
                  className="btn-glass !py-[8px] !px-4 !text-sm !rounded-lg flex items-center gap-2"
                >
                  <Copy size={14} className="shrink-0" />
                  {copied ? 'Copiado!' : 'Copiar link'}
                </button>
              </div>
            </div>
          )}

          <div className="mt-4 p-3 rounded-xl flex items-center gap-2" style={{
            background: 'rgba(99,102,241,.06)',
            border: '1px solid rgba(99,102,241,.1)'
          }}>
            <Link2 size={14} className="shrink-0" style={{ color: 'var(--bb)' }} />
            <p className="text-sm" style={{ color: 'var(--bb)' }}>
              <strong>Link do formulario:</strong>{' '}
              <a href={`/h/${hotel.slug}`} target="_blank" rel="noopener noreferrer" className="underline font-mono">
                /h/{hotel.slug}
              </a>
            </p>
          </div>
        </section>

        {/* Quick links */}
        <div className="grid sm:grid-cols-3 gap-3">
          {quickLinks.map(link => (
            <a key={link.href} href={link.href} className="glass-card p-4 hover:translate-y-0 group transition-all">
              <div className="flex items-center gap-3">
                <link.icon size={22} className="shrink-0" style={{ color: 'var(--bb)' }} />
                <div>
                  <p className="font-semibold text-sm group-hover:text-[var(--bb)] transition-colors">{link.label}</p>
                  <p className="text-xs" style={{ color: 'var(--fg3)' }}>{link.desc}</p>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
