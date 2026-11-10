'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useHotel } from '@/hooks/useHotel'
import { createBrowserSupabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

const NAV_ITEMS = [
  { href: '/painel', label: 'Painel', icon: '📊' },
  { href: '/dashboard', label: 'Recepção', icon: '🛎️' },
  { href: '/guests', label: 'Hóspedes', icon: '👤' },
  { href: '/stays', label: 'Estadias', icon: '🏨' },
  { href: '/automations', label: 'Automações', icon: '⚡' },
  { href: '/analytics', label: 'Relatórios', icon: '📈' },
  { href: '/settings', label: 'Configurações', icon: '⚙️' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { hotel } = useHotel()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleLogout() {
    const supabase = createBrowserSupabase()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-[240px] shrink-0 sticky top-0 h-screen" style={{
        background: 'rgba(5,8,16,.6)',
        backdropFilter: 'blur(20px)',
        borderRight: '1px solid var(--glass-border)',
      }}>
        {/* Logo */}
        <div className="px-5 h-[68px] flex items-center gap-2.5 shrink-0" style={{
          borderBottom: '1px solid var(--glass-border)',
        }}>
          <svg viewBox="0 0 40 40" fill="none" width="32" height="32">
            <rect width="40" height="40" rx="10" fill="url(#slg)" />
            <defs><linearGradient id="slg" x1="0" y1="0" x2="40" y2="40"><stop stopColor="#6366F1" /><stop offset="1" stopColor="#4F46E5" /></linearGradient></defs>
            <path d="M11 10h6v8h10v-8h6v20h-6v-8H17v8h-6z" fill="#fff" />
          </svg>
          <span className="text-[17px] font-extrabold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Mais<em className="not-italic" style={{ color: 'var(--bb)' }}>Hóspedes</em>
          </span>
        </div>

        {/* Hotel name */}
        {hotel && (
          <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--glass-border)' }}>
            <p className="text-xs font-medium truncate" style={{ color: 'var(--fg3)' }}>HOTEL</p>
            <p className="text-sm font-semibold truncate mt-0.5">{hotel.name}</p>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(item => {
            const isActive = pathname === item.href || (item.href !== '/painel' && pathname?.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: isActive ? 'rgba(99,102,241,.12)' : 'transparent',
                  color: isActive ? 'var(--bb)' : 'var(--fg2)',
                }}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 shrink-0" style={{ borderTop: '1px solid var(--glass-border)' }}>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all w-full"
            style={{ color: 'var(--fg3)' }}
          >
            <span className="text-base">🚪</span>
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
        <button onClick={() => setMobileOpen(!mobileOpen)} className="text-xl p-1">☰</button>
        <span className="text-sm font-extrabold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Mais<em className="not-italic" style={{ color: 'var(--bb)' }}>Hóspedes</em>
        </span>
        <div className="w-8" />
      </div>

      {/* Mobile sidebar overlay */}
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
              <button onClick={() => setMobileOpen(false)} className="text-lg">✕</button>
            </div>
            {hotel && (
              <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <p className="text-xs font-medium" style={{ color: 'var(--fg3)' }}>HOTEL</p>
                <p className="text-sm font-semibold truncate mt-0.5">{hotel.name}</p>
              </div>
            )}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {NAV_ITEMS.map(item => {
                const isActive = pathname === item.href || (item.href !== '/painel' && pathname?.startsWith(item.href))
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={{
                      background: isActive ? 'rgba(99,102,241,.12)' : 'transparent',
                      color: isActive ? 'var(--bb)' : 'var(--fg2)',
                    }}
                  >
                    <span className="text-base">{item.icon}</span>
                    {item.label}
                  </Link>
                )
              })}
            </nav>
            <div className="px-3 py-4 shrink-0" style={{ borderTop: '1px solid var(--glass-border)' }}>
              <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium w-full" style={{ color: 'var(--fg3)' }}>
                <span className="text-base">🚪</span>
                Sair
              </button>
            </div>
          </div>
        </>
      )}

      {/* Main content */}
      <main className="flex-1 min-w-0 lg:pt-0 pt-[56px]">
        {children}
      </main>
    </div>
  )
}
