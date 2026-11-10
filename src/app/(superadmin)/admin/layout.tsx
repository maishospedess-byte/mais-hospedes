'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserSupabase } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Building2, Users, CreditCard,
  LogOut, Menu, X, ShieldAlert, Loader2, type LucideIcon
} from 'lucide-react'

const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/hotels', label: 'Hotéis', icon: Building2 },
  { href: '/admin/users', label: 'Usuários', icon: Users },
  { href: '/admin/subscriptions', label: 'Assinaturas', icon: CreditCard },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [authorized, setAuthorized] = useState<boolean | null>(null) // null = loading

  useEffect(() => {
    async function checkAdmin() {
      try {
        const res = await fetch('/api/admin/check')
        const { isAdmin } = await res.json()
        if (isAdmin) {
          setAuthorized(true)
        } else {
          setAuthorized(false)
        }
      } catch {
        setAuthorized(false)
      }
    }
    checkAdmin()
  }, [router])

  async function handleLogout() {
    const supabase = createBrowserSupabase()
    await supabase.auth.signOut()
    router.push('/')
  }

  function isActive(href: string) {
    if (href === '/admin') return pathname === '/admin'
    return pathname?.startsWith(href) || false
  }

  // Loading state
  if (authorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="text-center">
          <Loader2 size={32} className="animate-spin mx-auto mb-3" style={{ color: 'var(--bb)' }} />
          <p className="text-sm" style={{ color: 'var(--fg3)' }}>Verificando acesso...</p>
        </div>
      </div>
    )
  }

  // Not authorized
  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
        <div className="glass-card p-10 max-w-[420px] w-full text-center hover:translate-y-0">
          <ShieldAlert size={48} className="mx-auto mb-4" style={{ color: '#EF4444' }} />
          <h1 className="text-xl font-bold mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Acesso Restrito
          </h1>
          <p className="text-sm mb-6" style={{ color: 'var(--fg3)' }}>
            Você não tem permissão para acessar o painel administrativo.
          </p>
          <Link
            href="/painel"
            className="btn-primary inline-flex items-center gap-2 !py-3 !px-6"
          >
            <Building2 size={18} />
            Ir para o painel
          </Link>
        </div>
      </div>
    )
  }

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      {NAV_ITEMS.map(item => {
        const active = isActive(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{
              background: active ? 'rgba(239,68,68,.12)' : 'transparent',
              color: active ? '#F87171' : 'var(--fg2)',
            }}
          >
            <item.icon size={18} className="shrink-0" />
            {item.label}
          </Link>
        )
      })}
    </>
  )

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-[240px] shrink-0 sticky top-0 h-screen" style={{
        background: 'rgba(5,8,16,.6)',
        backdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(239,68,68,.1)',
      }}>
        <div className="px-5 h-[64px] flex items-center gap-2.5 shrink-0" style={{
          borderBottom: '1px solid rgba(239,68,68,.15)',
        }}>
          <span className="text-[17px] font-extrabold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Mais<em className="not-italic" style={{ color: 'var(--bb)' }}>Hóspedes</em>
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{
            background: 'rgba(239,68,68,.15)',
            color: '#F87171',
          }}>ADMIN</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <NavLinks />
        </nav>

        <div className="px-3 py-4 shrink-0 space-y-1" style={{ borderTop: '1px solid var(--glass-border)' }}>
          <Link href="/painel" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium w-full" style={{ color: 'var(--fg3)' }}>
            <Building2 size={18} className="shrink-0" />
            Voltar ao hotel
          </Link>
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium w-full" style={{ color: 'var(--fg3)' }}>
            <LogOut size={18} className="shrink-0" />
            Sair
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-[56px] flex items-center justify-between px-4" style={{
        background: 'rgba(5,8,16,.9)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(239,68,68,.15)',
      }}>
        <button onClick={() => setMobileOpen(true)} className="p-1" style={{ color: 'var(--fg2)' }}>
          <Menu size={22} />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-extrabold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Mais<em className="not-italic" style={{ color: 'var(--bb)' }}>Hóspedes</em>
          </span>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{
            background: 'rgba(239,68,68,.15)',
            color: '#F87171',
          }}>ADMIN</span>
        </div>
        <div className="w-8" />
      </div>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <>
          <div className="lg:hidden fixed inset-0 z-50 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="lg:hidden fixed left-0 top-0 bottom-0 z-50 w-[260px] flex flex-col" style={{
            background: 'var(--bg)',
            borderRight: '1px solid rgba(239,68,68,.1)',
          }}>
            <div className="px-5 h-[56px] flex items-center justify-between shrink-0" style={{
              borderBottom: '1px solid rgba(239,68,68,.15)',
            }}>
              <span className="text-sm font-extrabold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Admin
              </span>
              <button onClick={() => setMobileOpen(false)} style={{ color: 'var(--fg2)' }}>
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              <NavLinks onNavigate={() => setMobileOpen(false)} />
            </nav>
            <div className="px-3 py-4 shrink-0 space-y-1" style={{ borderTop: '1px solid var(--glass-border)' }}>
              <Link href="/painel" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium w-full" style={{ color: 'var(--fg3)' }}>
                <Building2 size={18} className="shrink-0" />
                Voltar ao hotel
              </Link>
              <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium w-full" style={{ color: 'var(--fg3)' }}>
                <LogOut size={18} className="shrink-0" />
                Sair
              </button>
            </div>
          </div>
        </>
      )}

      <main className="flex-1 min-w-0 lg:pt-0 pt-[56px]">
        {children}
      </main>
    </div>
  )
}
