'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import {
  Settings, Building2, Image as ImageIcon, Info, QrCode, MessageCircle, Zap, Link2, UsersRound, CreditCard,
  SlidersHorizontal, CheckCircle2, Circle, Upload, Trash2, Check, AlertCircle, UserPlus, Moon, Sun, ArrowRight,
} from 'lucide-react'
import { useHotel, isManager } from '@/hooks/useHotel'
import { PageHeader, Section, Badge, PageLoading, EmptyState, useToast, useTheme, Spinner } from '@/components/ui/kit'
import { QrCodeCard } from '@/components/QrCodeCard'
import { fmtDate } from '@/lib/ui/status'
import type { Hotel } from '@/types/database'

type HotelForm = Partial<Record<keyof Hotel, string | null>>

const NAV = [
  { id: 'hotel', label: 'Dados do estabelecimento', icon: Building2 },
  { id: 'brand', label: 'Identidade visual', icon: ImageIcon },
  { id: 'info', label: 'Informações úteis', icon: Info },
  { id: 'qrcode', label: 'QR Code', icon: QrCode },
  { id: 'whatsapp', label: 'WhatsApp e Meta', icon: MessageCircle },
  { id: 'automations', label: 'Mensagens e automações', icon: Zap },
  { id: 'links', label: 'Instagram e Google', icon: Link2 },
  { id: 'team', label: 'Equipe e permissões', icon: UsersRound },
  { id: 'plan', label: 'Assinatura e uso', icon: CreditCard },
  { id: 'prefs', label: 'Idioma e aparência', icon: SlidersHorizontal },
]

