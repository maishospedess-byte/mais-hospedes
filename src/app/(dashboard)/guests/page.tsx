'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Users, Search, Download, Phone, Mail, Star, ShieldCheck, ShieldOff, ArrowDownLeft, ArrowUpRight, CalendarDays, Globe,
} from 'lucide-react'
import { useHotel, isManager } from '@/hooks/useHotel'
import { usePeriod } from '@/hooks/usePeriod'
import { useHotelRealtime } from '@/hooks/useHotelRealtime'
import { PageHeader, Badge, PageLoading, EmptyState, Drawer, Spinner } from '@/components/ui/kit'
import { PeriodFilter } from '@/components/ui/PeriodFilter'
import { STAY_STATUS, MSG_STATUS, AUTOMATION_LABEL, fmtDate, fmtDateTime, fmtPhone, fmtTime } from '@/lib/ui/status'

type Row = {
  id: string; full_name: string; whatsapp_number: string; email: string | null; language: string; hotel_name: string
  registered_at: string; checkin_date: string | null; checkout_date: string | null
  stay_status: 'pending' | 'active' | 'completed' | 'blocked' | 'none'; registrations: number
  last_message: { automation_type: string | null; status: string; at: string; failure_reason: string | null } | null
  score: number | null; opted_out: boolean
}
const LANG: Record<string, string> = { 'pt-BR': 'PT', es: 'ES', en: 'EN' }

export default function Page() {
  return <Suspense fallback={<PageLoading />}><GuestsPage /></Suspense>
}

