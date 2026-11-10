'use client'

import { useHotel } from '@/hooks/useHotel'
import { createBrowserSupabase } from '@/lib/supabase/client'
import { useState, useEffect, useCallback } from 'react'
import {
  Zap, HandMetal, Info, Star, Sparkles, MessageSquare, type LucideIcon
} from 'lucide-react'

type MessageRow = {
  id: string
  automation_type: string | null
  status: string
  language: string
  scheduled_for: string | null
  sent_at: string | null
  created_at: string
  guest_profiles: { full_name: string } | null
}

const TYPE_LABELS: Record<string, { label: string; Icon: LucideIcon; color: string }> = {
  welcome: { label: 'Boas-vindas', Icon: HandMetal, color: '#25D366' },
  checkin_info: { label: 'Info Check-in', Icon: Info, color: '#6366F1' },
  satisfaction_survey: { label: 'Pesquisa Satisfação', Icon: Star, color: '#FBBF24' },
  review_request: { label: 'Avaliação Google', Icon: Sparkles, color: '#F59E0B' },
}

const DEFAULT_TYPE = { label: 'Manual', Icon: MessageSquare, color: '#94A3B8' }

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  scheduled: { label: 'Agendada', color: '#FBBF24' },
  queued: { label: 'Na fila', color: '#6366F1' },
  sent: { label: 'Enviada', color: '#25D366' },
  delivered: { label: 'Entregue', color: '#10B981' },
  read: { label: 'Lida', color: '#3B82F6' },
  failed: { label: 'Falhou', color: '#EF4444' },
  cancelled: { label: 'Cancelada', color: '#6B7280' },
}

export default function AutomationsPage() {
  const { hotel, loading: hotelLoading } = useHotel()
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [loading, setLoading] = useState(true)

  const fetchMessages = useCallback(async () => {
    if (!hotel) return
    const supabase = createBrowserSupabase()
    const { data } = await supabase
      .from('messages')
      .select('id, automation_type, status, language, scheduled_for, sent_at, created_at, guest_profiles(full_name)')
      .eq('hotel_id', hotel.id)
      .eq('direction', 'outbound')
      .order('created_at', { ascending: false })
      .limit(100)

    setMessages((data as unknown as MessageRow[]) || [])
    setLoading(false)
  }, [hotel])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  if (hotelLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full animate-pulse" style={{ background: 'rgba(99,102,241,.3)' }} />
      </div>
    )
  }

  const flows: { Icon: LucideIcon; name: string; desc: string; active: boolean; color: string }[] = [
    { Icon: HandMetal, name: 'Boas-vindas', desc: '50s apos registro · Mensagem automatica de boas-vindas', active: true, color: '#25D366' },
    { Icon: Info, name: 'Info Check-in', desc: 'Apos confirmacao · Wi-Fi, cafe da manha, horarios', active: true, color: '#6366F1' },
    { Icon: Star, name: 'Pesquisa Satisfacao', desc: 'Apos checkout · Nota de 1 a 5', active: true, color: '#FBBF24' },
    { Icon: Sparkles, name: 'Convite Avaliacao', desc: 'Se nota >= 4 · Link para Google Reviews', active: true, color: '#F59E0B' },
  ]

  return (
    <div>
      <div className="px-6 py-5" style={{ borderBottom: '1px solid var(--glass-border)' }}>
        <h1 className="text-xl font-bold flex items-center gap-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          <Zap size={22} className="shrink-0" style={{ color: 'var(--bb)' }} />
          Automacoes
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--fg3)' }}>Fluxo de mensagens automaticas via WhatsApp</p>
      </div>

      <div className="p-6 space-y-6">
        <div className="grid sm:grid-cols-2 gap-3">
          {flows.map(flow => (
            <div key={flow.name} className="glass-card p-4 hover:translate-y-0">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{
                  background: `${flow.color}15`,
                }}>
                  <flow.Icon size={20} style={{ color: flow.color }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm">{flow.name}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{
                      background: flow.active ? 'rgba(37,211,102,.15)' : 'rgba(100,116,139,.15)',
                      color: flow.active ? '#25D366' : '#94A3B8',
                    }}>{flow.active ? 'Ativo' : 'Inativo'}</span>
                  </div>
                  <p className="text-xs mt-1" style={{ color: 'var(--fg3)' }}>{flow.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div>
          <h2 className="text-lg font-bold mb-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Historico de mensagens
          </h2>
          <div className="space-y-2">
            {messages.map(msg => {
              const typeConfig = TYPE_LABELS[msg.automation_type || ''] || DEFAULT_TYPE
              const statusConfig = STATUS_LABELS[msg.status] || { label: msg.status, color: '#94A3B8' }
              return (
                <div key={msg.id} className="glass-card p-3 hover:translate-y-0">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <typeConfig.Icon size={18} style={{ color: typeConfig.color }} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{msg.guest_profiles?.full_name || 'Hospede'}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded-full" style={{
                            background: `${typeConfig.color}20`,
                            color: typeConfig.color,
                          }}>{typeConfig.label}</span>
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--fg3)' }}>
                          {msg.sent_at
                            ? `Enviada ${new Date(msg.sent_at).toLocaleString('pt-BR')}`
                            : msg.scheduled_for
                            ? `Agendada ${new Date(msg.scheduled_for).toLocaleString('pt-BR')}`
                            : new Date(msg.created_at).toLocaleString('pt-BR')
                          }
                        </p>
                      </div>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0" style={{
                      background: `${statusConfig.color}20`,
                      color: statusConfig.color,
                    }}>{statusConfig.label}</span>
                  </div>
                </div>
              )
            })}
          </div>

          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="mb-3"><Zap size={36} style={{ color: 'var(--fg3)' }} /></div>
              <p style={{ color: 'var(--fg2)' }}>Nenhuma mensagem automatica ainda</p>
              <p className="text-sm mt-1" style={{ color: 'var(--fg3)' }}>As mensagens aparecerão aqui quando hospedes se registrarem.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