export default function SettingsPage() {
  const { hotel, loading, reload } = useHotel()
  const [form, setForm] = useState<HotelForm>({})
  const [qrCount, setQrCount] = useState(0)
  const [wa, setWa] = useState<{ connected: boolean; phone: string | null; approved: number; total: number } | null>(null)
  const [usage, setUsage] = useState<{ staysThisMonth: number; plan: { name: string; stay_limit: number; status: string; trial_ends_at: string | null } | null } | null>(null)
  const toast = useToast()

  const loadAll = useCallback(async () => {
    const [s, w] = await Promise.all([
      fetch('/api/hotel/settings', { cache: 'no-store' }).then(r => r.json()),
      fetch('/api/whatsapp', { cache: 'no-store' }).then(r => r.ok ? r.json() : null),
    ])
    if (s.hotel) setForm(s.hotel)
    setQrCount(s.qrRegistrations || 0)
    if (w) setWa({
      connected: w.account?.connection_status === 'connected', phone: w.account?.phone_number || null,
      approved: (w.templates || []).filter((t: { status: string }) => t.status === 'approved').length, total: (w.templates || []).length,
    })
    const now = new Date(); const today = new Date(now); today.setHours(0, 0, 0, 0); const month = new Date(today); month.setDate(1)
    const d = await fetch(`/api/dashboard?${new URLSearchParams({ from: month.toISOString(), to: new Date(today.getTime() + 86400_000).toISOString(), today: today.toISOString(), month: month.toISOString() })}`).then(r => r.json()).catch(() => null)
    if (d?.usage) setUsage(d.usage)
  }, [])
  useEffect(() => { loadAll() }, [loadAll])

  if (loading) return <PageLoading />
  if (!hotel) return <EmptyState icon={Settings} title="Nenhum hotel encontrado." />
  if (!isManager(hotel.role)) return <EmptyState icon={Settings} title="Acesso restrito" text="As configurações do hotel são gerenciadas pelo proprietário ou gerente." />

  const set = (k: keyof Hotel) => (v: string) => setForm(f => ({ ...f, [k]: v }))
  const save = async (keys: (keyof Hotel)[], ok = 'Alterações salvas.') => {
    const body = Object.fromEntries(keys.map(k => [k, form[k] ?? null]))
    const res = await fetch('/api/hotel/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const j = await res.json()
    if (!res.ok) { toast.show(j.error || 'Não foi possível salvar', 'danger'); return false }
    setForm(j.hotel); toast.show(ok, 'success'); await reload(); return true
  }

  const checks = {
    hotel: !!(form.name && form.whatsapp_number),
    brand: !!form.logo_url,
    info: !!(form.checkout_time && form.breakfast_time && form.wifi_info && form.reception_contact),
    whatsapp: !!wa?.connected,
    automations: !!wa && wa.approved > 0,
    links: !!form.google_review_url,
  }
  const activation = [
    { ok: checks.hotel, label: 'Dados do hotel e WhatsApp de contato', href: '#hotel' },
    { ok: checks.info, label: 'Informações úteis (café, Wi-Fi, check-out, recepção)', href: '#info' },
    { ok: checks.links, label: 'Link de avaliação do Google', href: '#links' },
    { ok: checks.brand, label: 'Logomarca para o formulário', href: '#brand' },
    { ok: qrCount > 0, label: 'QR Code impresso e primeiro cadastro recebido', href: '#qrcode' },
    { ok: checks.whatsapp, label: 'WhatsApp oficial conectado', href: '/automations' },
    { ok: checks.automations, label: 'Templates de mensagem aprovados pela Meta', href: '/automations?tab=automations' },
  ]
  const done = activation.filter(a => a.ok).length

  return (
    <div className="theme-scope">
      <PageHeader icon={Settings} title="Configurações do hotel" subtitle="Tudo o que o sistema usa nas mensagens e no formulário do hóspede" />
      <div className="px-4 sm:px-6 py-5 grid lg:grid-cols-[230px_1fr] gap-6 max-w-[1200px]">
        <nav className="hidden lg:block sticky top-5 self-start space-y-0.5">
          {NAV.map(n => {
            const incomplete = (n.id in checks) && !checks[n.id as keyof typeof checks]
            return (
              <a key={n.id} href={`#${n.id}`} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] hover:bg-[var(--surface-hover)]" style={{ color: 'var(--fg2)' }}>
                <n.icon size={15} /> <span className="flex-1">{n.label}</span>
                {incomplete && <span className="w-2 h-2 rounded-full" style={{ background: 'var(--warn)' }} title="Incompleto" />}
              </a>
            )
          })}
        </nav>

        <div className="space-y-5 min-w-0">
          <Section title="Checklist de ativação" icon={CheckCircle2} description={`${done} de ${activation.length} etapas concluídas`}>
            <div className="h-2 rounded-full overflow-hidden mb-4" style={{ background: 'var(--surface-2)' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${(done / activation.length) * 100}%`, background: 'var(--success)' }} />
            </div>
            <ul className="grid sm:grid-cols-2 gap-2">
              {activation.map(a => (
                <li key={a.label}>
                  <a href={a.href} className="flex items-start gap-2 text-[13px] p-2 rounded-lg hover:bg-[var(--surface-hover)]">
                    {a.ok ? <CheckCircle2 size={16} className="shrink-0" style={{ color: 'var(--success)' }} /> : <Circle size={16} className="shrink-0" style={{ color: 'var(--fg3)' }} />}
                    <span style={{ color: a.ok ? 'var(--fg3)' : 'var(--fg)' }}>{a.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </Section>

          <FormSection id="hotel" icon={Building2} title="Dados do estabelecimento" description="Como o hotel aparece para os hóspedes" incomplete={!checks.hotel}
            onSave={() => save(['name', 'phone', 'whatsapp_number', 'country', 'timezone'])}>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Nome comercial" required><input className="ui-input" value={form.name || ''} onChange={e => set('name')(e.target.value)} maxLength={120} /></Field>
              <Field label="Telefone fixo" help="Opcional"><input className="ui-input" value={form.phone || ''} onChange={e => set('phone')(e.target.value)} placeholder="(65) 3333-3333" /></Field>
              <Field label="WhatsApp oficial do hotel" required help="Formato internacional. Usado no botão “Salve nosso WhatsApp” do formulário.">
                <input className="ui-input" value={form.whatsapp_number || ''} onChange={e => set('whatsapp_number')(e.target.value)} placeholder="+5565999999999" /></Field>
              <Field label="País">
                <select className="ui-input" value={form.country || 'BR'} onChange={e => set('country')(e.target.value)}><option value="BR">Brasil</option><option value="PY">Paraguai</option></select></Field>
              <Field label="Fuso horário">
                <select className="ui-input" value={form.timezone || 'America/Sao_Paulo'} onChange={e => set('timezone')(e.target.value)}>
                  {['America/Sao_Paulo', 'America/Cuiaba', 'America/Campo_Grande', 'America/Manaus', 'America/Porto_Velho', 'America/Rio_Branco', 'America/Belem', 'America/Fortaleza', 'America/Recife', 'America/Bahia', 'America/Noronha', 'America/Asuncion'].map(t => <option key={t} value={t}>{t.replace('America/', '').replace('_', ' ')}</option>)}
                </select></Field>
            </div>
          </FormSection>

          <LogoSection logoUrl={form.logo_url || null} hotelName={form.name || ''} onChange={async (url) => { setForm(f => ({ ...f, logo_url: url })); await reload() }} toast={toast.show} />

          <FormSection id="info" icon={Info} title="Informações úteis" description="Enviadas automaticamente ao hóspede quando a recepção confirma o check-in" incomplete={!checks.info}
            onSave={() => save(['checkin_time', 'checkout_time', 'breakfast_time', 'wifi_info', 'reception_contact', 'rules'])}>
            <div className="grid sm:grid-cols-3 gap-4">
              <Field label="Horário de check-in"><input className="ui-input" value={form.checkin_time || ''} onChange={e => set('checkin_time')(e.target.value)} placeholder="14:00" /></Field>
              <Field label="Horário de check-out" required><input className="ui-input" value={form.checkout_time || ''} onChange={e => set('checkout_time')(e.target.value)} placeholder="12:00" /></Field>
              <Field label="Café da manhã" required><input className="ui-input" value={form.breakfast_time || ''} onChange={e => set('breakfast_time')(e.target.value)} placeholder="06:30 às 10:00" /></Field>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              <Field label="Wi-Fi (rede e senha)" required help="Enviado apenas a hóspedes com check-in confirmado."><input className="ui-input" value={form.wifi_info || ''} onChange={e => set('wifi_info')(e.target.value)} placeholder="Rede: Hotel_WiFi / Senha: 1234" /></Field>
              <Field label="Contato da recepção" required><input className="ui-input" value={form.reception_contact || ''} onChange={e => set('reception_contact')(e.target.value)} placeholder="+55 65 99999-9999 ou ramal 9" /></Field>
            </div>
            <div className="mt-4">
              <Field label="Regras e informações importantes" help="Escreva em uma ou duas frases curtas."><textarea className="ui-input min-h-[80px]" value={form.rules || ''} onChange={e => set('rules')(e.target.value)} maxLength={1000} placeholder="Silêncio após 22h. Não é permitido fumar nos quartos." /></Field>
            </div>
          </FormSection>

          <Section id="qrcode" title="QR Code do hotel" icon={QrCode} description={`${qrCount} cadastro(s) recebido(s) por este QR Code até hoje`}>
            <QrCodeCard slug={hotel.slug} hotelName={hotel.name} />
          </Section>

          <Section id="whatsapp" title="WhatsApp e integração Meta" icon={MessageCircle}
            actions={<Link href="/automations" className="ui-btn ui-btn-secondary ui-btn-sm">Gerenciar <ArrowRight size={13} /></Link>}>
            {wa?.connected
              ? <div className="flex items-center gap-2 flex-wrap text-sm"><Badge tone="success" dot>Conectado</Badge> {wa.phone} · {wa.approved} de {wa.total} templates aprovados</div>
              : <div className="flex items-center gap-2 flex-wrap text-sm"><Badge tone="danger" dot>Não conectado</Badge><span style={{ color: 'var(--fg2)' }}>Sem conexão, nenhuma mensagem é enviada aos hóspedes. O consumo de mensagens é cobrado pela Meta diretamente do hotel.</span></div>}
          </Section>

          <Section id="automations" title="Mensagens e automações" icon={Zap}
            actions={<Link href="/automations?tab=automations" className="ui-btn ui-btn-secondary ui-btn-sm">Editar textos <ArrowRight size={13} /></Link>}>
            <p className="text-sm" style={{ color: 'var(--fg2)' }}>Boas-vindas (5 min após o cadastro), check-in com informações úteis, acompanhamento opcional durante a estadia e checkout com pesquisa 0–10 + link do Google. Textos editáveis em português, espanhol e inglês.</p>
          </Section>

          <FormSection id="links" icon={Link2} title="Instagram e avaliação no Google" description="Usados no formulário e na mensagem de checkout" incomplete={!checks.links}
            onSave={() => save(['instagram_url', 'google_review_url'])}>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Link do Instagram" help="Botão “Siga nosso Instagram” na tela final do formulário. Sem link, o botão não aparece.">
                <input className="ui-input" type="url" value={form.instagram_url || ''} onChange={e => set('instagram_url')(e.target.value)} placeholder="https://instagram.com/seuhotel" /></Field>
              <Field label="Link direto para avaliação no Google" required help="No Perfil da Empresa no Google: “Pedir avaliações” → copie o link (g.page/r/…).">
                <input className="ui-input" type="url" value={form.google_review_url || ''} onChange={e => set('google_review_url')(e.target.value)} placeholder="https://g.page/r/..." /></Field>
            </div>
          </FormSection>

          <TeamSection toast={toast.show} isOwner={hotel.role === 'owner'} />

          <Section id="plan" title="Assinatura e utilização" icon={CreditCard}>
            {usage?.plan ? (
              <div className="space-y-3 text-sm">
                <div className="flex flex-wrap items-center gap-2"><b>Plano {usage.plan.name}</b>
                  <Badge tone={usage.plan.status === 'active' ? 'success' : usage.plan.status === 'trial' ? 'info' : 'warn'}>{usage.plan.status === 'trial' ? 'Teste grátis' : usage.plan.status === 'active' ? 'Ativo' : usage.plan.status}</Badge>
                  {usage.plan.trial_ends_at && usage.plan.status === 'trial' && <span style={{ color: 'var(--fg3)' }}>até {fmtDate(usage.plan.trial_ends_at)}</span>}
                </div>
                <div>{usage.staysThisMonth} de {usage.plan.stay_limit} estadias usadas neste mês</div>
                <div className="h-2 rounded-full overflow-hidden max-w-md" style={{ background: 'var(--surface-2)' }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, (usage.staysThisMonth / usage.plan.stay_limit) * 100)}%`, background: 'var(--accent-strong)' }} />
                </div>
                <p className="ui-help">A assinatura cobre o software. O envio de mensagens é cobrado pela Meta diretamente do hotel. Para mudar de plano, fale com o suporte Mais Hóspedes.</p>
              </div>
            ) : <p className="text-sm" style={{ color: 'var(--fg3)' }}>Nenhuma assinatura encontrada para este hotel.</p>}
          </Section>

          <FormSection id="prefs" icon={SlidersHorizontal} title="Idioma e aparência" onSave={() => save(['primary_language'])}>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Idioma principal do hotel" help="O formulário abre neste idioma; o hóspede pode trocar entre português, espanhol e inglês.">
                <select className="ui-input" value={form.primary_language || 'pt-BR'} onChange={e => set('primary_language')(e.target.value)}>
                  <option value="pt-BR">Português (Brasil)</option><option value="es">Español</option><option value="en">English</option>
                </select></Field>
              <ThemeField />
            </div>
          </FormSection>
        </div>
      </div>
      {toast.node}
    </div>
  )
}

