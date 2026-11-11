'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  LayoutDashboard, UserPlus, LogIn, LogOut, MessageSquare, Star, MousePointerClick, ClipboardCheck,
  Hourglass, BedDouble, Send, AlertTriangle, CheckCircle2, Circle, QrCode, Gauge, MessageCircle, ArrowRight,
} from 'lucide-react'
import { useHotel, isManager } from '@/hooks/useHotel'
import { usePeriod } from '@/hooks/usePeriod'
import { useHotelRealtime } from '@/hooks/useHotelRealtime'
import { PageHeader, StatCard, Delta, Badge, PageLoading, EmptyState, Section } from '@/components/ui/kit'
import { PeriodFilter } from '@/components/ui/PeriodFilter'
import { QrCodeCard } from '@/components/QrCodeCard'
import { STAY_STATUS, MSG_STATUS, stayKey, fmtDate, fmtPhone, fmtTime } from '@/lib/ui/status'

type Metrics = {
  registrations: number; checkins: number; checkouts: number; blocked: number; reviewClicks: number
  messages: { sent: number; delivered: number; read: number; failed: number; scheduled: number }
  surveysSent: number; surveysAnswered: number; avgSatisfaction: number | null; promoters: number; detractors: number
}
type Summary = {
  current: Metrics; previous: Metrics
  ops: { awaitingWelcome: number; awaitingCheckin: number; hostedNow: number; checkoutsToday: number }
  whatsapp: { connected: boolean; phone: string | null; name: string | null }
  recent: { id: string; status: string; created_at: string; checkin_date: string; checkout_date: string; guest_profiles: { full_name: string; whatsapp_number: string } | null; stay: { status: string } | null; welcome: { status: string } | null }[]
  usage: { staysThisMonth: number; plan: { name: string; stay_limit: number; status: string; trial_ends_at: string | null } | null }
  setup: { google: boolean; instagram: boolean; logo: boolean; info: boolean }
}

