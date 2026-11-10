'use client'

import { createBrowserSupabase } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'
import { Users as UsersIcon } from 'lucide-react'

type User = {
  id: string
  full_name: string | null
  email: string | null
  role: string | null
  created_at: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createBrowserSupabase()
      const { data } = await supabase
        .from('users')
        .select('id, full_name, email, role, created_at')
        .order('created_at', { ascending: false })
      setUsers(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = users.filter(u =>
    (u.full_name && u.full_name.toLowerCase().includes(search.toLowerCase())) ||
    (u.email && u.email.toLowerCase().includes(search.toLowerCase()))
  )

  const roleLabel = (role: string | null) => {
    switch (role) {
      case 'superadmin': return { text: 'Superadmin', bg: 'rgba(239,68,68,.12)', color: '#F87171' }
      case 'admin': return { text: 'Admin', bg: 'rgba(99,102,241,.12)', color: '#818CF8' }
      case 'receptionist': return { text: 'Recepcionista', bg: 'rgba(34,197,94,.12)', color: '#22C55E' }
      default: return { text: role || 'N/A', bg: 'rgba(148,163,184,.12)', color: '#94A3B8' }
    }
  }

  return (
    <div>
      <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" style={{ borderBottom: '1px solid var(--glass-border)' }}>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            <UsersIcon size={22} className="shrink-0" style={{ color: 'var(--bb)' }} />
            Usuários
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--fg3)' }}>
            {users.length} usuário(s) cadastrado(s)
          </p>
        </div>
        <input
          type="text"
          placeholder="Buscar por nome ou email..."
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
          <p className="text-center py-10" style={{ color: 'var(--fg3)' }}>Nenhum usuário encontrado.</p>
        ) : (
          <div className="space-y-3">
            {filtered.map(user => {
              const rl = roleLabel(user.role)
              return (
                <div key={user.id} className="glass-card p-5 hover:translate-y-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold">{user.full_name || 'Sem nome'}</h3>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{
                          background: rl.bg,
                          color: rl.color,
                        }}>
                          {rl.text}
                        </span>
                      </div>
                      <p className="text-sm mt-1" style={{ color: 'var(--fg2)' }}>
                        {user.email || 'Sem email'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs" style={{ color: 'var(--fg3)' }}>
                        {new Date(user.created_at).toLocaleDateString('pt-BR')}
                      </p>
                      <p className="text-xs mt-1 font-mono" style={{ color: 'var(--fg3)' }}>
                        {user.id.slice(0, 8)}...
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
