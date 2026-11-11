'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  BellRing, Bell, BellOff, Phone, CalendarDays, Send, LogIn, Ban, LogOut, RotateCw, Search,
  AlertTriangle, Clock, Users as UsersIcon, Mail, ClipboardList, CheckCircle2, Info,
} from 'lucide-react'
import { useHotel } from '@/hooks/useHotel'
import { useHotelRealtime } from '@/hooks/useHotelRealtime'
import { PageHeader, Badge, PageLoading, EmptyState, useToast } from '@/components/ui/kit'
import { STAY_STATUS, MSG_STATUS, AUTOMATION_LABEL, stayKey, fmtDate, fmtPhone, fmtTime, timeAgo } from '@/lib/ui/status'
import { WELCOME_DELAY_SECONDS } from '@/lib/automations/definitions'

type Msg = { id: string; automation_type: string | null; status: string; scheduled_for: string | null; sent_at: string | null; failure_reason: string | null; created_at: string }
type Item = {
  registration: { id: string; status: string; created_at: string; checkin_date: string; checkout_date: string; guest_count: number | null; block_reason: string | null }
  guest: { id: string; full_name: string; whatsapp_number: string; email: string | null; language: string }
  stay: { id: string; status: string; checkin_date: string; checkout_date: string; confirmed_at: string | null; completed_at: string | null } | null
  welcome: Msg | null
  lastMessage: Msg | null
  messages: Msg[]
}

/** Toca um "bip" curto com Web Audio (mais confiável que arquivo de áudio) */
function beep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctx()
    const o = ctx.createOscillator(); const g = ctx.createGain()
    o.type = 'sine'; o.frequency.value = 880
    g.gain.setValueAtTime(0.0001, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35)
    o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.4)
    setTimeout(() => {
      const o2 = ctx.createOscillator(); const g2 = ctx.createGain()
      o2.frequency.value = 1175; g2.gain.setValueAtTime(0.0001, ctx.currentTime)
      g2.gain.exponentialRampToValueAtTime(0.22, ctx.currentTime + 0.02)
      g2.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3)
      o2.connect(g2); g2.connect(ctx.destination); o2.start(); o2.stop(ctx.currentTime + 0.35)
    }, 180)
  } catch { /* navegador sem suporte a áudio */ }
}

function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(id) }, [ms])
  return now
}