export default function PainelPage() {
  const { hotel, loading: hotelLoading } = useHotel()
  const { period, setPeriod, range } = usePeriod()
  const [data, setData] = useState<Summary | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const month = new Date(today); month.setDate(1)
    const qs = new URLSearchParams({ from: range.from, to: range.to, today: today.toISOString(), month: month.toISOString() })
    try {
      const res = await fetch(`/api/dashboard?${qs}`, { cache: 'no-store' })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Erro ao carregar')
      setData(body); setError(null)
    } catch (e) { setError(e instanceof Error ? e.message : 'Erro') }
  }, [range.from, range.to])

  useEffect(() => { load() }, [load])
  useEffect(() => { const id = setInterval(load, 45000); return () => clearInterval(id) }, [load])
  useHotelRealtime(hotel?.id, () => load())

  if (hotelLoading || (!data && !error)) return <PageLoading />
  if (!hotel) return <EmptyState icon={LayoutDashboard} title="Nenhum hotel encontrado." />
  if (!data) return <div className="p-6 text-sm" style={{ color: 'var(--danger)' }}>Erro ao carregar o painel: {error}</div>

  const c = data.current, p = data.previous
  const manager = isManager(hotel.role)
  const setupItems = [
    { ok: data.whatsapp.connected, label: 'Conectar o WhatsApp oficial', href: '/automations' },
    { ok: data.setup.info, label: 'Preencher informações úteis (Wi-Fi, café, check-out, recepção)', href: '/settings#info' },
    { ok: data.setup.google, label: 'Cadastrar o link de avaliação do Google', href: '/settings#links' },
    { ok: data.setup.logo, label: 'Enviar a logomarca do hotel', href: '/settings#brand' },
    { ok: data.setup.instagram, label: 'Informar o Instagram do hotel', href: '/settings#links' },
  ]
  const pendingSetup = setupItems.filter(i => !i.ok)

  return (
    <div className="theme-scope">
      <PageHeader icon={LayoutDashboard} title="Painel" subtitle={`Central de operação · ${hotel.name}`}
        actions={<PeriodFilter value={period} onChange={setPeriod} />} />

      <div className="px-4 sm:px-6 py-5 space-y-5 max-w-[1400px]">
        {/* WhatsApp status */}
        {data.whatsapp.connected ? (
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <Badge tone="success" dot>WhatsApp conectado</Badge>
            <span style={{ color: 'var(--fg3)' }}>{data.whatsapp.name || ''} {data.whatsapp.phone ? `· ${data.whatsapp.phone}` : ''}</span>
          </div>
        ) : (
          <div className="ui-card-flat p-4 flex flex-wrap items-center gap-3" style={{ borderColor: 'var(--danger)', background: 'var(--danger-bg)' }}>
            <AlertTriangle size={18} style={{ color: 'var(--danger)' }} />
            <div className="flex-1 min-w-[220px] text-sm"><b>WhatsApp não conectado.</b> Cadastros funcionam normalmente, mas nenhuma mensagem é enviada aos hóspedes até a conexão oficial com a Meta.</div>
            <Link href="/automations" className="ui-btn ui-btn-primary ui-btn-sm">Conectar agora</Link>
          </div>
        )}

        {/* Operação agora */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--fg3)' }}>Agora na recepção</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon={Hourglass} label="Aguardando 1ª mensagem" value={data.ops.awaitingWelcome} tone="warn" href="/dashboard" hint="Boas-vindas programada" />
            <StatCard icon={ClipboardCheck} label="Aguardando check-in" value={data.ops.awaitingCheckin} tone="warn" href="/dashboard" hint="Cadastros a confirmar" />
            <StatCard icon={BedDouble} label="Hospedados agora" value={data.ops.hostedNow} tone="success" href="/dashboard" hint="Check-in confirmado" />
            <StatCard icon={LogOut} label="Checkouts hoje" value={data.ops.checkoutsToday} tone="neutral" href="/dashboard" hint="Estadias finalizadas" />
          </div>
        </div>

        {/* Indicadores do período */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--fg3)' }}>Resultados · {range.label}</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon={UserPlus} label="Cadastros pelo QR" value={c.registrations} href="/guests" delta={<Delta current={c.registrations} previous={p.registrations} />} />
            <StatCard icon={LogIn} label="Check-ins confirmados" value={c.checkins} tone="success" href="/guests?status=active" delta={<Delta current={c.checkins} previous={p.checkins} />} />
            <StatCard icon={LogOut} label="Checkouts finalizados" value={c.checkouts} tone="neutral" href="/guests?status=completed" delta={<Delta current={c.checkouts} previous={p.checkouts} />} />
            <StatCard icon={Send} label="Mensagens enviadas" value={c.messages.sent} tone="info" href="/automations?tab=history"
              hint={<>{c.messages.delivered} entregues · {c.messages.read} lidas · <span style={{ color: c.messages.failed ? 'var(--danger)' : undefined }}>{c.messages.failed} falhas</span></>} />
            <StatCard icon={MessageSquare} label="Pesquisas respondidas" value={c.surveysAnswered} tone="accent" href="/analytics"
              hint={c.surveysSent ? `${Math.round((c.surveysAnswered / c.surveysSent) * 100)}% de ${c.surveysSent} enviadas` : 'Nenhuma pesquisa enviada no período'} />
            <StatCard icon={Star} label="Satisfação média" value={c.avgSatisfaction !== null ? `${c.avgSatisfaction.toFixed(1)}/10` : '—'} tone="warn" href="/analytics"
              hint={c.surveysAnswered ? `${c.promoters} notas 9–10 · ${c.detractors} notas 0–6` : 'Sem respostas no período'} />
            <StatCard icon={MousePointerClick} label="Cliques no link do Google" value={c.reviewClicks} tone="success" href="/analytics"
              hint="Clique não confirma avaliação publicada" delta={<Delta current={c.reviewClicks} previous={p.reviewClicks} />} />
            <StatCard icon={AlertTriangle} label="Falhas de envio" value={c.messages.failed} tone={c.messages.failed ? 'danger' : 'neutral'} href="/automations?tab=history&status=failed"
              hint={c.messages.failed ? 'Veja o motivo no histórico' : 'Nenhuma falha no período'} />
          </div>
        </div>

        <div className="grid xl:grid-cols-[1fr_380px] gap-5 items-start">
          <Section title="Cadastros recentes" icon={UserPlus} description="Atualiza automaticamente quando um hóspede envia o formulário"
            actions={<Link href="/dashboard" className="ui-btn ui-btn-secondary ui-btn-sm">Abrir recepção <ArrowRight size={13} /></Link>}>
            {data.recent.length === 0 ? (
              <EmptyState icon={UserPlus} title="Nenhum cadastro neste período" text="Os cadastros feitos pelo QR Code aparecem aqui em tempo real." />
            ) : (
              <div className="overflow-x-auto -mx-4 sm:-mx-5">
                <table className="ui-table min-w-[640px]">
                  <thead><tr><th>Hóspede</th><th>Telefone</th><th>Data</th><th>Hora</th><th>Estadia</th><th>Boas-vindas</th></tr></thead>
                  <tbody>
                    {data.recent.map(r => {
                      const sk = stayKey(r.status, r.stay?.status)
                      const ms = MSG_STATUS[r.welcome?.status || 'none']
                      return (
                        <tr key={r.id} className="ui-row-click" onClick={() => { window.location.href = `/guests?q=${encodeURIComponent(r.guest_profiles?.full_name || '')}` }}>
                          <td className="font-medium">{r.guest_profiles?.full_name || '-'}</td>
                          <td style={{ color: 'var(--fg2)' }}>{fmtPhone(r.guest_profiles?.whatsapp_number)}</td>
                          <td style={{ color: 'var(--fg2)' }}>{fmtDate(r.created_at)}</td>
                          <td style={{ color: 'var(--fg2)' }}>{fmtTime(r.created_at)}</td>
                          <td><Badge tone={STAY_STATUS[sk].tone}>{STAY_STATUS[sk].label}</Badge></td>
                          <td>{sk === 'blocked' ? <span style={{ color: 'var(--fg3)' }}>—</span> : <Badge tone={ms.tone}>{ms.label}</Badge>}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          <div className="space-y-5">
            {manager && pendingSetup.length > 0 && (
              <Section title="Ativação do hotel" icon={CheckCircle2} description={`${setupItems.length - pendingSetup.length} de ${setupItems.length} etapas concluídas`}>
                <ul className="space-y-2">
                  {setupItems.map(i => (
                    <li key={i.label}>
                      <Link href={i.href} className="flex items-start gap-2 text-[13px] hover:underline" style={{ color: i.ok ? 'var(--fg3)' : 'var(--fg)' }}>
                        {i.ok ? <CheckCircle2 size={16} style={{ color: 'var(--success)' }} className="shrink-0" /> : <Circle size={16} style={{ color: 'var(--fg3)' }} className="shrink-0" />}
                        <span className={i.ok ? 'line-through' : ''}>{i.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Section>
            )}
            <Section title="QR Code do hotel" icon={QrCode}>
              <QrCodeCard slug={hotel.slug} hotelName={hotel.name} size={120} compact />
            </Section>
            {data.usage.plan && (
              <Section title="Uso do plano" icon={Gauge} description={`Plano ${data.usage.plan.name}${data.usage.plan.status === 'trial' ? ' · período de teste' : ''}`}>
                <div className="text-sm mb-2"><b>{data.usage.staysThisMonth}</b> de {data.usage.plan.stay_limit} estadias neste mês</div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, (data.usage.staysThisMonth / data.usage.plan.stay_limit) * 100)}%`, background: 'var(--accent-strong)' }} />
                </div>
                {data.usage.plan.trial_ends_at && data.usage.plan.status === 'trial' && (
                  <p className="ui-help">Teste grátis até {fmtDate(data.usage.plan.trial_ends_at)}.</p>
                )}
              </Section>
            )}
            {!data.whatsapp.connected && (
              <Section title="Mensagens" icon={MessageCircle}>
                <p className="text-sm" style={{ color: 'var(--fg2)' }}>{c.messages.scheduled} mensagem(ns) aguardando envio e {c.messages.failed} com falha por falta de conexão.</p>
              </Section>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
