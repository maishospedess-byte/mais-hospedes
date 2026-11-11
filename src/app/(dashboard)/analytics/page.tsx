'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { BarChart3, Download, Star, MousePointerClick, TrendingUp, Info, UserPlus, LogIn, LogOut, Send, MessageSquare } from 'lucide-react'
import { useHotel, isManager } from '@/hooks/useHotel'
import { usePeriod } from '@/hooks/usePeriod'
import { PageHeader, Section, StatCard, Delta, PageLoading, EmptyState } from '@/components/ui/kit'
import { PeriodFilter } from '@/components/ui/PeriodFilter'

type Day = { day: string; registrations: number; checkins: number; checkouts: number; messagesSent: number; messagesFailed: number; responses: number; avgScore: number | null; reviewClicks: number }
type Report = { series: Day[]; distribution: { score: number; count: number }[]; totals: Record<string, number> }
type Cmp = { current: Record<string, unknown> & { avgSatisfaction: number | null; surveysAnswered: number; surveysSent: number }; previous: Record<string, unknown> & { avgSatisfaction: number | null } }

const SERIES = [
  { key: 'registrations', label: 'Cadastros', color: 'var(--chart-1)' },
  { key: 'checkins', label: 'Check-ins', color: 'var(--chart-2)' },
  { key: 'checkouts', label: 'Checkouts', color: 'var(--chart-3)' },
] as const

