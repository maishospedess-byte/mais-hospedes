'use client'

import { createBrowserSupabase } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'
import { Building2, MapPin } from 'lucide-react'

type Hotel = {
  id: string
  name: string
  slug: string
  is_active: boolean
  created_at: string
  city: string | null
  state: string | null
  organization_id: string
}

export default function AdminHotelsPage() {
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createBrowserSupabase()
      const { data } = await supabase
        .from('hotels')
        .select('id, name, slug, is_active, created_at, city, state, organization_id')
        .order('created_at', { ascending: false })
      setHotels(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = hotels.filter(h =>
    h.name.toLowerCase().includes(search.toLowerCase()) ||
    h.slug.toLowerCase().includes(search.toLowerCase()) ||
    (h.city && h.city.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div>
      <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" style={{ borderBottom: '1px solid var(--glass-border)' }}>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            <Building2 size={22} className="shrink-0" style={{ color: 'var(--bb)' }} />
            Hotéis
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--fg3)' }}>
            {hotels.length} hotel(is) cadastrado(s)
          </p>
        </div>
        <input
          type="text"
          placeholder="Buscar hotel..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-dark w-full sm:w-64"
        />
      </div>

      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 rounded-full animate-pulse" style={{ background: 'rgba(99,102,241,.3)' }} />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center py-10" style={{ color: 'var(--fg3)' }}>Nenhum hotel encontrado.</p>
        ) : (
          <div className="space-y-3">
            {filtered.map(hotel => (
              <div key={hotel.id} className="glass-card p-5 hover:translate-y-0">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold">{hotel.name}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{
                        background: hotel.is_active ? 'rgba(34,197,94,.12)' : 'rgba(239,68,68,.12)',
                        color: hotel.is_active ? '#22C55E' : '#EF4444',
                      }}>
                        {hotel.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    <p className="text-sm mt-1 font-mono" style={{ color: 'var(--fg3)' }}>
                      /{hotel.slug}
                    </p>
                    {(hotel.city || hotel.state) && (
                      <p className="text-xs mt-1" style={{ color: 'var(--fg3)' }}>
                        <MapPin size={12} className="inline shrink-0" /> {[hotel.city, hotel.state].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs" style={{ color: 'var(--fg3)' }}>
                      {new Date(hotel.created_at).toLocaleDateString('pt-BR')}
                    </p>
                    <p className="text-xs mt-1 font-mono" style={{ color: 'var(--fg3)' }}>
                      {hotel.id.slice(0, 8)}...
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
