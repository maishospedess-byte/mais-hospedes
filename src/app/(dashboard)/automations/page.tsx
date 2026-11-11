'use client'

import { Fragment, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  MessageCircle, Link2, Zap, History, Stethoscope, CheckCircle2, AlertTriangle, RefreshCw, Send, Unplug,
  ShieldCheck, Pencil, RotateCcw, Hand, Info, BedDouble, Star, ExternalLink, KeyRound, Smartphone,
  ArrowDownLeft, ArrowUpRight, Circle,
} from 'lucide-react'
import { useHotel, isManager } from '@/hooks/useHotel'
import { usePeriod } from '@/hooks/usePeriod'
import { useHotelRealtime } from '@/hooks/useHotelRealtime'
import { PageHeader, Badge, PageLoading, EmptyState, Section, Switch, useToast, Spinner } from '@/components/ui/kit'
import { PeriodFilter } from '@/components/ui/PeriodFilter'
import { MSG_STATUS, AUTOMATION_LABEL, fmtDateTime, fmtPhone, type Tone } from '@/lib/ui/status'
import { VARIABLES, renderPreview, validateTemplateText, type AutomationType, type TemplateLang, type VariableKey } from '@/lib/automations/definitions'

type Template = { id: string; automation_type: string; language: TemplateLang; status: string; body_text: string; draft_text: string | null; rejection_reason: string | null; template_name: string; submitted_at: string | null }
type WaState = {
  platform: { embeddedSignupAvailable: boolean; appId: string | null; configId: string | null; webhookReady: boolean; webhookUrl: string }
  account: null | { connection_status: string; phone_number: string | null; display_name: string | null; waba_id: string | null; phone_number_id: string | null; connected_at: string | null; quality_rating: string | null; last_error: string | null; connection_method: string | null; last_checked_at: string | null }
  templates: Template[]
  events: { id: string; kind: string; level: string; summary: string; created_at: string }[]
}

const TPL_STATUS: Record<string, { label: string; tone: Tone }> = {
  draft: { label: 'Não enviado à Meta', tone: 'neutral' },
  pending: { label: 'Em análise na Meta', tone: 'warn' },
  in_appeal: { label: 'Em recurso', tone: 'warn' },
  approved: { label: 'Aprovado', tone: 'success' },
  rejected: { label: 'Rejeitado', tone: 'danger' },
  paused: { label: 'Pausado pela Meta', tone: 'danger' },
  disabled: { label: 'Desativado', tone: 'danger' },
  pending_deletion: { label: 'Excluindo', tone: 'neutral' },
}
const LANG_LABEL: Record<TemplateLang, string> = { 'pt-BR': 'Português', es: 'Español', en: 'English' }
const TABS = [
  { key: 'connection', label: 'Conexão', icon: Link2 },
  { key: 'automations', label: 'Automações', icon: Zap },
  { key: 'history', label: 'Histórico de envios', icon: History },
  { key: 'logs', label: 'Diagnóstico', icon: Stethoscope },
] as const

export default function Page() {
  return <Suspense fallback={<PageLoading />}><AutomationsPage /></Suspense>
}

function AutomationsPage() {
  const params = useSearchParams()
  const router = useRouter()
  const { hotel, loading } = useHotel()
  const tab = (params.get('tab') || 'connection') as (typeof TABS)[number]['key']
  const [wa, setWa] = useState<WaState | null>(null)
  const toast = useToast()

  const loadWa = useCallback(async () => {
    const res = await fetch('/api/whatsapp', { cache: 'no-store' })
    if (res.ok) setWa(await res.json())
  }, [])
  useEffect(() => { loadWa() }, [loadWa])

  if (loading || !wa) return <PageLoading />
  if (!hotel) return <EmptyState icon={MessageCircle} title="Nenhum hotel encontrado." />
  const connected = wa.account?.connection_status === 'connected'
  const manager = isManager(hotel.role)

  return (
    <div className="theme-scope">
      <PageHeader icon={MessageCircle} title="WhatsApp e Automações"
        subtitle="Mensagens oficiais enviadas pelo número do próprio hotel, pela API da Meta"
        actions={connected
          ? <Badge tone="success" dot>Conectado · {wa.account?.phone_number || wa.account?.display_name}</Badge>
          : <Badge tone="danger" dot>WhatsApp não conectado</Badge>} />
      <div className="px-4 sm:px-6 pt-4">
        <div className="ui-tabs w-fit max-w-full" role="tablist">
          {TABS.map(t => (
            <button key={t.key} role="tab" aria-selected={tab === t.key} className="ui-tab"
              onClick={() => router.replace(`/automations?tab=${t.key}`)}>
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="px-4 sm:px-6 py-5 max-w-[1200px]">
        {tab === 'connection' && <ConnectionTab wa={wa} reload={loadWa} manager={manager} toast={toast.show} />}
        {tab === 'automations' && <AutomationsTab connected={connected} manager={manager} toast={toast.show} reloadWa={loadWa} hotelId={hotel.id} />}
        {tab === 'history' && <HistoryTab hotelId={hotel.id} />}
        {tab === 'logs' && <LogsTab wa={wa} reload={loadWa} />}
      </div>
      {toast.node}
    </div>
  )
}

async function post(body: Record<string, unknown>) {
  const res = await fetch('/api/whatsapp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Erro')
  return json
}

// ======================= CONEXÃO =======================
declare global {
  interface Window { FB?: { init: (o: Record<string, unknown>) => void; login: (cb: (r: { authResponse?: { code?: string } }) => void, o: Record<string, unknown>) => void }; fbAsyncInit?: () => void }
}

function loadFacebookSdk(appId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.FB) return resolve()
    window.fbAsyncInit = () => {
      window.FB!.init({ appId, autoLogAppEvents: true, xfbml: false, version: 'v23.0' })
      resolve()
    }
    const s = document.createElement('script')
    s.src = 'https://connect.facebook.net/en_US/sdk.js'
    s.async = true; s.defer = true; s.crossOrigin = 'anonymous'
    s.onerror = () => reject(new Error('Não foi possível carregar o SDK da Meta'))
    document.body.appendChild(s)
  })
}

