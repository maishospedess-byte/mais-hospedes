'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useHotel } from '@/hooks/useHotel'
import { createBrowserSupabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard, BellRing, Users, Zap,
  Settings, LogOut, Menu, X, Shield, type LucideIcon
} from 'lucide-react'

const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/painel', label: 'Painel', icon: LayoutDashboard },
  { href: '/dashboard', label: 'Recepção', icon: BellRing },
  { href: '/guests', label: 'Hóspedes', icon: Users },
  { href: '/automations', label: 'Automações', icon: Zap },
  { href: '/settings', label: 'Configurações', icon: Settings },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { hotel } = useHotel()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  useEffect(() => {
    async function checkAdmin() {
      try {
        const res = await fetch('/api/admin/check')
        const { isAdmin } = await res.json()
        if (isAdmin) setIsSuperAdmin(true)
      } catch {
        // silently fail
      }
    }
    checkAdmin()
  }, [])

  async function handleLogout() {
    const supabase = createBrowserSupabase()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  function isActive(href: string) {
    return pathname === href || (href !== '/painel' && pathname?.startsWith(href))
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
              background: active ? 'rgba(99,102,241,.12)' : 'transparent',
              color: active ? 'var(--bb)' : 'var(--fg2)',
            }}
          >
            <item.icon size={18} className="shrink-0" />
            {item.label}
          </Link>
        )
      })}
    </>
  )

  const AdminLink = ({ onNavigate }: { onNavigate?: () => void }) => {
    if (!isSuperAdmin) return null
    return (
      <Link
        href="/admin"
        onClick={onNavigate}
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
        style={{
          background: 'rgba(239,68,68,.08)',
          color: '#F87171',
          border: '1px solid rgba(239,68,68,.15)',
        }}
      >
        <Shield size={18} className="shrink-0" />
        Admin
      </Link>
    )
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-[240px] shrink-0 sticky top-0 h-screen" style={{
        background: 'rgba(5,8,16,.6)',
        backdropFilter: 'blur(20px)',
        borderRight: '1px solid var(--glass-border)',
      }}>
        <div className="px-5 h-[64px] flex items-center gap-2.5 shrink-0" style={{
          borderBottom: '1px solid var(--glass-border)',
        }}>
          <span className="text-[17px] font-extrabold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Mais<em className="not-italic" style={{ color: 'var(--bb)' }}>Hóspedes</em>
          </span>
        </div>

        {hotel && (
          <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--glass-border)' }}>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--fg3)' }}>Hotel</p>
            <p className="text-sm font-semibold truncate mt-0.5">{hotel.name}</p>
          </div>
        )}

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <NavLinks />
          <div className="pt-3 mt-3" style={{ borderTop: '1px solid var(--glass-border)' }}>
            <AdminLink />
          </div>
        </nav>

        <div className="px-3 py-4 shrink-0" style={{ borderTop: '1px solid var(--glass-border)' }}>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all w-full"
            style={{ color: 'var(--fg3)' }}
          >
            <LogOut size={18} className="shrink-0" />
            Sair
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-[56px] flex items-center justify-between px-4" style={{
        background: 'rgba(5,8,16,.9)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--glass-border)',
      }}>
        <button onClick={() => setMobileOpen(true)} className="p-1" style={{ color: 'var(--fg2)' }}>
          <Menu size={22} />
        </button>
        <span className="text-sm font-extrabold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Mais<em className="not-italic" style={{ color: 'var(--bb)' }}>Hóspedes</em>
        </span>
        <div className="w-8" />
      </div>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <>
          <div className="lg:hidden fixed inset-0 z-50 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="lg:hidden fixed left-0 top-0 bottom-0 z-50 w-[260px] flex flex-col" style={{
            background: 'var(--bg)',
            borderRight: '1px solid var(--glass-border)',
          }}>
            <div className="px-5 h-[56px] flex items-center justify-between shrink-0" style={{
              borderBottom: '1px solid var(--glass-border)',
            }}>
              <span className="text-sm font-extrabold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Mais<em className="not-italic" style={{ color: 'var(--bb)' }}>Hóspedes</em>
              </span>
              <button onClick={() => setMobileOpen(false)} style={{ color: 'var(--fg2)' }}>
                <X size={20} />
              </button>
            </div>
            {hotel && (
              <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--fg3)' }}>Hotel</p>
                <p className="text-sm font-semibold truncate mt-0.5">{hotel.name}</p>
              </div>
            )}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              <NavLinks onNavigate={() => setMobileOpen(false)} />
              <div className="pt-3 mt-3" style={{ borderTop: '1px solid var(--glass-border)' }}>
                <AdminLink onNavigate={() => setMobileOpen(false)} />
              </div>
            </nav>
            <div className="px-3 py-4 shrink-0" style={{ borderTop: '1px solid var(--glass-border)' }}>
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