export default function ReceptionPage() {
  const { hotel, loading: hotelLoading } = useHotel()
  const [items, setItems] = useState<Item[]>([])
  const [waConnected, setWaConnected] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [newIds, setNewIds] = useState<Set<string>>(new Set())
  const [sound, setSound] = useState(true)
  const [q, setQ] = useState('')
  const toast = useToast()
  const soundRef = useRef(sound)
  soundRef.current = sound

  useEffect(() => { try { setSound(localStorage.getItem('mh-sound') !== 'off') } catch { /* */ } }, [])

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/reception', { cache: 'no-store' })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Erro ao carregar')
      setItems(body.items)
      setWaConnected(body.whatsappConnected)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro de conexão')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])
  // ressincronização periódica (caso o tempo real caia)
  useEffect(() => { const id = setInterval(load, 30000); return () => clearInterval(id) }, [load])

  useHotelRealtime(hotel?.id, (evt) => {
    if (evt.table === 'registrations' && evt.type === 'INSERT') {
      const id = String(evt.record.id)
      setNewIds(prev => new Set(prev).add(id))
      if (soundRef.current) beep()
      setTimeout(() => setNewIds(prev => { const n = new Set(prev); n.delete(id); return n }), 60000)
    }
    load()
  })

  async function act(key: string, payload: Record<string, unknown>, okText: string) {
    setBusy(key)
    try {
      const res = await fetch('/api/reception', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Não foi possível concluir')
      const r = body.result as { status: string; reason?: string } | null
      if (r && r.status === 'failed') toast.show(`${okText} Porém a mensagem NÃO foi enviada: ${r.reason}`, 'warn')
      else if (r && r.status === 'sent') toast.show(`${okText} Mensagem enviada pelo WhatsApp.`, 'success')
      else if (r && r.status === 'cancelled') toast.show(`${okText} Mensagem cancelada: ${r.reason}`, 'warn')
      else toast.show(okText, 'success')
      await load()
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Erro', 'danger')
    } finally {
      setBusy(null)
    }
  }

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    const digits = term.replace(/\D/g, '')
    return term ? items.filter(i => i.guest.full_name.toLowerCase().includes(term) || (digits.length >= 3 && i.guest.whatsapp_number.includes(digits))) : items
  }, [items, q])

  const groups = useMemo(() => ({
    pending: filtered.filter(i => stayKey(i.registration.status, i.stay?.status) === 'pending'),
    active: filtered.filter(i => stayKey(i.registration.status, i.stay?.status) === 'active'),
    done: filtered.filter(i => ['completed', 'blocked'].includes(stayKey(i.registration.status, i.stay?.status))),
  }), [filtered])

  if (hotelLoading || loading) return <PageLoading />
  if (!hotel) return <EmptyState icon={ClipboardList} title="Nenhum hotel associado à sua conta." />

  return (
    <div className="theme-scope">
      <PageHeader icon={BellRing} title="Recepção" subtitle="Cadastros do QR Code em tempo real"
        actions={
          <>
            <div className="relative">
              <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--fg3)' }} />
              <input className="ui-input !pl-8 !py-2 w-[200px]" placeholder="Buscar nome ou telefone" value={q} onChange={e => setQ(e.target.value)} />
            </div>
            <button className="ui-btn ui-btn-secondary" onClick={() => { const v = !sound; setSound(v); try { localStorage.setItem('mh-sound', v ? 'on' : 'off') } catch { /* */ } if (v) beep() }}
              title={sound ? 'Silenciar alerta sonoro' : 'Ativar alerta sonoro'}>
              {sound ? <><Bell size={15} /> Som ligado</> : <><BellOff size={15} /> Som desligado</>}
            </button>
          </>
        } />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 space-y-5">
        {!waConnected && (
          <div className="ui-card-flat p-4 flex flex-wrap items-center gap-3" style={{ borderColor: 'var(--danger)', background: 'var(--danger-bg)' }}>
            <AlertTriangle size={18} style={{ color: 'var(--danger)' }} />
            <div className="flex-1 min-w-[220px] text-sm">
              <b>WhatsApp ainda não conectado.</b> Os cadastros continuam chegando, mas nenhuma mensagem será enviada até a conexão com a Meta. Envios tentados aparecem como <b>Falha no envio</b>.
            </div>
            <Link href="/automations" className="ui-btn ui-btn-primary ui-btn-sm">Conectar WhatsApp</Link>
          </div>
        )}
        {error && <div className="ui-card-flat p-3 text-sm" style={{ color: 'var(--danger)' }}>Erro ao atualizar: {error}. Tentando novamente…</div>}

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Aguardando check-in', value: groups.pending.length, tone: 'warn' },
            { label: 'Hospedados agora', value: groups.active.length, tone: 'success' },
            { label: 'Finalizados / bloqueados', value: groups.done.length, tone: 'neutral' },
          ].map(s => (
            <div key={s.label} className="ui-card-flat p-3 sm:p-4">
              <div className="text-2xl font-extrabold" style={{ color: `var(--${s.tone})`, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{s.value}</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--fg3)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        <HowItWorks />

        <Group title="Novos cadastros — aguardando check-in" tone="warn" count={groups.pending.length}
          empty="Nenhum cadastro pendente. Quando um hóspede escanear o QR Code, ele aparece aqui na hora, com alerta sonoro.">
          {groups.pending.map(i => <Card key={i.registration.id} item={i} isNew={newIds.has(i.registration.id)} busy={busy} act={act} />)}
        </Group>

        <Group title="Hospedados" tone="success" count={groups.active.length} empty="Nenhum hóspede com check-in confirmado no momento.">
          {groups.active.map(i => <Card key={i.registration.id} item={i} isNew={false} busy={busy} act={act} />)}
        </Group>

        <Group title="Finalizados e bloqueados (últimos 14 dias)" tone="neutral" count={groups.done.length} empty="Nada por aqui ainda." collapsed>
          {groups.done.map(i => <Card key={i.registration.id} item={i} isNew={false} busy={busy} act={act} />)}
        </Group>
      </div>
      {toast.node}
    </div>
  )
}

function HowItWorks() {
  const [open, setOpen] = useState(false)
  return (
    <div className="ui-subtle px-4 py-3 text-[13px]">
      <button className="flex items-center gap-2 font-semibold w-full text-left" onClick={() => setOpen(!open)}>
        <Info size={15} style={{ color: 'var(--accent)' }} /> Como funciona a recepção
        <span className="ml-auto text-xs" style={{ color: 'var(--fg3)' }}>{open ? 'ocultar' : 'ver'}</span>
      </button>
      {open && (
        <ol className="mt-2 space-y-1.5 list-decimal pl-5" style={{ color: 'var(--fg2)' }}>
          <li>O hóspede preenche o QR Code e o cadastro aparece aqui em destaque vermelho, com alerta sonoro.</li>
          <li>Em <b>5 minutos</b> o sistema envia automaticamente uma mensagem neutra de <b>boas-vindas</b> (pelo servidor, mesmo com esta tela fechada). Use <b>Enviar boas-vindas agora</b> para antecipar.</li>
          <li><b>Confirmar check-in</b> registra que o hóspede realmente chegou e envia as informações úteis do hotel (Wi-Fi, café, check-out).</li>
          <li><b>Bloquear cadastro</b> impede qualquer mensagem para um cadastro indevido.</li>
          <li><b>Finalizar estadia</b> envia na hora a pesquisa de 0 a 10 com o link de avaliação do Google.</li>
        </ol>
      )}
    </div>
  )
}

function Group({ title, tone, count, empty, children, collapsed }: { title: string; tone: string; count: number; empty: string; children: React.ReactNode; collapsed?: boolean }) {
  const [open, setOpen] = useState(!collapsed)
  return (
    <section>
      <button className="flex items-center gap-2 mb-3 text-[15px] font-bold" onClick={() => setOpen(!open)}>
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: `var(--${tone})` }} />
        {title} <span style={{ color: 'var(--fg3)' }}>({count})</span>
      </button>
      {open && (count === 0
        ? <div className="ui-subtle p-4 text-sm" style={{ color: 'var(--fg3)' }}>{empty}</div>
        : <div className="space-y-3">{children}</div>)}
    </section>
  )
}