function Field({ label, help, required, children }: { label: string; help?: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="block">
      <span className="ui-label">{label}{required && <span style={{ color: 'var(--danger)' }}> *</span>}</span>
      {children}
      {help && <span className="ui-help block">{help}</span>}
    </label>
  )
}

function FormSection({ id, icon, title, description, incomplete, onSave, children }: {
  id: string; icon: typeof Info; title: string; description?: string; incomplete?: boolean; onSave: () => Promise<boolean>; children: ReactNode
}) {
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle')
  return (
    <Section id={id} icon={icon} title={title} description={description}
      actions={incomplete ? <Badge tone="warn"><AlertCircle size={11} /> Incompleto</Badge> : undefined}>
      <form onSubmit={async e => { e.preventDefault(); setState('saving'); const ok = await onSave(); setState(ok ? 'saved' : 'idle'); if (ok) setTimeout(() => setState('idle'), 2500) }}>
        {children}
        <div className="flex items-center gap-3 mt-5">
          <button type="submit" className="ui-btn ui-btn-primary" disabled={state === 'saving'}>{state === 'saving' ? 'Salvando…' : 'Salvar'}</button>
          {state === 'saved' && <span className="text-sm inline-flex items-center gap-1" style={{ color: 'var(--success)' }}><Check size={14} /> Salvo</span>}
        </div>
      </form>
    </Section>
  )
}