function GuestsPage() {
  const params = useSearchParams()
  const { hotel, loading: hotelLoading } = useHotel()
  const { period, setPeriod, range } = usePeriod()
  const [q, setQ] = useState(params.get('q') || '')
  const [debounced, setDebounced] = useState(q)
  const [status, setStatus] = useState(params.get('status') || 'all')
  const [sort, setSort] = useState('recent')
  const [allTime, setAllTime] = useState(!!params.get('q'))
  const [arrivalsToday, setArrivalsToday] = useState(false)
  const [rows, setRows] = useState<Row[] | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => { const t = setTimeout(() => setDebounced(q), 300); return () => clearTimeout(t) }, [q])

  const query = useMemo(() => {
    const qs = new URLSearchParams({ status, sort })
    if (debounced.trim()) qs.set('q', debounced.trim())
    if (!allTime && !arrivalsToday) { qs.set('from', range.from); qs.set('to', range.to) }
    return qs.toString()
  }, [debounced, status, sort, allTime, arrivalsToday, range.from, range.to])

  const load = useCallback(async () => {
    const res = await fetch(`/api/guests?${query}`, { cache: 'no-store' })
    const j = await res.json()
    setRows(j.rows || [])
  }, [query])
  useEffect(() => { load() }, [load])
  useHotelRealtime(hotel?.id, () => load())

  const today = new Date(); const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const visible = useMemo(() => (rows || []).filter(r => !arrivalsToday || r.checkin_date === todayStr), [rows, arrivalsToday, todayStr])

  if (hotelLoading) return <PageLoading />
  if (!hotel) return <EmptyState icon={Users} title="Nenhum hotel encontrado." />
  const manager = isManager(hotel.role)

  return (
    <div className="theme-scope">
      <PageHeader icon={Users} title="Hóspedes" subtitle={rows ? `${visible.length} contato(s) encontrados` : 'Carregando…'}
        actions={manager && (
          <a className="ui-btn ui-btn-secondary" href={`/api/guests/export?${query}`} title="Exporta os contatos filtrados (sem dados de cobrança)">
            <Download size={15} /> Exportar CSV
          </a>
        )} />

      <div className="px-4 sm:px-6 py-5 space-y-4 max-w-[1400px]">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--fg3)' }} />
            <input className="ui-input !pl-8" placeholder="Buscar por nome ou telefone" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <select className="ui-input !w-auto" value={status} onChange={e => setStatus(e.target.value)} aria-label="Status">
            <option value="all">Todos os status</option>
            <option value="pending">Aguardando check-in</option>
            <option value="active">Hospedados</option>
            <option value="completed">Estadia finalizada</option>
            <option value="blocked">Bloqueados</option>
          </select>
          <select className="ui-input !w-auto" value={sort} onChange={e => setSort(e.target.value)} aria-label="Ordenar">
            <option value="recent">Mais recentes</option>
            <option value="oldest">Mais antigos</option>
            <option value="name">Nome (A–Z)</option>
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className={`ui-btn ui-btn-sm ${arrivalsToday ? 'ui-btn-primary' : 'ui-btn-secondary'}`} onClick={() => setArrivalsToday(!arrivalsToday)}>
            <CalendarDays size={13} /> Entrada hoje
          </button>
          <button className={`ui-btn ui-btn-sm ${allTime && !arrivalsToday ? 'ui-btn-primary' : 'ui-btn-secondary'}`} onClick={() => { setAllTime(!allTime); setArrivalsToday(false) }}>Todo o histórico</button>
          {!allTime && !arrivalsToday && <PeriodFilter value={period} onChange={setPeriod} />}
        </div>

        <div className="ui-card-flat">
          {!rows ? <PageLoading /> : visible.length === 0 ? (
            <EmptyState icon={Users} title="Nenhum hóspede encontrado" text="Ajuste a busca ou o período. Os cadastros feitos pelo QR Code aparecem aqui automaticamente." />
          ) : (
            <div className="overflow-x-auto">
              <table className="ui-table min-w-[980px]">
                <thead><tr><th>Nome</th><th>WhatsApp</th><th>E-mail</th><th>Cadastro</th><th>Estadia</th><th>Status</th><th>Última mensagem</th><th>Nota</th></tr></thead>
                <tbody>
                  {visible.map(r => {
                    const st = STAY_STATUS[r.stay_status]
                    const lm = r.last_message
                    return (
                      <tr key={r.id} className="ui-row-click" onClick={() => setSelected(r.id)}>
                        <td>
                          <div className="font-medium flex items-center gap-1.5">{r.full_name} <span className="text-[10px] font-bold px-1 rounded" style={{ background: 'var(--surface-2)', color: 'var(--fg3)' }}>{LANG[r.language] || r.language}</span></div>
                          <div className="text-xs" style={{ color: 'var(--fg3)' }}>{r.hotel_name}{r.registrations > 1 ? ` · ${r.registrations} cadastros` : ''}</div>
                        </td>
                        <td style={{ color: 'var(--fg2)' }} className="whitespace-nowrap">{fmtPhone(r.whatsapp_number)}{r.opted_out && <div><Badge tone="danger">Opt-out</Badge></div>}</td>
                        <td style={{ color: 'var(--fg2)' }} className="max-w-[200px] truncate">{r.email || '—'}</td>
                        <td style={{ color: 'var(--fg2)' }} className="whitespace-nowrap">{fmtDate(r.registered_at)} <span className="text-xs" style={{ color: 'var(--fg3)' }}>{fmtTime(r.registered_at)}</span></td>
                        <td style={{ color: 'var(--fg2)' }} className="whitespace-nowrap">{r.checkin_date ? `${fmtDate(r.checkin_date)} → ${fmtDate(r.checkout_date)}` : '—'}</td>
                        <td><Badge tone={st.tone}>{st.label}</Badge></td>
                        <td>{lm ? <div><Badge tone={MSG_STATUS[lm.status]?.tone || 'neutral'}>{MSG_STATUS[lm.status]?.label || lm.status}</Badge><div className="text-xs mt-0.5" style={{ color: 'var(--fg3)' }}>{AUTOMATION_LABEL[lm.automation_type || ''] || ''}</div></div> : <span style={{ color: 'var(--fg3)' }}>—</span>}</td>
                        <td>{r.score !== null ? <span className="font-bold inline-flex items-center gap-1"><Star size={13} style={{ color: 'var(--warn)' }} />{r.score}</span> : <span style={{ color: 'var(--fg3)' }}>—</span>}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <GuestDrawer id={selected} onClose={() => setSelected(null)} />
    </div>
  )
}

type Detail = {
  guest: { id: string; full_name: string; whatsapp_number: string; email: string | null; language: string; created_at: string }
  registrations: { id: string; status: string; created_at: string; checkin_date: string; checkout_date: string; guest_count: number | null; block_reason: string | null }[]
  stays: { id: string; registration_id: string; status: string; checkin_date: string; checkout_date: string; confirmed_at: string | null; completed_at: string | null }[]
  messages: { id: string; direction: string; automation_type: string | null; status: string; content: string | null; created_at: string; sent_at: string | null; failure_reason: string | null }[]
  consent: { consented: boolean; consent_text: string; created_at: string }[]
  satisfaction: { stay_id: string; score: number; responded_at: string }[]
  optOut: { opted_out_at: string; source: string } | null
}

function GuestDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const [d, setD] = useState<Detail | null>(null)
  useEffect(() => {
    if (!id) return
    setD(null)
    fetch(`/api/guests/${id}`, { cache: 'no-store' }).then(r => r.json()).then(setD).catch(() => setD(null))
  }, [id])
  return (
    <Drawer open={!!id} onClose={onClose} title={d?.guest.full_name || 'Hóspede'}>
      {!d ? <div className="flex justify-center py-10"><Spinner size={22} /></div> : (
        <div className="space-y-5 text-sm">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2"><Phone size={14} style={{ color: 'var(--fg3)' }} /> {fmtPhone(d.guest.whatsapp_number)}</div>
            <div className="flex items-center gap-2"><Mail size={14} style={{ color: 'var(--fg3)' }} /> {d.guest.email || '—'}</div>
            <div className="flex items-center gap-2"><Globe size={14} style={{ color: 'var(--fg3)' }} /> {d.guest.language === 'pt-BR' ? 'Português' : d.guest.language === 'es' ? 'Español' : 'English'}</div>
            <div className="flex items-center gap-2">
              {d.optOut ? <><ShieldOff size={14} style={{ color: 'var(--danger)' }} /> Pediu para não receber mensagens em {fmtDateTime(d.optOut.opted_out_at)}</>
                : d.consent[0]?.consented ? <><ShieldCheck size={14} style={{ color: 'var(--success)' }} /> Consentimento registrado em {fmtDateTime(d.consent[0].created_at)}</>
                : <><ShieldOff size={14} style={{ color: 'var(--warn)' }} /> Sem consentimento registrado</>}
            </div>
          </div>

          <div>
            <h3 className="font-bold mb-2">Estadias</h3>
            <div className="space-y-2">
              {d.registrations.map(r => {
                const stay = d.stays.find(s => s.registration_id === r.id)
                const sk = r.status === 'registration_blocked' ? 'blocked' : stay?.status === 'stay_completed' ? 'completed' : stay?.status === 'stay_active' ? 'active' : 'pending'
                const score = stay ? d.satisfaction.find(s => s.stay_id === stay.id) : null
                return (
                  <div key={r.id} className="ui-subtle p-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-medium">{fmtDate(stay?.checkin_date || r.checkin_date)} → {fmtDate(stay?.checkout_date || r.checkout_date)}</span>
                      <Badge tone={STAY_STATUS[sk].tone}>{STAY_STATUS[sk].label}</Badge>
                    </div>
                    <div className="text-xs mt-1 space-x-3" style={{ color: 'var(--fg3)' }}>
                      <span>Cadastro {fmtDateTime(r.created_at)}</span>
                      {r.guest_count ? <span>{r.guest_count} hóspede(s)</span> : null}
                      {stay?.confirmed_at && <span>Check-in {fmtDateTime(stay.confirmed_at)}</span>}
                      {stay?.completed_at && <span>Checkout {fmtDateTime(stay.completed_at)}</span>}
                    </div>
                    {score && <div className="mt-1 text-[13px]"><Star size={13} className="inline -mt-0.5" style={{ color: 'var(--warn)' }} /> Nota <b>{score.score}</b>/10</div>}
                    {r.block_reason && sk === 'blocked' && <div className="text-xs mt-1" style={{ color: 'var(--danger)' }}>Motivo: {r.block_reason}</div>}
                  </div>
                )
              })}
            </div>
          </div>

          <div>
            <h3 className="font-bold mb-2">Histórico de mensagens</h3>
            {d.messages.length === 0 ? <p style={{ color: 'var(--fg3)' }}>Nenhuma mensagem.</p> : (
              <ul className="space-y-2">
                {d.messages.map(m => (
                  <li key={m.id} className="ui-subtle p-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {m.direction === 'inbound' ? <ArrowDownLeft size={14} style={{ color: 'var(--info)' }} /> : <ArrowUpRight size={14} style={{ color: 'var(--accent)' }} />}
                      <span className="font-medium">{m.direction === 'inbound' ? 'Resposta do hóspede' : AUTOMATION_LABEL[m.automation_type || ''] || m.automation_type}</span>
                      {m.direction === 'outbound' && <Badge tone={MSG_STATUS[m.status]?.tone || 'neutral'}>{MSG_STATUS[m.status]?.label || m.status}</Badge>}
                      <span className="text-xs ml-auto" style={{ color: 'var(--fg3)' }}>{fmtDateTime(m.sent_at || m.created_at)}</span>
                    </div>
                    {m.content && <p className="mt-1.5 text-[13px] whitespace-pre-wrap" style={{ color: 'var(--fg2)' }}>{m.content}</p>}
                    {m.failure_reason && <p className="mt-1 text-xs" style={{ color: m.status === 'failed' ? 'var(--danger)' : 'var(--fg3)' }}>{m.failure_reason}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Drawer>
  )
}