export default function ReportsPage() {
  const { hotel, loading } = useHotel()
  const { period, setPeriod, range } = usePeriod()
  const [rep, setRep] = useState<Report | null>(null)
  const [cmp, setCmp] = useState<Cmp | null>(null)

  const load = useCallback(async () => {
    setRep(null)
    const tz = String(new Date().getTimezoneOffset())
    const [r, c] = await Promise.all([
      fetch(`/api/reports?${new URLSearchParams({ from: range.from, to: range.to, tz })}`, { cache: 'no-store' }).then(x => x.json()),
      fetch(`/api/dashboard?${new URLSearchParams({ from: range.from, to: range.to })}`, { cache: 'no-store' }).then(x => x.json()),
    ])
    setRep(r.series ? r : { series: [], distribution: [], totals: {} })
    setCmp(c.current ? c : null)
  }, [range.from, range.to])
  useEffect(() => { load() }, [load])

  const csv = useMemo(() => {
    if (!rep) return ''
    const head = 'Dia;Cadastros;Check-ins;Checkouts;Mensagens enviadas;Falhas;Respostas;Nota média;Cliques Google'
    return '﻿' + [head, ...rep.series.map(d => [d.day, d.registrations, d.checkins, d.checkouts, d.messagesSent, d.messagesFailed, d.responses, d.avgScore ?? '', d.reviewClicks].join(';'))].join('\r\n')
  }, [rep])

  if (loading) return <PageLoading />
  if (!hotel) return <EmptyState icon={BarChart3} title="Nenhum hotel encontrado." />
  if (!isManager(hotel.role)) return <EmptyState icon={BarChart3} title="Acesso restrito" text="Relatórios são exibidos ao proprietário e ao gerente." />

  const n = (k: string) => Number((cmp?.current as Record<string, unknown> | undefined)?.[k] ?? 0)
  const pn = (k: string) => Number((cmp?.previous as Record<string, unknown> | undefined)?.[k] ?? 0)
  const msgs = (cmp?.current as { messages?: { sent: number; delivered: number; read: number; failed: number } } | undefined)?.messages
  const pmsgs = (cmp?.previous as { messages?: { sent: number } } | undefined)?.messages

  return (
    <div className="theme-scope">
      <PageHeader icon={BarChart3} title="Relatórios" subtitle={`Dados reais do sistema · ${range.label}`}
        actions={<>
          <PeriodFilter value={period} onChange={setPeriod} />
          {rep && rep.series.length > 0 && (
            <a className="ui-btn ui-btn-secondary" download={`relatorio-${range.from.slice(0, 10)}-a-${range.to.slice(0, 10)}.csv`}
              href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`}><Download size={15} /> Baixar CSV</a>
          )}
        </>} />

      <div className="px-4 sm:px-6 py-5 space-y-5 max-w-[1300px]">
        {!rep || !cmp ? <PageLoading /> : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard icon={UserPlus} label="Cadastros" value={n('registrations')} delta={<Delta current={n('registrations')} previous={pn('registrations')} />} />
              <StatCard icon={LogIn} label="Check-ins" value={n('checkins')} tone="success" delta={<Delta current={n('checkins')} previous={pn('checkins')} />} />
              <StatCard icon={LogOut} label="Checkouts" value={n('checkouts')} tone="neutral" delta={<Delta current={n('checkouts')} previous={pn('checkouts')} />} />
              <StatCard icon={Send} label="Mensagens enviadas" value={msgs?.sent ?? 0} tone="info" hint={`${msgs?.delivered ?? 0} entregues · ${msgs?.read ?? 0} lidas · ${msgs?.failed ?? 0} falhas`} delta={<Delta current={msgs?.sent ?? 0} previous={pmsgs?.sent ?? 0} />} />
              <StatCard icon={MessageSquare} label="Pesquisas respondidas" value={cmp.current.surveysAnswered} tone="accent"
                hint={cmp.current.surveysSent ? `Taxa de resposta ${Math.round((cmp.current.surveysAnswered / cmp.current.surveysSent) * 100)}%` : 'Nenhuma pesquisa enviada'}
                delta={<Delta current={cmp.current.surveysAnswered} previous={pn('surveysAnswered')} />} />
              <StatCard icon={Star} label="Satisfação média" value={cmp.current.avgSatisfaction !== null ? `${cmp.current.avgSatisfaction.toFixed(1)}/10` : '—'} tone="warn"
                hint={cmp.previous.avgSatisfaction !== null ? `Período anterior: ${cmp.previous.avgSatisfaction.toFixed(1)}/10` : 'Sem base anterior'} />
              <StatCard icon={MousePointerClick} label="Cliques no link Google" value={n('reviewClicks')} tone="success" delta={<Delta current={n('reviewClicks')} previous={pn('reviewClicks')} />} hint="Clique ≠ avaliação publicada" />
              <StatCard icon={TrendingUp} label="Notas 9–10 / 0–6" value={`${n('promoters')} / ${n('detractors')}`} tone="accent" hint="Promotores / detratores" />
            </div>

            <Section title="Evolução diária" icon={TrendingUp} description="Cadastros pelo QR Code, check-ins confirmados e checkouts finalizados">
              <LineChart days={rep.series} />
            </Section>

            <div className="grid lg:grid-cols-2 gap-5">
              <Section title="Distribuição das notas (0 a 10)" icon={Star} description={`${rep.totals.responses || 0} resposta(s) no período`}>
                {(rep.totals.responses || 0) === 0 ? <EmptyState icon={Star} title="Sem respostas no período" text="As notas chegam quando o hóspede responde a pesquisa enviada no checkout." /> : <ScoreBars dist={rep.distribution} />}
              </Section>
              <Section title="Avaliações no Google" icon={Info}>
                <div className="space-y-3 text-sm" style={{ color: 'var(--fg2)' }}>
                  <p>O convite de avaliação vai para todos os hóspedes no checkout. Medimos com dados reais os <b>{rep.totals.reviewClicks || 0} clique(s)</b> no link neste período.</p>
                  <p>A quantidade e a nota média das avaliações publicadas no Google ainda <b>não são exibidas</b>. Isso depende da integração oficial com o Google Business Profile, que exige aprovação de acesso pelo Google e ainda não está ativa.</p>
                  <p className="ui-help">Não apresentamos aumento de avaliações, reservas ou faturamento sem dados verificáveis.</p>
                </div>
              </Section>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function LineChart({ days }: { days: Day[] }) {
  const [hover, setHover] = useState<number | null>(null)
  if (!days.length) return <EmptyState icon={TrendingUp} title="Sem dados no período" />
  const W = 900, H = 240, P = { l: 34, r: 12, t: 12, b: 26 }
  const max = Math.max(1, ...days.flatMap(d => SERIES.map(s => d[s.key])))
  const x = (i: number) => P.l + (days.length === 1 ? (W - P.l - P.r) / 2 : (i * (W - P.l - P.r)) / (days.length - 1))
  const y = (v: number) => P.t + (H - P.t - P.b) * (1 - v / max)
  const ticks = Array.from(new Set([0, Math.round(max / 2), max]))
  const every = Math.ceil(days.length / 8)
  return (
    <div>
      <div className="flex flex-wrap gap-4 mb-2 text-xs">
        {SERIES.map(s => <span key={s.key} className="inline-flex items-center gap-1.5"><span className="w-3 h-0.5 rounded" style={{ background: s.color }} />{s.label}</span>)}
      </div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[560px]" role="img" aria-label="Gráfico de evolução diária" onMouseLeave={() => setHover(null)}>
          {ticks.map(t => (
            <g key={t}>
              <line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} stroke="var(--border)" />
              <text x={P.l - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--fg3)">{t}</text>
            </g>
          ))}
          {days.map((d, i) => i % every === 0 && (
            <text key={d.day} x={x(i)} y={H - 6} textAnchor="middle" fontSize="11" fill="var(--fg3)">{d.day.slice(8, 10)}/{d.day.slice(5, 7)}</text>
          ))}
          {SERIES.map(s => (
            <polyline key={s.key} fill="none" stroke={s.color} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round"
              points={days.map((d, i) => `${x(i)},${y(d[s.key])}`).join(' ')} />
          ))}
          {days.map((d, i) => (
            <rect key={d.day} x={x(i) - (W / days.length) / 2} y={P.t} width={W / days.length} height={H - P.t - P.b} fill="transparent" onMouseEnter={() => setHover(i)} />
          ))}
          {hover !== null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={P.t} y2={H - P.b} stroke="var(--border-strong)" strokeDasharray="3 3" />
              {SERIES.map(s => <circle key={s.key} cx={x(hover)} cy={y(days[hover][s.key])} r="3.5" fill={s.color} />)}
            </g>
          )}
        </svg>
      </div>
      {hover !== null && (
        <div className="text-xs mt-1" style={{ color: 'var(--fg2)' }}>
          <b>{days[hover].day.split('-').reverse().join('/')}</b> · {SERIES.map(s => `${s.label}: ${days[hover][s.key]}`).join(' · ')} · Mensagens: {days[hover].messagesSent}
        </div>
      )}
    </div>
  )
}

function ScoreBars({ dist }: { dist: { score: number; count: number }[] }) {
  const max = Math.max(1, ...dist.map(d => d.count))
  return (
    <div className="flex items-end gap-1.5 h-40">
      {dist.map(d => (
        <div key={d.score} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
          <span className="text-[11px] font-semibold" style={{ color: 'var(--fg2)' }}>{d.count || ''}</span>
          <div className="w-full rounded-t" style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count ? 4 : 1, background: d.score >= 9 ? 'var(--chart-2)' : d.score >= 7 ? 'var(--chart-3)' : 'var(--chart-4)' }} />
          <span className="text-[11px]" style={{ color: 'var(--fg3)' }}>{d.score}</span>
        </div>
      ))}
    </div>
  )
}