function ThemeField() {
  const [theme, setTheme] = useTheme()
  return (
    <div>
      <span className="ui-label">Aparência do painel</span>
      <div className="ui-tabs w-fit">
        <button type="button" role="tab" className="ui-tab" aria-selected={theme === 'light'} onClick={() => setTheme('light')}><Sun size={14} /> Claro</button>
        <button type="button" role="tab" className="ui-tab" aria-selected={theme === 'dark'} onClick={() => setTheme('dark')}><Moon size={14} /> Escuro</button>
      </div>
      <span className="ui-help block">Salvo neste navegador. Também disponível no menu lateral.</span>
    </div>
  )
}

function LogoSection({ logoUrl, hotelName, onChange, toast }: { logoUrl: string | null; hotelName: string; onChange: (url: string | null) => Promise<void>; toast: (t: string, tone?: 'success' | 'danger') => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)

  const upload = async (file: File) => {
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { toast('Envie uma imagem PNG, JPG ou WebP.', 'danger'); return }
    if (file.size > 2 * 1024 * 1024) { toast('A imagem deve ter no máximo 2 MB.', 'danger'); return }
    setPreview(URL.createObjectURL(file))
    setBusy(true)
    try {
      const fd = new FormData(); fd.append('file', file)
      const res = await fetch('/api/hotel/logo', { method: 'POST', body: fd })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error)
      await onChange(j.logo_url); toast('Logomarca atualizada.', 'success')
    } catch (e) { toast((e as Error).message || 'Falha no envio', 'danger') } finally { setBusy(false); setPreview(null) }
  }
  const remove = async () => {
    setBusy(true)
    try {
      const res = await fetch('/api/hotel/logo', { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error)
      await onChange(null); toast('Logomarca removida.', 'success')
    } catch (e) { toast((e as Error).message, 'danger') } finally { setBusy(false) }
  }
  const shown = preview || logoUrl

  return (
    <Section id="brand" icon={ImageIcon} title="Identidade visual e logomarca" description="Aparece no topo da primeira etapa do formulário do QR Code"
      actions={!logoUrl ? <Badge tone="warn"><AlertCircle size={11} /> Sem logo</Badge> : undefined}>
      <div className="grid md:grid-cols-2 gap-5 items-start">
        <div className="space-y-3">
          <div className="h-36 rounded-xl flex items-center justify-center p-4" style={{ background: 'repeating-conic-gradient(var(--surface-2) 0% 25%, var(--surface) 0% 50%) 50% / 16px 16px', border: '1px dashed var(--border-strong)' }}>
            {shown
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={shown} alt="Logomarca" className="max-h-full max-w-full object-contain" />
              : <span className="text-sm" style={{ color: 'var(--fg3)' }}>Nenhuma logomarca enviada</span>}
          </div>
          <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = '' }} />
          <div className="flex gap-2 flex-wrap">
            <button className="ui-btn ui-btn-primary" disabled={busy} onClick={() => input.current?.click()}>{busy ? <Spinner size={14} /> : <Upload size={15} />} {logoUrl ? 'Substituir' : 'Enviar logomarca'}</button>
            {logoUrl && <button className="ui-btn ui-btn-danger" disabled={busy} onClick={remove}><Trash2 size={15} /> Remover</button>}
          </div>
          <p className="ui-help">PNG (inclusive transparente), JPG ou WebP, até 2 MB. Ajustamos o tamanho automaticamente, sem distorcer.</p>
        </div>
        <div>
          <span className="ui-label">Prévia no celular do hóspede</span>
          <div className="rounded-2xl p-4 max-w-[280px]" style={{ background: '#050810', border: '1px solid #1e2540' }}>
            <div className="h-14 flex items-center justify-center mb-3">
              {shown
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={shown} alt="" className="max-h-14 max-w-[180px] object-contain" />
                : <span className="text-white font-bold">{hotelName}</span>}
            </div>
            <div className="flex gap-1.5 mb-3">{[1, 2, 3].map(s => <div key={s} className="h-1 flex-1 rounded-full" style={{ background: s === 1 ? '#6366F1' : 'rgba(255,255,255,.12)' }} />)}</div>
            <div className="text-center text-white text-sm font-bold">Bem-vindo!</div>
            <div className="mt-3 space-y-2">{[1, 2].map(i => <div key={i} className="h-8 rounded-lg" style={{ background: 'rgba(255,255,255,.06)' }} />)}</div>
          </div>
        </div>
      </div>
    </Section>
  )
}

