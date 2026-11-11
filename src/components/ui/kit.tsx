'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight, Loader2, Minus, X, Moon, Sun, type LucideIcon } from 'lucide-react'
import type { Tone } from '@/lib/ui/status'

export function PageHeader({ icon: Icon, title, subtitle, actions }: {
  icon: LucideIcon; title: string; subtitle?: ReactNode; actions?: ReactNode
}) {
  return (
    <div className="px-4 sm:px-6 py-4 sm:py-5 flex flex-wrap items-start justify-between gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="min-w-0">
        <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2">
          <Icon size={21} className="shrink-0" style={{ color: 'var(--accent)' }} />
          {title}
        </h1>
        {subtitle && <p className="text-sm mt-0.5" style={{ color: 'var(--fg3)' }}>{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Badge({ tone = 'neutral', children, dot }: { tone?: Tone; children: ReactNode; dot?: boolean }) {
  return (
    <span className="ui-badge" style={{ background: `var(--${tone}-bg)`, color: `var(--${tone})` }}>
      {dot && <span className="w-1.5 h-1.5 rounded-full" style={{ background: `var(--${tone})` }} />}
      {children}
    </span>
  )
}

export function Spinner({ size = 16 }: { size?: number }) {
  return <Loader2 size={size} className="animate-spin" style={{ color: 'var(--fg3)' }} />
}

export function PageLoading() {
  return <div className="flex items-center justify-center h-64"><Spinner size={26} /></div>
}

export function EmptyState({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text?: ReactNode; action?: ReactNode }) {
  return (
    <div className="text-center py-10 px-4">
      <div className="w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-bg)' }}>
        <Icon size={22} style={{ color: 'var(--accent)' }} />
      </div>
      <p className="font-semibold text-sm">{title}</p>
      {text && <p className="text-sm mt-1 max-w-md mx-auto" style={{ color: 'var(--fg3)' }}>{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Delta({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return <span className="text-xs" style={{ color: 'var(--fg3)' }}>sem variação</span>
  if (previous === 0) return <span className="text-xs inline-flex items-center gap-0.5" style={{ color: 'var(--fg3)' }}>sem base anterior</span>
  const pct = Math.round(((current - previous) / previous) * 100)
  const tone = pct > 0 ? 'success' : pct < 0 ? 'danger' : 'neutral'
  const Icon = pct > 0 ? ArrowUpRight : pct < 0 ? ArrowDownRight : Minus
  return (
    <span className="text-xs font-semibold inline-flex items-center gap-0.5" style={{ color: `var(--${tone})` }} title={`Período anterior: ${previous}`}>
      <Icon size={13} />{pct > 0 ? '+' : ''}{pct}% vs. período anterior
    </span>
  )
}

export function StatCard({ icon: Icon, label, value, hint, tone = 'accent', href, delta }: {
  icon: LucideIcon; label: string; value: ReactNode; hint?: ReactNode; tone?: Tone; href?: string; delta?: ReactNode
}) {
  const inner = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--fg3)' }}>{label}</span>
        <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `var(--${tone}-bg)` }}>
          <Icon size={16} style={{ color: `var(--${tone})` }} />
        </span>
      </div>
      <div className="text-2xl font-extrabold mt-1.5" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{value}</div>
      {delta && <div className="mt-1">{delta}</div>}
      {hint && <div className="text-xs mt-1" style={{ color: 'var(--fg3)' }}>{hint}</div>}
    </>
  )
  return href
    ? <a href={href} className="ui-card-flat p-4 block transition-colors hover:border-[var(--border-strong)]">{inner}</a>
    : <div className="ui-card-flat p-4">{inner}</div>
}

export function Section({ title, description, actions, children, icon: Icon, id }: {
  title: string; description?: ReactNode; actions?: ReactNode; children: ReactNode; icon?: LucideIcon; id?: string
}) {
  return (
    <section id={id} className="ui-card-flat scroll-mt-20">
      <div className="px-4 sm:px-5 py-3.5 flex flex-wrap items-start justify-between gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold flex items-center gap-2">
            {Icon && <Icon size={16} style={{ color: 'var(--accent)' }} />}{title}
          </h2>
          {description && <p className="text-[13px] mt-0.5" style={{ color: 'var(--fg3)' }}>{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  )
}

export function Drawer({ open, onClose, title, children, width = 560 }: {
  open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; width?: number
}) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0" style={{ background: 'var(--overlay)' }} onClick={onClose} />
      <div className="absolute right-0 top-0 bottom-0 w-full flex flex-col" style={{ maxWidth: width, background: 'var(--bg)', borderLeft: '1px solid var(--border)' }}>
        <div className="px-5 py-4 flex items-center justify-between gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="font-bold min-w-0 truncate">{title}</div>
          <button className="ui-btn ui-btn-ghost ui-btn-sm" onClick={onClose} aria-label="Fechar"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  )
}

/** Aviso temporário no canto da tela */
export function useToast() {
  const [toast, setToast] = useState<{ text: string; tone: Tone } | null>(null)
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), toast.tone === 'danger' ? 7000 : 3500)
    return () => clearTimeout(t)
  }, [toast])
  const node = toast ? (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-[80] sm:max-w-sm">
      <div className="ui-card px-4 py-3 text-sm flex items-start gap-2" style={{ borderColor: `var(--${toast.tone})` }}>
        <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: `var(--${toast.tone})` }} />
        <span className="flex-1">{toast.text}</span>
        <button onClick={() => setToast(null)} aria-label="Fechar" style={{ color: 'var(--fg3)' }}><X size={14} /></button>
      </div>
    </div>
  ) : null
  return { show: (text: string, tone: Tone = 'success') => setToast({ text, tone }), node }
}

// ---------------- tema ----------------
export type Theme = 'light' | 'dark'
export function getTheme(): Theme {
  if (typeof document === 'undefined') return 'dark'
  return document.documentElement.getAttribute('data-app-theme') === 'light' ? 'light' : 'dark'
}
export function setTheme(t: Theme) {
  document.documentElement.setAttribute('data-app-theme', t)
  try { localStorage.setItem('mh-theme', t) } catch { /* armazenamento indisponível */ }
  window.dispatchEvent(new CustomEvent('mh-theme', { detail: t }))
}
export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, set] = useState<Theme>('dark')
  useEffect(() => {
    set(getTheme())
    const h = (e: Event) => set((e as CustomEvent).detail)
    window.addEventListener('mh-theme', h)
    return () => window.removeEventListener('mh-theme', h)
  }, [])
  return [theme, setTheme]
}

export function ThemeToggle({ compact }: { compact?: boolean }) {
  const [theme, change] = useTheme()
  const next = theme === 'dark' ? 'light' : 'dark'
  return (
    <button
      type="button"
      onClick={() => change(next)}
      className={`ui-btn ui-btn-ghost ${compact ? 'ui-btn-sm' : ''}`}
      title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
      aria-label="Alternar tema"
    >
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
      {!compact && (theme === 'dark' ? 'Tema claro' : 'Tema escuro')}
    </button>
  )
}

export function Switch({ checked, onChange, disabled, label }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled}
      className="ui-switch" onClick={() => onChange(!checked)} />
  )
}
