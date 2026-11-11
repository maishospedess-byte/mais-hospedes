'use client'

import { useEffect, useMemo, useState } from 'react'

export type PeriodKey = 'today' | '7d' | '30d' | '60d' | 'custom'
export type PeriodState = { key: PeriodKey; customFrom?: string; customTo?: string }

export const PERIOD_LABEL: Record<PeriodKey, string> = {
  today: 'Hoje', '7d': 'Últimos 7 dias', '30d': 'Últimos 30 dias', '60d': 'Últimos 60 dias', custom: 'Personalizado',
}

const STORAGE = 'mh-period'

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }

export function periodRange(p: PeriodState): { from: string; to: string; label: string } {
  const todayStart = startOfDay(new Date())
  const tomorrow = new Date(todayStart.getTime() + 86400_000)
  if (p.key === 'custom' && p.customFrom && p.customTo) {
    const f = new Date(p.customFrom + 'T00:00:00')
    const t = new Date(new Date(p.customTo + 'T00:00:00').getTime() + 86400_000)
    return { from: f.toISOString(), to: t.toISOString(), label: `${f.toLocaleDateString('pt-BR')} a ${new Date(t.getTime() - 1).toLocaleDateString('pt-BR')}` }
  }
  const days = p.key === 'today' ? 1 : p.key === '7d' ? 7 : p.key === '60d' ? 60 : 30
  const from = new Date(tomorrow.getTime() - days * 86400_000)
  return { from: from.toISOString(), to: tomorrow.toISOString(), label: PERIOD_LABEL[p.key === 'custom' ? '30d' : p.key] }
}

/** Filtro global de período, compartilhado entre Painel, Hóspedes, Relatórios e Histórico */
export function usePeriod() {
  const [state, setState] = useState<PeriodState>({ key: '30d' })
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE)
      if (saved) setState(JSON.parse(saved))
    } catch { /* ignore */ }
    const h = (e: Event) => setState((e as CustomEvent).detail)
    window.addEventListener('mh-period', h)
    return () => window.removeEventListener('mh-period', h)
  }, [])
  const update = (s: PeriodState) => {
    setState(s)
    try { localStorage.setItem(STORAGE, JSON.stringify(s)) } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent('mh-period', { detail: s }))
  }
  const range = useMemo(() => periodRange(state), [state])
  return { period: state, setPeriod: update, range }
}