function ConnectionTab({ wa, reload, manager, toast }: { wa: WaState; reload: () => Promise<void>; manager: boolean; toast: (t: string, tone?: Tone) => void }) {
  const [busy, setBusy] = useState<string | null>(null)
  const [testTo, setTestTo] = useState('')
  const [manual, setManual] = useState({ waba_id: '', phone_number_id: '', access_token: '' })
  const [showManual, setShowManual] = useState(false)
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)
  const acc = wa.account
  const connected = acc?.connection_status === 'connected'

  const run = async (key: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(key)
    try { await fn(); toast(ok, 'success'); await reload() } catch (e) { toast(e instanceof Error ? e.message : 'Erro', 'danger'); await reload() } finally { setBusy(null) }
  }

  const embedded = async () => {
    if (!wa.platform.appId || !wa.platform.configId) return
    setBusy('embedded')
    try {
      await loadFacebookSdk(wa.platform.appId)
      const session: { waba_id?: string; phone_number_id?: string } = {}
      const onMsg = (event: MessageEvent) => {
        if (!/facebook\.com$/.test(new URL(event.origin).hostname)) return
        try {
          const d = typeof event.data === 'string' ? JSON.parse(event.data) : event.data
          if (d?.type === 'WA_EMBEDDED_SIGNUP' && d.data) { session.waba_id = d.data.waba_id; session.phone_number_id = d.data.phone_number_id }
        } catch { /* mensagens que não são da Meta */ }
      }
      window.addEventListener('message', onMsg)
      const code = await new Promise<string>((resolve, reject) => {
        window.FB!.login(r => r.authResponse?.code ? resolve(r.authResponse.code) : reject(new Error('Conexão cancelada ou não autorizada na Meta.')), {
          config_id: wa.platform.configId, response_type: 'code', override_default_response_type: true,
          extras: { setup: {}, featureType: '', sessionInfoVersion: '3' },
        })
      })
      for (let i = 0; i < 20 && !session.phone_number_id; i++) await new Promise(r => setTimeout(r, 300))
      window.removeEventListener('message', onMsg)
      if (!session.phone_number_id || !session.waba_id) throw new Error('A Meta não informou o número selecionado. Tente novamente.')
      const r = await post({ action: 'connect_embedded', code, waba_id: session.waba_id, phone_number_id: session.phone_number_id })
      toast(`WhatsApp conectado: ${r.phone?.display_phone_number || ''}. Templates enviados para aprovação.`, 'success')
      await reload()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro na conexão', 'danger')
    } finally { setBusy(null) }
  }

  if (connected) {
    const tplApproved = wa.templates.filter(t => t.status === 'approved').length
    return (
      <div className="space-y-5">
        <Section title="Número conectado" icon={Smartphone} description="As mensagens saem com o nome e o número do seu hotel"
          actions={manager && <button className="ui-btn ui-btn-secondary ui-btn-sm" disabled={!!busy} onClick={() => run('check', () => post({ action: 'check' }), 'Conexão verificada com a Meta.')}>
            {busy === 'check' ? <Spinner size={13} /> : <RefreshCw size={13} />} Verificar conexão</button>}>
          <dl className="grid sm:grid-cols-3 gap-4 text-sm">
            <Info2 label="Nome comercial" value={acc?.display_name || '—'} />
            <Info2 label="Número" value={acc?.phone_number || '—'} />
            <Info2 label="Status" value={<Badge tone="success" dot>Conectado</Badge>} />
            <Info2 label="Qualidade (Meta)" value={acc?.quality_rating || '—'} />
            <Info2 label="Conectado em" value={fmtDateTime(acc?.connected_at)} />
            <Info2 label="Última verificação" value={fmtDateTime(acc?.last_checked_at)} />
          </dl>
        </Section>

        <TemplatesSection templates={wa.templates} manager={manager} busy={busy}
          onSubmit={() => run('submit', async () => {
            const r = await post({ action: 'submit_templates' })
            const fails = (r.results || []).filter((x: { ok: boolean }) => !x.ok)
            if (fails.length) throw new Error(`${fails.length} template(s) não foram aceitos: ${fails[0].error}`)
          }, 'Templates enviados para aprovação da Meta.')}
          onSync={() => run('sync', () => post({ action: 'sync_templates' }), 'Status atualizado com a Meta.')}
          approved={tplApproved} />

        {manager && (
          <Section title="Mensagem de teste" icon={Send} description="Envia um template aprovado para um número autorizado (ex.: o seu celular)">
            <div className="flex flex-wrap gap-2">
              <input className="ui-input max-w-xs" placeholder="+5565999999999" value={testTo} onChange={e => setTestTo(e.target.value.replace(/[^\d+]/g, ''))} />
              <button className="ui-btn ui-btn-wa" disabled={!!busy || !/^\+\d{10,15}$/.test(testTo)}
                onClick={() => run('test', () => post({ action: 'test_send', to: testTo }), 'Mensagem de teste aceita pela Meta. Confira o celular.')}>
                {busy === 'test' ? <Spinner size={13} /> : <Send size={14} />} Enviar teste
              </button>
            </div>
            <p className="ui-help">Usa a boas-vindas em português se já estiver aprovada; senão, o template padrão &quot;hello_world&quot; da Meta.</p>
          </Section>
        )}

        {manager && (
          <div className="ui-subtle p-4 flex flex-wrap items-center gap-3">
            <Unplug size={16} style={{ color: 'var(--danger)' }} />
            <span className="text-sm flex-1">Desconectar interrompe todos os envios automáticos.</span>
            {confirmDisconnect ? (
              <>
                <button className="ui-btn ui-btn-danger ui-btn-sm" disabled={!!busy} onClick={() => run('disc', () => post({ action: 'disconnect' }), 'WhatsApp desconectado.')}>Confirmar desconexão</button>
                <button className="ui-btn ui-btn-ghost ui-btn-sm" onClick={() => setConfirmDisconnect(false)}>Cancelar</button>
              </>
            ) : <button className="ui-btn ui-btn-secondary ui-btn-sm" onClick={() => setConfirmDisconnect(true)}>Desconectar</button>}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {acc?.connection_status === 'error' && (
        <div className="ui-card-flat p-4 text-sm" style={{ borderColor: 'var(--danger)', background: 'var(--danger-bg)' }}>
          <b>A conexão anterior falhou:</b> {acc.last_error}. Conecte novamente.
        </div>
      )}
      <Section title="Conectar o WhatsApp do hotel" icon={MessageCircle}
        description="Use o número oficial do seu hotel. A Mais Hóspedes não aparece como remetente.">
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-3 text-sm" style={{ color: 'var(--fg2)' }}>
            <p className="font-semibold" style={{ color: 'var(--fg)' }}>Antes de conectar, tenha em mãos:</p>
            <ul className="space-y-2">
              {[
                'Acesso de administrador ao Meta Business (business.facebook.com) da empresa do hotel.',
                'Um número de telefone que receba SMS ou ligação para o código de verificação.',
                'Se o número já está no app WhatsApp Business, ele precisa ser migrado ou desvinculado do app (podemos ajudar).',
                'Forma de pagamento cadastrada na Meta: o consumo de mensagens é cobrado pela Meta diretamente do hotel.',
                'Recomendado: verificação da empresa na Meta (aumenta limites de envio).',
              ].map(t => <li key={t} className="flex gap-2"><Circle size={7} className="mt-1.5 shrink-0" fill="currentColor" /> <span>{t}</span></li>)}
            </ul>
          </div>
          <div className="ui-subtle p-4 space-y-3">
            {wa.platform.embeddedSignupAvailable ? (
              <>
                <p className="text-sm" style={{ color: 'var(--fg2)' }}>Uma janela da Meta vai abrir. Escolha a empresa, o número e autorize. Ao final, voltamos aqui e enviamos os textos das automações para aprovação.</p>
                <button className="ui-btn ui-btn-wa w-full !py-3" disabled={!manager || !!busy} onClick={embedded}>
                  {busy === 'embedded' ? <><Spinner size={14} /> Aguardando a Meta…</> : <><MessageCircle size={16} /> Conectar meu WhatsApp</>}
                </button>
                {!manager && <p className="ui-help">Somente o proprietário ou gerente pode conectar.</p>}
              </>
            ) : (
              <>
                <button className="ui-btn ui-btn-wa w-full !py-3" disabled><MessageCircle size={16} /> Conectar meu WhatsApp</button>
                <p className="text-[13px]" style={{ color: 'var(--warn)' }}>
                  A conexão automática pela Meta (Embedded Signup) ainda não está habilitada nesta instalação: falta configurar o aplicativo da Mais Hóspedes na Meta. Enquanto isso, use a conexão manual abaixo.
                </p>
              </>
            )}
          </div>
        </div>
      </Section>

      {manager && (
        <Section title="Conexão manual (avançado)" icon={KeyRound}
          description="Para quem já tem um app na Meta com a WhatsApp Cloud API. Só marcamos como conectado se a Meta validar os dados."
          actions={<button className="ui-btn ui-btn-secondary ui-btn-sm" onClick={() => setShowManual(!showManual)}>{showManual ? 'Ocultar' : 'Mostrar'}</button>}>
          {showManual ? (
            <div className="space-y-3 max-w-xl">
              <ol className="text-[13px] space-y-1 list-decimal pl-5" style={{ color: 'var(--fg2)' }}>
                <li>No painel do app da Meta (developers.facebook.com) abra <b>WhatsApp → Configuração da API</b>.</li>
                <li>Copie o <b>ID da conta do WhatsApp Business</b> e o <b>ID do número de telefone</b>.</li>
                <li>Em <b>Configurações do negócio → Usuários do sistema</b>, gere um token permanente com as permissões <span className="ui-kbd">whatsapp_business_messaging</span> e <span className="ui-kbd">whatsapp_business_management</span>.</li>
              </ol>
              <label className="block"><span className="ui-label">ID da conta WhatsApp Business (WABA ID)</span>
                <input className="ui-input" inputMode="numeric" value={manual.waba_id} onChange={e => setManual({ ...manual, waba_id: e.target.value.trim() })} /></label>
              <label className="block"><span className="ui-label">ID do número de telefone (Phone number ID)</span>
                <input className="ui-input" inputMode="numeric" value={manual.phone_number_id} onChange={e => setManual({ ...manual, phone_number_id: e.target.value.trim() })} /></label>
              <label className="block"><span className="ui-label">Token de acesso permanente</span>
                <input className="ui-input" type="password" autoComplete="off" value={manual.access_token} onChange={e => setManual({ ...manual, access_token: e.target.value.trim() })} />
                <span className="ui-help">Fica criptografado no servidor e nunca é exibido novamente.</span></label>
              <button className="ui-btn ui-btn-primary" disabled={!!busy || !manual.waba_id || !manual.phone_number_id || manual.access_token.length < 20}
                onClick={() => run('manual', async () => { await post({ action: 'connect_manual', ...manual }); setManual({ waba_id: '', phone_number_id: '', access_token: '' }) }, 'WhatsApp conectado e validado pela Meta.')}>
                {busy === 'manual' ? <><Spinner size={14} /> Validando com a Meta…</> : <><ShieldCheck size={15} /> Validar e conectar</>}
              </button>
            </div>
          ) : <p className="text-sm" style={{ color: 'var(--fg3)' }}>Use apenas se orientado pelo suporte.</p>}
        </Section>
      )}

      <TemplatesSection templates={wa.templates} manager={false} busy={null} onSubmit={() => {}} onSync={() => {}} approved={0} disconnected />
    </div>
  )
}

function Info2({ label, value }: { label: string; value: React.ReactNode }) {
  return <div><dt className="text-xs" style={{ color: 'var(--fg3)' }}>{label}</dt><dd className="font-medium mt-0.5">{value}</dd></div>
}

function TemplatesSection({ templates, manager, busy, onSubmit, onSync, approved, disconnected }: {
  templates: Template[]; manager: boolean; busy: string | null; onSubmit: () => void; onSync: () => void; approved: number; disconnected?: boolean
}) {
  const types: AutomationType[] = ['welcome', 'checkin_info', 'during_stay', 'checkout_survey']
  const langs: TemplateLang[] = ['pt-BR', 'es', 'en']
  const drafts = templates.filter(t => t.status === 'draft' || t.draft_text !== null || t.status === 'rejected').length
  return (
    <Section title="Templates oficiais" icon={ShieldCheck}
      description={disconnected ? 'Os textos ficam prontos aqui e são enviados para aprovação da Meta assim que o WhatsApp for conectado.' : `${approved} de ${templates.length} aprovados. Mensagens só são enviadas com template aprovado.`}
      actions={manager && !disconnected && (
        <>
          <button className="ui-btn ui-btn-secondary ui-btn-sm" disabled={!!busy} onClick={onSync}>{busy === 'sync' ? <Spinner size={13} /> : <RefreshCw size={13} />} Atualizar status</button>
          <button className="ui-btn ui-btn-primary ui-btn-sm" disabled={!!busy || drafts === 0} onClick={onSubmit} title={drafts === 0 ? 'Nada pendente de envio' : ''}>
            {busy === 'submit' ? <Spinner size={13} /> : <Send size={13} />} Enviar {drafts || ''} para aprovação
          </button>
        </>
      )}>
      <div className="overflow-x-auto -mx-4 sm:-mx-5">
        <table className="ui-table min-w-[620px]">
          <thead><tr><th>Automação</th>{langs.map(l => <th key={l}>{LANG_LABEL[l]}</th>)}</tr></thead>
          <tbody>
            {types.map(type => (
              <tr key={type}>
                <td className="font-medium">{AUTOMATION_LABEL[type]}</td>
                {langs.map(l => {
                  const t = templates.find(x => x.automation_type === type && x.language === l)
                  const st = TPL_STATUS[t?.status || 'draft'] || { label: t?.status || '-', tone: 'neutral' as Tone }
                  return (
                    <td key={l}>
                      <div className="flex flex-col gap-1 items-start">
                        <Badge tone={st.tone}>{st.label}</Badge>
                        {t?.draft_text && t.status !== 'draft' && <span className="text-[11px]" style={{ color: 'var(--warn)' }}>texto editado, reenviar</span>}
                        {t?.rejection_reason && <span className="text-[11px]" style={{ color: 'var(--danger)' }}>{t.rejection_reason}</span>}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  )
}

// ======================= AUTOMAÇÕES =======================
type Card = {
  type: AutomationType; title: string; objective: string; trigger: string; mandatory: boolean; enabled: boolean
  allowedVars: VariableKey[]; requiredVars: VariableKey[]; defaults: Record<TemplateLang, string>
  templates: Template[]
  stats: { total: number; scheduled: number; sent: number; delivered: number; read: number; failed: number; cancelled: number }
  recent: { id: string; status: string; created_at: string; sent_at: string | null; failure_reason: string | null; trigger_source: string | null; guest_profiles: { full_name: string } | null }[]
}
const ICONS: Record<AutomationType, typeof Hand> = { welcome: Hand, checkin_info: Info, during_stay: BedDouble, checkout_survey: Star }

function AutomationsTab({ connected, manager, toast, reloadWa, hotelId }: { connected: boolean; manager: boolean; toast: (t: string, tone?: Tone) => void; reloadWa: () => Promise<void>; hotelId: string }) {
  const [data, setData] = useState<{ cards: Card[]; canEdit: boolean; hotel: Record<string, string | null> } | null>(null)
  const load = useCallback(async () => {
    const res = await fetch('/api/automations', { cache: 'no-store' })
    if (res.ok) setData(await res.json())
  }, [])
  useEffect(() => { load() }, [load])
  useHotelRealtime(hotelId, (e) => { if (e.table === 'messages') load() }, ['messages'])
  if (!data) return <PageLoading />

  const values: Record<string, string> = {
    nome_hospede: 'Maria', nome_hotel: data.hotel.name || '', cafe_da_manha: data.hotel.breakfast_time || '—',
    wifi: data.hotel.wifi_info || '—', horario_checkin: data.hotel.checkin_time || '—', horario_checkout: data.hotel.checkout_time || '—',
    contato_recepcao: data.hotel.reception_contact || data.hotel.whatsapp_number || '—', regras: data.hotel.rules || '—',
    link_google: data.hotel.google_review_url ? 'https://mais-hospedes.vercel.app/r/…' : '(configure o link do Google)',
  }
  const pendingDrafts = data.cards.flatMap(c => c.templates).filter(t => t.draft_text !== null || t.status === 'draft' || t.status === 'rejected').length

  return (
    <div className="space-y-4">
      <div className="ui-subtle p-4 text-[13px] flex gap-3" style={{ color: 'var(--fg2)' }}>
        <Info size={16} className="shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
        <div>
          Os fluxos são prontos e seguem as regras da Meta: você pode <b>editar os textos</b> (nos 3 idiomas) e <b>ligar/desligar</b> o fluxo opcional, mas não alterar a ordem ou os gatilhos.
          O hóspede recebe a mensagem no idioma que escolheu no formulário. Toda alteração de texto precisa de nova aprovação da Meta antes de valer.
          {!connected && <> <b style={{ color: 'var(--danger)' }}>Sem WhatsApp conectado, nenhuma automação é enviada.</b></>}
        </div>
      </div>
      {connected && manager && pendingDrafts > 0 && (
        <div className="ui-card-flat p-3 flex flex-wrap items-center gap-3" style={{ borderColor: 'var(--warn)' }}>
          <AlertTriangle size={16} style={{ color: 'var(--warn)' }} />
          <span className="text-sm flex-1">{pendingDrafts} texto(s) aguardando envio para aprovação da Meta.</span>
          <button className="ui-btn ui-btn-primary ui-btn-sm" onClick={async () => {
            try { const r = await post({ action: 'submit_templates' }); const f = (r.results || []).filter((x: { ok: boolean }) => !x.ok); toast(f.length ? `Alguns não foram aceitos: ${f[0].error}` : 'Enviado para aprovação.', f.length ? 'warn' : 'success') } catch (e) { toast(String((e as Error).message), 'danger') }
            await load(); await reloadWa()
          }}><Send size={13} /> Enviar para aprovação</button>
        </div>
      )}
      {data.cards.map(card => <AutomationCard key={card.type} card={card} values={values} canEdit={data.canEdit} reload={load} toast={toast} />)}

      <div className="ui-card-flat p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--success-bg)' }}><ExternalLink size={18} style={{ color: 'var(--success)' }} /></div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap"><h3 className="font-bold">Convite de avaliação no Google</h3><Badge tone="success">Sempre ativo</Badge></div>
            <p className="text-[13px] mt-1" style={{ color: 'var(--fg2)' }}>
              Enviado para <b>todos</b> os hóspedes, independentemente da nota, dentro da mesma mensagem de checkout (sem filtrar por satisfação, conforme as regras do Google).
              Cada link é rastreado: o painel mostra os <b>cliques</b> — o clique não comprova que a avaliação foi publicada.
            </p>
            <p className="text-[13px] mt-2">Link configurado: {values.link_google.startsWith('(') ? <a href="/settings#links" className="underline" style={{ color: 'var(--danger)' }}>não configurado — configurar</a> : <span style={{ color: 'var(--success)' }}>sim</span>}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function AutomationCard({ card, values, canEdit, reload, toast }: { card: Card; values: Record<string, string>; canEdit: boolean; reload: () => Promise<void>; toast: (t: string, tone?: Tone) => void }) {
  const [lang, setLang] = useState<TemplateLang>('pt-BR')
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const tpl = card.templates.find(t => t.language === lang)
  const current = tpl ? (tpl.draft_text ?? tpl.body_text) : card.defaults[lang]
  const errors = useMemo(() => editing ? validateTemplateText(card.type, text) : [], [editing, text, card.type])
  const Icon = ICONS[card.type]
  const st = TPL_STATUS[tpl?.status || 'draft']

  const save = async (body: Record<string, unknown>, ok: string) => {
    setSaving(true)
    try {
      const res = await fetch('/api/automations', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: card.type, ...body }) })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error)
      toast(j.needsApproval ? `${ok} Envie para aprovação da Meta para passar a valer.` : ok, 'success')
      setEditing(false)
      await reload()
    } catch (e) { toast((e as Error).message, 'danger') } finally { setSaving(false) }
  }

  return (
    <div className="ui-card-flat p-4 sm:p-5">
      <div className="flex flex-wrap items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--accent-bg)' }}><Icon size={18} style={{ color: 'var(--accent)' }} /></div>
        <div className="flex-1 min-w-[220px]">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold">{card.title}</h3>
            {card.mandatory ? <Badge tone="accent">Obrigatório · sempre ativo</Badge> : <Badge tone={card.enabled ? 'success' : 'neutral'}>{card.enabled ? 'Ativo' : 'Desativado'}</Badge>}
          </div>
          <p className="text-[13px] mt-1" style={{ color: 'var(--fg2)' }}><b>Objetivo:</b> {card.objective}</p>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--fg2)' }}><b>Quando é enviada:</b> {card.trigger}</p>
        </div>
        {!card.mandatory && (
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--fg3)' }}>{card.enabled ? 'Ligado' : 'Desligado'}</span>
            <Switch checked={card.enabled} disabled={!canEdit || saving} label={`Ativar ${card.title}`} onChange={v => save({ enabled: v }, v ? 'Automação ativada.' : 'Automação desativada.')} />
          </div>
        )}
      </div>

      <div className="mt-4 grid lg:grid-cols-[1fr_260px] gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <div className="ui-tabs !p-0.5">
              {(['pt-BR', 'es', 'en'] as TemplateLang[]).map(l => (
                <button key={l} role="tab" className="ui-tab !py-1 !text-xs" aria-selected={lang === l} onClick={() => { setLang(l); setEditing(false) }}>{LANG_LABEL[l]}</button>
              ))}
            </div>
            <Badge tone={st?.tone || 'neutral'}>Template: {st?.label || tpl?.status}</Badge>
            {tpl?.draft_text && tpl.status !== 'draft' && <Badge tone="warn">Texto editado — aguardando envio</Badge>}
          </div>
          {!editing ? (
            <>
              <div className="rounded-xl p-3.5 text-[13.5px] whitespace-pre-wrap" style={{ background: 'var(--success-bg)', border: '1px solid var(--border)', lineHeight: 1.55 }}>
                {renderPreview(current, values)}
              </div>
              <p className="ui-help">Prévia com os dados do seu hotel (o nome do hóspede é ilustrativo).</p>
              {canEdit && (
                <div className="flex gap-2 mt-2">
                  <button className="ui-btn ui-btn-secondary ui-btn-sm" onClick={() => { setText(current); setEditing(true) }}><Pencil size={13} /> Editar texto</button>
                  {current !== card.defaults[lang] && <button className="ui-btn ui-btn-ghost ui-btn-sm" disabled={saving} onClick={() => save({ language: lang, reset: true }, 'Texto padrão restaurado.')}><RotateCcw size={13} /> Restaurar padrão</button>}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-2">
              <textarea className="ui-input min-h-[150px] font-[inherit]" value={text} onChange={e => setText(e.target.value)} maxLength={1000} />
              <div className="flex flex-wrap gap-1.5">
                <span className="text-xs mr-1" style={{ color: 'var(--fg3)' }}>Inserir variável:</span>
                {card.allowedVars.map(v => (
                  <button key={v} type="button" className="ui-btn ui-btn-secondary ui-btn-sm !py-0.5 !text-[11.5px]" onClick={() => setText(t => `${t}{${v}}`)} title={VARIABLES[v].label}>
                    {VARIABLES[v].label}{card.requiredVars.includes(v) ? ' *' : ''}
                  </button>
                ))}
              </div>
              {errors.length > 0 && <ul className="text-xs space-y-0.5" style={{ color: 'var(--danger)' }}>{errors.map(e => <li key={e}>• {e}</li>)}</ul>}
              <div className="rounded-xl p-3 text-[13px] whitespace-pre-wrap" style={{ background: 'var(--surface-2)', border: '1px dashed var(--border-strong)' }}>{renderPreview(text, values)}</div>
              <div className="flex gap-2">
                <button className="ui-btn ui-btn-primary ui-btn-sm" disabled={saving || errors.length > 0} onClick={() => save({ language: lang, text }, 'Texto salvo.')}>{saving ? 'Salvando…' : 'Salvar texto'}</button>
                <button className="ui-btn ui-btn-ghost ui-btn-sm" onClick={() => setEditing(false)}>Cancelar</button>
              </div>
            </div>
          )}
        </div>
        <div className="ui-subtle p-3 text-[13px] space-y-1.5 self-start">
          <div className="font-semibold mb-1">Últimos 30 dias</div>
          <Row k="Programadas / enviando" v={card.stats.scheduled} />
          <Row k="Enviadas" v={card.stats.sent + card.stats.delivered + card.stats.read} />
          <Row k="Entregues" v={card.stats.delivered + card.stats.read} />
          <Row k="Lidas" v={card.stats.read} />
          <Row k="Falhas" v={card.stats.failed} danger />
          <Row k="Canceladas" v={card.stats.cancelled} />
          <button className="ui-btn ui-btn-ghost ui-btn-sm w-full mt-1" onClick={() => setShowHistory(!showHistory)}>{showHistory ? 'Ocultar execuções' : 'Ver últimas execuções'}</button>
        </div>
      </div>
      {showHistory && (
        <div className="mt-3">
          {card.recent.length === 0 ? <p className="text-sm" style={{ color: 'var(--fg3)' }}>Nenhuma execução nos últimos 30 dias.</p> : (
            <div className="overflow-x-auto"><table className="ui-table min-w-[520px]">
              <thead><tr><th>Hóspede</th><th>Quando</th><th>Status</th><th>Detalhe</th></tr></thead>
              <tbody>{card.recent.map(m => (
                <tr key={m.id}>
                  <td>{m.guest_profiles?.full_name || '-'}</td>
                  <td style={{ color: 'var(--fg2)' }}>{fmtDateTime(m.sent_at || m.created_at)}</td>
                  <td><Badge tone={MSG_STATUS[m.status]?.tone || 'neutral'}>{MSG_STATUS[m.status]?.label || m.status}</Badge></td>
                  <td className="text-xs" style={{ color: m.status === 'failed' ? 'var(--danger)' : 'var(--fg3)' }}>{m.failure_reason || (m.trigger_source === 'manual' ? 'Enviada manualmente' : '')}</td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </div>
      )}
    </div>
  )
}
function Row({ k, v, danger }: { k: string; v: number; danger?: boolean }) {
  return <div className="flex justify-between"><span style={{ color: 'var(--fg3)' }}>{k}</span><b style={{ color: danger && v ? 'var(--danger)' : undefined }}>{v}</b></div>
}

// ======================= HISTÓRICO =======================
type HMsg = { id: string; direction: string; automation_type: string | null; status: string; content: string | null; recipient: string | null; scheduled_for: string | null; sent_at: string | null; delivered_at: string | null; read_at: string | null; failed_at: string | null; failure_reason: string | null; created_at: string; trigger_source: string | null; attempts: number; guest_profiles: { full_name: string; whatsapp_number: string } | null }

function HistoryTab({ hotelId }: { hotelId: string }) {
  const params = useSearchParams()
  const { period, setPeriod, range } = usePeriod()
  const [type, setType] = useState('all')
  const [status, setStatus] = useState(params.get('status') || 'all')
  const [direction, setDirection] = useState('all')
  const [rows, setRows] = useState<HMsg[] | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const load = useCallback(async () => {
    const qs = new URLSearchParams({ from: range.from, to: range.to, type, status, direction })
    const res = await fetch(`/api/messages?${qs}`, { cache: 'no-store' })
    const j = await res.json()
    setRows(j.messages || [])
  }, [range.from, range.to, type, status, direction])
  useEffect(() => { load() }, [load])
  useHotelRealtime(hotelId, (e) => { if (e.table === 'messages') load() }, ['messages'])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <PeriodFilter value={period} onChange={setPeriod} />
        <select className="ui-input !w-auto" value={type} onChange={e => setType(e.target.value)}>
          <option value="all">Todas as automações</option>
          {['welcome', 'checkin_info', 'during_stay', 'checkout_survey', 'test'].map(t => <option key={t} value={t}>{AUTOMATION_LABEL[t]}</option>)}
        </select>
        <select className="ui-input !w-auto" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="all">Todos os status</option>
          <option value="pending">Programadas / enviando</option>
          <option value="sent">Enviadas</option>
          <option value="delivered">Entregues</option>
          <option value="read">Lidas</option>
          <option value="failed">Falhas</option>
          <option value="cancelled">Canceladas</option>
        </select>
        <select className="ui-input !w-auto" value={direction} onChange={e => setDirection(e.target.value)}>
          <option value="all">Enviadas e recebidas</option>
          <option value="outbound">Só enviadas</option>
          <option value="inbound">Só respostas recebidas</option>
        </select>
      </div>
      <div className="ui-card-flat">
        {!rows ? <PageLoading /> : rows.length === 0 ? <EmptyState icon={History} title="Nenhuma mensagem no período" text="As mensagens programadas, enviadas e as respostas dos hóspedes aparecem aqui." /> : (
          <div className="overflow-x-auto"><table className="ui-table min-w-[760px]">
            <thead><tr><th></th><th>Data</th><th>Hóspede</th><th>Mensagem</th><th>Status</th><th>Detalhe</th></tr></thead>
            <tbody>{rows.map(m => (
              <Fragment key={m.id}>
                <tr className="ui-row-click" onClick={() => setOpen(open === m.id ? null : m.id)}>
                  <td>{m.direction === 'inbound' ? <ArrowDownLeft size={15} style={{ color: 'var(--info)' }} /> : <ArrowUpRight size={15} style={{ color: 'var(--accent)' }} />}</td>
                  <td style={{ color: 'var(--fg2)' }} className="whitespace-nowrap">{fmtDateTime(m.sent_at || m.scheduled_for || m.created_at)}</td>
                  <td><div className="font-medium">{m.guest_profiles?.full_name || (m.trigger_source === 'test' ? 'Teste' : '-')}</div><div className="text-xs" style={{ color: 'var(--fg3)' }}>{fmtPhone(m.guest_profiles?.whatsapp_number || m.recipient)}</div></td>
                  <td>{m.direction === 'inbound' ? <span className="text-[13px]">Resposta: “{(m.content || '').slice(0, 60)}”</span> : (AUTOMATION_LABEL[m.automation_type || ''] || m.automation_type)}</td>
                  <td>{m.direction === 'inbound' ? <Badge tone="info">Recebida</Badge> : <Badge tone={MSG_STATUS[m.status]?.tone || 'neutral'}>{MSG_STATUS[m.status]?.label || m.status}</Badge>}</td>
                  <td className="text-xs max-w-[280px]" style={{ color: m.status === 'failed' ? 'var(--danger)' : 'var(--fg3)' }}>{m.failure_reason || (m.trigger_source === 'manual' ? 'Disparo manual' : m.trigger_source === 'test' ? 'Teste' : '')}</td>
                </tr>
                {open === m.id && (
                  <tr><td colSpan={6} style={{ background: 'var(--surface-2)' }}>
                    <div className="grid sm:grid-cols-2 gap-3 text-[13px]">
                      <div className="whitespace-pre-wrap">{m.content || <span style={{ color: 'var(--fg3)' }}>Conteúdo registrado após o envio.</span>}</div>
                      <dl className="space-y-1 text-xs" style={{ color: 'var(--fg2)' }}>
                        <div>Programada: {fmtDateTime(m.scheduled_for)}</div><div>Enviada: {fmtDateTime(m.sent_at)}</div>
                        <div>Entregue: {fmtDateTime(m.delivered_at)}</div><div>Lida: {fmtDateTime(m.read_at)}</div>
                        <div>Falha: {fmtDateTime(m.failed_at)}</div><div>Tentativas: {m.attempts}</div>
                      </dl>
                    </div>
                  </td></tr>
                )}
              </Fragment>
            ))}</tbody>
          </table></div>
        )}
      </div>
    </div>
  )
}

// ======================= DIAGNÓSTICO =======================
function LogsTab({ wa, reload }: { wa: WaState; reload: () => Promise<void> }) {
  const checks = [
    { ok: wa.account?.connection_status === 'connected', label: 'Número do hotel conectado à WhatsApp Cloud API' },
    { ok: wa.templates.some(t => t.status === 'approved'), label: 'Pelo menos um template aprovado pela Meta' },
    { ok: wa.platform.webhookReady, label: 'Webhook configurado na plataforma (status de entrega e respostas)' },
    { ok: wa.platform.embeddedSignupAvailable, label: 'Conexão automática (Embedded Signup) habilitada' },
  ]
  return (
    <div className="space-y-5">
      <Section title="Verificações" icon={Stethoscope}>
        <ul className="space-y-2 text-sm">
          {checks.map(c => <li key={c.label} className="flex items-center gap-2">{c.ok ? <CheckCircle2 size={16} style={{ color: 'var(--success)' }} /> : <AlertTriangle size={16} style={{ color: 'var(--warn)' }} />}{c.label}</li>)}
        </ul>
        <p className="ui-help mt-3">URL do webhook para cadastrar no app da Meta: <span className="ui-kbd">{wa.platform.webhookUrl}</span></p>
      </Section>
      <Section title="Eventos técnicos" icon={History} description="Envios, falhas, webhooks e conexões (últimos 80)"
        actions={<button className="ui-btn ui-btn-secondary ui-btn-sm" onClick={reload}><RefreshCw size={13} /> Atualizar</button>}>
        {wa.events.length === 0 ? <EmptyState icon={Stethoscope} title="Nenhum evento registrado ainda" /> : (
          <ul className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {wa.events.map(e => (
              <li key={e.id} className="py-2 flex items-start gap-3 text-[13px] ui-divider">
                <Badge tone={e.level === 'error' ? 'danger' : e.level === 'warn' ? 'warn' : 'neutral'}>{e.kind}</Badge>
                <span className="flex-1">{e.summary}</span>
                <span className="text-xs whitespace-nowrap" style={{ color: 'var(--fg3)' }}>{fmtDateTime(e.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  )
}