type Member = { id: string; user_id: string; role: string; is_active: boolean; users: { email: string; full_name: string | null } | null }

function TeamSection({ toast, isOwner }: { toast: (t: string, tone?: 'success' | 'danger') => void; isOwner: boolean }) {
  const [members, setMembers] = useState<Member[] | null>(null)
  const [me, setMe] = useState('')
  const [adding, setAdding] = useState(false)
  const [f, setF] = useState({ full_name: '', email: '', password: '', role: 'receptionist' })
  const [busy, setBusy] = useState(false)
  const load = useCallback(async () => {
    const j = await fetch('/api/team', { cache: 'no-store' }).then(r => r.json())
    setMembers(j.members || []); setMe(j.me)
  }, [])
  useEffect(() => { load() }, [load])
  const call = async (method: string, body: Record<string, unknown>, ok: string) => {
    setBusy(true)
    try {
      const res = await fetch('/api/team', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const j = await res.json(); if (!res.ok) throw new Error(j.error)
      toast(ok, 'success'); await load(); return true
    } catch (e) { toast((e as Error).message, 'danger'); return false } finally { setBusy(false) }
  }
  const ROLE: Record<string, string> = { owner: 'Proprietário', manager: 'Gerente', receptionist: 'Recepcionista' }

  return (
    <Section id="team" icon={UsersRound} title="Equipe e permissões"
      description="Recepcionistas operam a recepção e os hóspedes; não acessam configurações, relatórios nem cobrança."
      actions={isOwner && <button className="ui-btn ui-btn-secondary ui-btn-sm" onClick={() => setAdding(!adding)}><UserPlus size={14} /> Adicionar</button>}>
      {adding && (
        <form className="ui-subtle p-4 mb-4 grid sm:grid-cols-2 gap-3" onSubmit={async e => { e.preventDefault(); if (await call('POST', f, 'Membro adicionado. Repasse o e-mail e a senha provisória.')) { setAdding(false); setF({ full_name: '', email: '', password: '', role: 'receptionist' }) } }}>
          <Field label="Nome"><input className="ui-input" value={f.full_name} onChange={e => setF({ ...f, full_name: e.target.value })} required /></Field>
          <Field label="E-mail de acesso"><input className="ui-input" type="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} required /></Field>
          <Field label="Senha provisória" help="Mínimo 8 caracteres."><input className="ui-input" type="text" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} minLength={8} required /></Field>
          <Field label="Perfil"><select className="ui-input" value={f.role} onChange={e => setF({ ...f, role: e.target.value })}><option value="receptionist">Recepcionista</option><option value="manager">Gerente</option></select></Field>
          <div className="sm:col-span-2 flex gap-2"><button className="ui-btn ui-btn-primary" disabled={busy}>{busy ? 'Salvando…' : 'Adicionar membro'}</button><button type="button" className="ui-btn ui-btn-ghost" onClick={() => setAdding(false)}>Cancelar</button></div>
        </form>
      )}
      {!members ? <Spinner /> : (
        <div className="overflow-x-auto -mx-4 sm:-mx-5"><table className="ui-table min-w-[520px]">
          <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Status</th>{isOwner && <th></th>}</tr></thead>
          <tbody>{members.map(m => (
            <tr key={m.id}>
              <td className="font-medium">{m.users?.full_name || '—'}{m.user_id === me && <span className="text-xs" style={{ color: 'var(--fg3)' }}> (você)</span>}</td>
              <td style={{ color: 'var(--fg2)' }}>{m.users?.email}</td>
              <td>{isOwner && m.role !== 'owner'
                ? <select className="ui-input !py-1 !w-auto" value={m.role} disabled={busy} onChange={e => call('PATCH', { membership_id: m.id, role: e.target.value }, 'Perfil atualizado.')}><option value="manager">Gerente</option><option value="receptionist">Recepcionista</option></select>
                : ROLE[m.role]}</td>
              <td><Badge tone={m.is_active ? 'success' : 'neutral'}>{m.is_active ? 'Ativo' : 'Desativado'}</Badge></td>
              {isOwner && <td>{m.role !== 'owner' && <button className="ui-btn ui-btn-ghost ui-btn-sm" disabled={busy} onClick={() => call('PATCH', { membership_id: m.id, is_active: !m.is_active }, m.is_active ? 'Acesso removido.' : 'Acesso reativado.')}>{m.is_active ? 'Remover acesso' : 'Reativar'}</button>}</td>}
            </tr>
          ))}</tbody>
        </table></div>
      )}
    </Section>
  )
}