function Countdown({ msg }: { msg: Msg }) {
  const now = useNow()
  if (!msg.scheduled_for) return null
  const remaining = Math.max(0, Math.ceil((Date.parse(msg.scheduled_for) - now) / 1000))
  const pct = Math.min(100, (remaining / WELCOME_DELAY_SECONDS) * 100)
  const mm = Math.floor(remaining / 60), ss = String(remaining % 60).padStart(2, '0')
  return (
    <div className="flex items-center gap-2 text-xs">
      <Clock size={13} style={{ color: 'var(--warn)' }} />
      <div className="w-28 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--warn-bg)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: remaining < 30 ? 'var(--danger)' : 'var(--warn)' }} />
      </div>
      {remaining > 0
        ? <span className="font-mono font-bold" style={{ color: 'var(--warn)' }}>{mm}:{ss}</span>
        : <span className="font-semibold" style={{ color: 'var(--info)' }}>enviando…</span>}
      <span style={{ color: 'var(--fg3)' }}>{remaining > 0 ? 'para a boas-vindas automática' : ''}</span>
    </div>
  )
}

function Card({ item, isNew, busy, act }: {
  item: Item; isNew: boolean; busy: string | null
  act: (key: string, payload: Record<string, unknown>, okText: string) => Promise<void>
}) {
  const { registration: reg, guest, stay, welcome } = item
  const sk = stayKey(reg.status, stay?.status)
  const stayInfo = STAY_STATUS[sk]
  const welcomeInfo = MSG_STATUS[welcome?.status || 'none']
  const last = item.lastMessage
  const [panel, setPanel] = useState<null | 'confirm' | 'block' | 'complete'>(null)
  const [cin, setCin] = useState(reg.checkin_date)
  const [cout, setCout] = useState(reg.checkout_date)
  const [reason, setReason] = useState('')
  const k = (a: string) => `${a}-${reg.id}`
  const welcomeSent = welcome && ['sent', 'delivered', 'read'].includes(welcome.status)
  const failedMsgs = item.messages.filter(m => m.status === 'failed')

  return (
    <div className={`ui-card-flat p-4 ${isNew ? 'ui-new' : ''}`}>
      <div className="flex flex-col md:flex-row md:items-start gap-3">
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-[15px] truncate">{guest.full_name}</h3>
            {isNew && <Badge tone="danger" dot>NOVO</Badge>}
            <Badge tone={stayInfo.tone}>{stayInfo.label}</Badge>
            {sk !== 'blocked' && (
              <span title="Status da mensagem de boas-vindas"><Badge tone={welcomeInfo.tone}>Boas-vindas: {welcomeInfo.label.toLowerCase()}</Badge></span>
            )}
          </div>
          <div className="flex items-center gap-x-4 gap-y-1 text-[13px] flex-wrap" style={{ color: 'var(--fg2)' }}>
            <span className="inline-flex items-center gap-1"><Phone size={13} /> {fmtPhone(guest.whatsapp_number)}</span>
            <span className="inline-flex items-center gap-1"><CalendarDays size={13} /> {fmtDate(stay?.checkin_date || reg.checkin_date)} → {fmtDate(stay?.checkout_date || reg.checkout_date)}</span>
            {reg.guest_count ? <span className="inline-flex items-center gap-1"><UsersIcon size={13} /> {reg.guest_count}</span> : null}
            {guest.email && <span className="inline-flex items-center gap-1 truncate"><Mail size={13} /> {guest.email}</span>}
          </div>
          <div className="text-xs flex flex-wrap gap-x-3" style={{ color: 'var(--fg3)' }}>
            <span>Cadastro {timeAgo(reg.created_at)} ({fmtTime(reg.created_at)})</span>
            <span>Idioma: {guest.language === 'pt-BR' ? 'Português' : guest.language === 'es' ? 'Español' : 'English'}</span>
            {stay?.confirmed_at && <span>Check-in confirmado às {fmtTime(stay.confirmed_at)}</span>}
            {stay?.completed_at && <span>Finalizada às {fmtTime(stay.completed_at)}</span>}
            {reg.block_reason && sk === 'blocked' && <span>Motivo: {reg.block_reason}</span>}
          </div>
          {sk === 'pending' && welcome?.status === 'scheduled' && <Countdown msg={welcome} />}
          {last && last.automation_type !== 'welcome' && (
            <div className="text-xs" style={{ color: 'var(--fg3)' }}>
              Última mensagem: {AUTOMATION_LABEL[last.automation_type || ''] || last.automation_type} — <span style={{ color: `var(--${MSG_STATUS[last.status]?.tone || 'neutral'})` }}>{MSG_STATUS[last.status]?.label || last.status}</span>
            </div>
          )}
          {failedMsgs.slice(0, 2).map(m => (
            <div key={m.id} className="text-xs flex items-start gap-1.5 flex-wrap" style={{ color: 'var(--danger)' }}>
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              <span className="flex-1 min-w-[180px]">{AUTOMATION_LABEL[m.automation_type || ''] || 'Mensagem'} não enviada: {m.failure_reason}</span>
              {m.automation_type !== 'welcome' && (
                <button className="ui-btn ui-btn-secondary ui-btn-sm" disabled={!!busy} onClick={() => act(k('resend' + m.id), { action: 'resend', message_id: m.id }, 'Reenvio solicitado.')}>
                  <RotateCw size={12} /> Tentar novamente
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap md:flex-col md:items-stretch gap-2 md:w-[210px] shrink-0">
          {sk === 'pending' && (
            <>
              {!welcomeSent && (
                <button className="ui-btn ui-btn-wa" disabled={!!busy} title="Envia agora a mensagem neutra de boas-vindas e cancela o disparo programado"
                  onClick={() => act(k('welcome'), { action: 'welcome_now', registration_id: reg.id }, 'Boas-vindas processada.')}>
                  {busy === k('welcome') ? 'Enviando…' : <><Send size={14} /> {welcome?.status === 'failed' ? 'Tentar boas-vindas de novo' : 'Enviar boas-vindas agora'}</>}
                </button>
              )}
              <button className="ui-btn ui-btn-success" disabled={!!busy} onClick={() => setPanel(panel === 'confirm' ? null : 'confirm')}
                title="O hóspede chegou: confirma a estadia e envia as informações úteis">
                <LogIn size={14} /> Confirmar check-in
              </button>
              <button className="ui-btn ui-btn-danger" disabled={!!busy} onClick={() => setPanel(panel === 'block' ? null : 'block')}
                title="Cadastro indevido: impede qualquer mensagem automática">
                <Ban size={14} /> Bloquear cadastro
              </button>
            </>
          )}
          {sk === 'active' && (
            <button className="ui-btn ui-btn-primary" disabled={!!busy} onClick={() => setPanel(panel === 'complete' ? null : 'complete')}>
              <LogOut size={14} /> Finalizar estadia
            </button>
          )}
          {sk === 'completed' && <span className="text-xs inline-flex items-center gap-1" style={{ color: 'var(--fg3)' }}><CheckCircle2 size={13} /> Pesquisa: {MSG_STATUS[item.messages.find(m => m.automation_type === 'checkout_survey')?.status || 'none'].label}</span>}
        </div>
      </div>

      {panel === 'confirm' && (
        <div className="mt-3 ui-subtle p-3 space-y-3">
          <p className="text-[13px]" style={{ color: 'var(--fg2)' }}>Confira as datas informadas pelo hóspede. Ao confirmar, ele passa para <b>Hospedados</b> e recebe a mensagem com as informações úteis do hotel.</p>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs"><span className="ui-label">Entrada</span><input type="date" className="ui-input !w-auto" value={cin} onChange={e => setCin(e.target.value)} /></label>
            <label className="text-xs"><span className="ui-label">Saída</span><input type="date" className="ui-input !w-auto" value={cout} min={cin} onChange={e => setCout(e.target.value)} /></label>
            <button className="ui-btn ui-btn-success" disabled={!!busy || !cin || !cout || cout <= cin}
              onClick={async () => { await act(k('confirm'), { action: 'confirm_checkin', registration_id: reg.id, checkin_date: cin, checkout_date: cout }, 'Check-in confirmado.'); setPanel(null) }}>
              {busy === k('confirm') ? 'Confirmando…' : 'Confirmar check-in'}
            </button>
            <button className="ui-btn ui-btn-ghost" onClick={() => setPanel(null)}>Cancelar</button>
          </div>
        </div>
      )}
      {panel === 'block' && (
        <div className="mt-3 ui-subtle p-3 space-y-3">
          <p className="text-[13px]" style={{ color: 'var(--fg2)' }}>O cadastro será bloqueado e <b>nenhuma mensagem</b> será enviada para este hóspede. Use para cadastros falsos ou duplicados.</p>
          <div className="flex flex-wrap items-end gap-3">
            <input className="ui-input flex-1 min-w-[200px]" placeholder="Motivo (opcional)" value={reason} onChange={e => setReason(e.target.value)} maxLength={300} />
            <button className="ui-btn ui-btn-danger" disabled={!!busy}
              onClick={async () => { await act(k('block'), { action: 'block', registration_id: reg.id, reason: reason || undefined }, 'Cadastro bloqueado.'); setPanel(null) }}>
              {busy === k('block') ? 'Bloqueando…' : 'Confirmar bloqueio'}
            </button>
            <button className="ui-btn ui-btn-ghost" onClick={() => setPanel(null)}>Cancelar</button>
          </div>
        </div>
      )}
      {panel === 'complete' && stay && (
        <div className="mt-3 ui-subtle p-3 flex flex-wrap items-center gap-3">
          <p className="text-[13px] flex-1 min-w-[220px]" style={{ color: 'var(--fg2)' }}>Registra o checkout e envia <b>agora</b> a pesquisa de satisfação (0 a 10) com o link de avaliação do Google, na mesma mensagem.</p>
          <button className="ui-btn ui-btn-primary" disabled={!!busy}
            onClick={async () => { await act(k('complete'), { action: 'complete', stay_id: stay.id }, 'Estadia finalizada.'); setPanel(null) }}>
            {busy === k('complete') ? 'Finalizando…' : 'Confirmar checkout'}
          </button>
          <button className="ui-btn ui-btn-ghost" onClick={() => setPanel(null)}>Cancelar</button>
        </div>
      )}
    </div>
  )
}
