'use client'

import { CalendarRange } from 'lucide-react'
import { PERIOD_LABEL, type PeriodKey, type PeriodState } from '@/hooks/usePeriod'

const KEYS: PeriodKey[] = ['today', '7d', '30d', '60d', 'custom']

export function PeriodFilter({ value, onChange }: { value: PeriodState; onChange: (p: PeriodState) => void }) {
  const today = new Date().toISOString().slice(0, 10)
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="ui-tabs" role="tablist" aria-label="Período">
        {KEYS.map(k => (
          <button key={k} role="tab" aria-selected={value.key === k} className="ui-tab"
            onClick={() => onChange(k === 'custom'
              ? { key: 'custom', customFrom: value.customFrom || new Date(Date.now() - 29 * 86400_000).toISOString().slice(0, 10), customTo: value.customTo || today }
              : { key: k })}>
            {k === 'custom' && <CalendarRange size={13} />}
            {k === '7d' ? '7 dias' : k === '30d' ? '30 dias' : k === '60d' ? '60 dias' : PERIOD_LABEL[k]}
          </button>
        ))}
      </div>
      {value.key === 'custom' && (
        <div className="flex items-center gap-1.5">
          <input type="date" className="ui-input !py-1.5 !w-auto" value={value.customFrom || ''} max={value.customTo || today}
            onChange={e => onChange({ ...value, customFrom: e.target.value })} aria-label="Data inicial" />
          <span className="text-xs" style={{ color: 'var(--fg3)' }}>até</span>
          <input type="date" className="ui-input !py-1.5 !w-auto" value={value.customTo || ''} min={value.customFrom} max={today}
            onChange={e => onChange({ ...value, customTo: e.target.value })} aria-label="Data final" />
        </div>
      )}
    </div>
  )
}
