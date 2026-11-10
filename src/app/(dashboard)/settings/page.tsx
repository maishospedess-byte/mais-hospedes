'use client'

import { useHotel } from '@/hooks/useHotel'
import { createBrowserSupabase } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'
import { Settings, Clock, Wifi, Link2, Check } from 'lucide-react'

export default function SettingsPage() {
  const { hotel, loading: hotelLoading } = useHotel()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Hotel settings form
  const [checkinTime, setCheckinTime] = useState('')
  const [checkoutTime, setCheckoutTime] = useState('')
  const [breakfastTime, setBreakfastTime] = useState('')
  const [wifiInfo, setWifiInfo] = useState('')
  const [rules, setRules] = useState('')
  const [receptionContact, setReceptionContact] = useState('')
  const [instagramUrl, setInstagramUrl] = useState('')
  const [googleReviewUrl, setGoogleReviewUrl] = useState('')

  useEffect(() => {
    if (hotel) {
      setCheckinTime(hotel.checkin_time || '')
      setCheckoutTime(hotel.checkout_time || '')
      setBreakfastTime(hotel.breakfast_time || '')
      setWifiInfo(hotel.wifi_info || '')
      setRules(hotel.rules || '')
      setReceptionContact(hotel.reception_contact || '')
      setInstagramUrl(hotel.instagram_url || '')
      setGoogleReviewUrl(hotel.google_review_url || '')
    }
  }, [hotel])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!hotel) return
    setSaving(true)
    setSaved(false)

    const supabase = createBrowserSupabase()
    await supabase.from('hotels').update({
      checkin_time: checkinTime || null,
      checkout_time: checkoutTime || null,
      breakfast_time: breakfastTime || null,
      wifi_info: wifiInfo || null,
      rules: rules || null,
      reception_contact: receptionContact || null,
      instagram_url: instagramUrl || null,
      google_review_url: googleReviewUrl || null,
    }).eq('id', hotel.id)

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (hotelLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full animate-pulse" style={{ background: 'rgba(99,102,241,.3)' }} />
      </div>
    )
  }

  return (
    <div>
      <div className="px-6 py-5" style={{ borderBottom: '1px solid var(--glass-border)' }}>
        <h1 className="text-xl font-bold flex items-center gap-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          <Settings size={22} className="shrink-0" style={{ color: 'var(--bb)' }} />
          Configurações do Hotel
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--fg3)' }}>Informações úteis enviadas aos hóspedes</p>
      </div>

      <div className="p-6 max-w-2xl">
        <form onSubmit={handleSave} className="space-y-6">
          {/* Horários */}
          <fieldset className="glass-card p-5 space-y-4 hover:translate-y-0">
            <legend className="text-sm font-bold px-2 inline-flex items-center gap-1.5" style={{ color: 'var(--bb)' }}><Clock size={14} /> Horários</legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: 'var(--fg3)' }}>Check-in</label>
                <input type="text" value={checkinTime} onChange={e => setCheckinTime(e.target.value)} placeholder="14:00" className="input-dark w-full" />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: 'var(--fg3)' }}>Check-out</label>
                <input type="text" value={checkoutTime} onChange={e => setCheckoutTime(e.target.value)} placeholder="12:00" className="input-dark w-full" />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: 'var(--fg3)' }}>Café da manhã</label>
                <input type="text" value={breakfastTime} onChange={e => setBreakfastTime(e.target.value)} placeholder="06:30 às 10:00" className="input-dark w-full" />
              </div>
            </div>
          </fieldset>

          {/* Wi-Fi e Contato */}
          <fieldset className="glass-card p-5 space-y-4 hover:translate-y-0">
            <legend className="text-sm font-bold px-2 inline-flex items-center gap-1.5" style={{ color: 'var(--bb)' }}><Wifi size={14} /> Informações</legend>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--fg3)' }}>Wi-Fi (rede · senha)</label>
              <input type="text" value={wifiInfo} onChange={e => setWifiInfo(e.target.value)} placeholder="Hotel_Wifi · senha123" className="input-dark w-full" />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--fg3)' }}>Contato da recepção (WhatsApp)</label>
              <input type="text" value={receptionContact} onChange={e => setReceptionContact(e.target.value)} placeholder="+55 11 99999-9999" className="input-dark w-full" />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--fg3)' }}>Regras / Informações extras</label>
              <textarea value={rules} onChange={e => setRules(e.target.value)} placeholder="Animais não permitidos. Silêncio após 22h." className="input-dark w-full min-h-[80px] resize-y" rows={3} />
            </div>
          </fieldset>

          {/* Links */}
          <fieldset className="glass-card p-5 space-y-4 hover:translate-y-0">
            <legend className="text-sm font-bold px-2 inline-flex items-center gap-1.5" style={{ color: 'var(--bb)' }}><Link2 size={14} /> Links</legend>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--fg3)' }}>Instagram URL</label>
              <input type="url" value={instagramUrl} onChange={e => setInstagramUrl(e.target.value)} placeholder="https://instagram.com/seuhotel" className="input-dark w-full" />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--fg3)' }}>Link Google Reviews</label>
              <input type="url" value={googleReviewUrl} onChange={e => setGoogleReviewUrl(e.target.value)} placeholder="https://g.page/r/..." className="input-dark w-full" />
            </div>
          </fieldset>

          {/* Save button */}
          <div className="flex items-center gap-4">
            <button type="submit" disabled={saving} className="btn-primary !py-3 !px-8 disabled:opacity-50">
              {saving ? 'Salvando...' : 'Salvar configurações'}
            </button>
            {saved && (
              <span className="text-sm font-medium inline-flex items-center gap-1" style={{ color: 'var(--green)' }}><Check size={14} /> Salvo com sucesso!</span>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
