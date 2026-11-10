'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { createBrowserSupabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard, Building2, Users, CreditCard, LogOut, type LucideIcon
} from 'lucide-react'

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/hotels', label: 'Hotéis', icon: Building2 },
  { href: '/admin/users', label: 'Usuários', icon: Users },
  { href: '/admin/subscriptions', label: 'Assinaturas', icon: CreditCard },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createBrowserSupabase()
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>
      <aside className="hidden lg:flex flex-col w-[240px] shrink-0 sticky top-0 h-screen" style={{
        background: 'rgba(5,8,16,.6)',
        backdropFilter: 'blur(20px)',
        borderRight: '1px solid var(--glass-border)',
      }}>
        <div className="px-5 h-[68px] flex items-center gap-2.5 shrink-0" style={{
          borderBottom: '1px solid var(--glass-border)',
        }}>
          <span className="text-[17px] font-extrabold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Mais<em className="not-italic" style={{ color: 'var(--bb)' }}>Hóspedes</em>
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{
            background: 'rgba(239,68,68,.15)',
            color: '#F87171',
          }}>ADMIN</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.map(item => {
            const isActive = pathname === item.href
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
                <item.icon size={18} className="shrink-0" />
                {item.label}
              </Link>
            )
          })}
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

      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  )
}
