'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard, BellRing, Users, MessageCircle, BarChart3,
  Settings, LogOut, Menu, X, Shield, type LucideIcon,
} from 'lucide-react'
import { HotelProvider, useHotel, isManager } from '@/hooks/useHotel'
import { createBrowserSupabase } from '@/lib/supabase/client'
import { ThemeToggle } from '@/components/ui/kit'

type NavItem = { href: string; label: string; icon: LucideIcon; managersOnly?: boolean }

const NAV_ITEMS: NavItem[] = [
  { href: '/painel', label: 'Painel', icon: LayoutDashboard },
  { href: '/dashboard', label: 'Recepção', icon: BellRing },
  { href: '/guests', label: 'Hóspedes', icon: Users },
  { href: '/automations', label: 'WhatsApp e Automações', icon: MessageCircle },
  { href: '/analytics', label: 'Relatórios', icon: BarChart3, managersOnly: true },
  { href: '/settings', label: 'Configurações', icon: Settings, managersOnly: true },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <HotelProvider>
      <Shell>{children}</Shell>
    </HotelProvider>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { hotel } = useHotel()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [waConnected, setWaConnected] = useState<boolean | null>(null)

  useEffect(() => {
    fetch('/api/admin/check').then(r => r.json()).then(d => setIsSuperAdmin(!!d.isAdmin)).catch(() => {})
    fetch('/api/whatsapp').then(r => r.ok ? r.json() : null).then(d => {
      if (d) setWaConnected(d.account?.connection_status === 'connected')
    }).catch(() => {})
  }, [pathname])

  // Reforço do agendador: enquanto o painel estiver aberto, processa mensagens vencidas.
  // O envio principal acontece no servidor (agendador do banco), mesmo com o navegador fechado.
  useEffect(() => {
    const tick = () => { if (document.visibilityState === 'visible') fetch('/api/automations/tick', { method: 'POST' }).catch(() => {}) }
    const id = setInterval(tick, 20000)
    tick()
    return () => clearInterval(id)
  }, [])

  async function handleLogout() {
    const supabase = createBrowserSupabase()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const isActive = (href: string) => pathname === href || (href !== '/painel' && pathname?.startsWith(href))
  const items = NAV_ITEMS.filter(i => !i.managersOnly || !hotel || isManager(hotel.role))

  const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      {hotel && (
        <div className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
          {hotel.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={hotel.logo_url} alt="" className="w-9 h-9 rounded-lg object-contain shrink-0" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }} />
          ) : (
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold shrink-0" style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>
              {hotel.name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{hotel.name}</p>
            <p className="text-[11px] truncate" style={{ color: 'var(--fg3)' }}>
              {hotel.role === 'owner' ? 'Proprietário' : hotel.role === 'manager' ? 'Gerente' : 'Recepção'}
            </p>
          </div>
        </div>
      )}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {items.map(item => {
          const active = isActive(item.href)
          return (
            <Link key={item.href} href={item.href} onClick={onNavigate}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition-colors"
              style={{ background: active ? 'var(--accent-bg)' : 'transparent', color: active ? 'var(--accent)' : 'var(--fg2)' }}>
              <item.icon size={17} className="shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.href === '/automations' && waConnected !== null && (
                <span className="w-2 h-2 rounded-full" title={waConnected ? 'WhatsApp conectado' : 'WhatsApp não conectado'}
                  style={{ background: waConnected ? 'var(--success)' : 'var(--danger)' }} />
              )}
            </Link>
          )
        })}
        {isSuperAdmin && (
          <div className="pt-3 mt-3" style={{ borderTop: '1px solid var(--border)' }}>
            <Link href="/admin" onClick={onNavigate} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-medium"
              style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>
              <Shield size={17} className="shrink-0" /> Admin
            </Link>
          </div>
        )}
      </nav>
      <div className="px-3 py-3 space-y-0.5 shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="[&>button]:w-full [&>button]:justify-start"><ThemeToggle /></div>
        <button onClick={handleLogout} className="ui-btn ui-btn-ghost w-full !justify-start">
          <LogOut size={16} /> Sair
        </button>
      </div>
    </>
  )

  const Brand = () => (
    <span className="text-[16px] font-extrabold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      Mais<em className="not-italic" style={{ color: 'var(--accent)' }}>Hóspedes</em>
    </span>
  )

  return (
    <div className="theme-scope min-h-screen flex">
      <aside className="hidden lg:flex flex-col w-[248px] shrink-0 sticky top-0 h-screen"
        style={{ background: 'var(--sidebar-bg)', borderRight: '1px solid var(--border)' }}>
        <div className="px-5 h-[60px] flex items-center shrink-0" style={{ borderBottom: '1px solid var(--border)' }}><Brand /></div>
        <SidebarContent />
      </aside>

      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-[56px] flex items-center justify-between px-3"
        style={{ background: 'var(--header-bg)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => setMobileOpen(true)} className="ui-btn ui-btn-ghost ui-btn-sm" aria-label="Abrir menu"><Menu size={20} /></button>
        <Brand />
        <ThemeToggle compact />
      </div>

      {mobileOpen && (
        <>
          <div className="lg:hidden fixed inset-0 z-50" style={{ background: 'var(--overlay)' }} onClick={() => setMobileOpen(false)} />
          <div className="lg:hidden fixed left-0 top-0 bottom-0 z-50 w-[272px] flex flex-col" style={{ background: 'var(--bg)', borderRight: '1px solid var(--border)' }}>
            <div className="px-4 h-[56px] flex items-center justify-between shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
              <Brand />
              <button onClick={() => setMobileOpen(false)} className="ui-btn ui-btn-ghost ui-btn-sm" aria-label="Fechar menu"><X size={18} /></button>
            </div>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </div>
        </>
      )}

      <main className="flex-1 min-w-0 pt-[56px] lg:pt-0">{children}</main>
    </div>
  )
}
