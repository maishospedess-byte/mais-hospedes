'use client'

import { useState, Suspense } from 'react'
import { createBrowserSupabase } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, LogIn, Loader2 } from 'lucide-react'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/painel'

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createBrowserSupabase()
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError(
        authError.message === 'Invalid login credentials'
          ? 'E-mail ou senha inválidos'
          : authError.message
      )
      setLoading(false)
      return
    }

    router.push(redirect)
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Background orbs */}
      <div className="orb" style={{ width: 400, height: 400, top: -100, left: -100, background: 'rgba(79,70,229,.14)' }} />
      <div className="orb" style={{ width: 300, height: 300, bottom: -50, right: -50, background: 'rgba(167,139,250,.08)', animationDelay: '3s' }} />

      {/* Mesh gradient */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 50% 50% at 50% 30%, rgba(79,70,229,.1), transparent 70%)'
      }} />

      <div className="glass-card p-10 max-w-[420px] w-full relative z-10 hover:transform-none" style={{
        background: 'rgba(15,21,40,.7)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}>
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center gap-[10px] justify-center mb-3">
            <svg viewBox="0 0 40 40" fill="none" width="40" height="40">
              <rect width="40" height="40" rx="10" fill="url(#lg3)" />
              <defs><linearGradient id="lg3" x1="0" y1="0" x2="40" y2="40"><stop stopColor="#6366F1" /><stop offset="1" stopColor="#4F46E5" /></linearGradient></defs>
              <path d="M11 10h6v8h10v-8h6v20h-6v-8H17v8h-6z" fill="#fff" />
              <rect x="18" y="22" width="4" height="6" rx="1" fill="rgba(255,255,255,.5)" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold" style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif"
          }}>
            Mais<em className="not-italic" style={{ color: 'var(--bb)' }}>Hóspedes</em>
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--fg3)' }}>Acesse o painel do seu hotel</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--fg2)' }}>
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="input-dark"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--fg2)' }}>
              Senha
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="input-dark pr-12"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: 'var(--fg3)' }}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-xl p-3 text-sm" style={{
              background: 'rgba(239,68,68,.1)',
              border: '1px solid rgba(239,68,68,.2)',
              color: '#f87171'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full justify-center !py-[14px] !rounded-xl disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2 justify-center">
                <Loader2 size={18} className="animate-spin" />
                Entrando...
              </span>
            ) : (
              <span className="flex items-center gap-2 justify-center">
                <LogIn size={18} />
                Entrar
              </span>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 text-center" style={{ borderTop: '1px solid var(--glass-border)' }}>
          <p className="text-sm" style={{ color: 'var(--fg3)' }}>
            Não tem conta?{' '}
            <Link href="/register" className="font-semibold transition-colors" style={{ color: 'var(--bb)' }}>
              Crie grátis
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="w-10 h-10 rounded-full animate-pulse" style={{ background: 'rgba(99,102,241,.3)' }} />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
