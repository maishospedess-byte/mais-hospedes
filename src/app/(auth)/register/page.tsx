'use client'

import { useState, useRef } from 'react'
import { createBrowserSupabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, UserPlus, Loader2, User, Building2, Mail, Lock } from 'lucide-react'

const EMAIL_DOMAINS = ['@gmail.com', '@outlook.com', '@hotmail.com', '@yahoo.com']

export default function RegisterPage() {
  const [fullName, setFullName] = useState('')
  const [hotelName, setHotelName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [emailSuggestions, setEmailSuggestions] = useState<string[]>([])
  const emailRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  function handleEmailChange(val: string) {
    setEmail(val)
    // Show domain suggestions when user types @
    const atIdx = val.indexOf('@')
    if (atIdx > 0 && atIdx === val.length - 1) {
      // Just typed @, show all suggestions
      setEmailSuggestions(EMAIL_DOMAINS.map(d => val.slice(0, atIdx) + d))
    } else if (atIdx > 0) {
      const partial = val.slice(atIdx)
      const matches = EMAIL_DOMAINS.filter(d => d.startsWith(partial) && d !== partial)
      setEmailSuggestions(matches.map(d => val.slice(0, atIdx) + d))
    } else {
      setEmailSuggestions([])
    }
  }

  function selectEmailSuggestion(suggestion: string) {
    setEmail(suggestion)
    setEmailSuggestions([])
    emailRef.current?.focus()
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setEmailSuggestions([])
    setLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(),
          hotel_name: hotelName.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Erro ao criar conta')
        setLoading(false)
        return
      }

      const supabase = createBrowserSupabase()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })

      if (signInError) {
        setError('Conta criada, mas erro ao fazer login. Tente fazer login manualmente.')
        setLoading(false)
        return
      }

      router.push('/painel')
      router.refresh()
    } catch {
      setError('Erro de conexão. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Background orbs */}
      <div className="orb" style={{ width: 400, height: 400, top: -100, right: -100, background: 'rgba(79,70,229,.14)' }} />
      <div className="orb" style={{ width: 300, height: 300, bottom: -50, left: -50, background: 'rgba(167,139,250,.08)', animationDelay: '3s' }} />

      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 50% 50% at 50% 30%, rgba(79,70,229,.1), transparent 70%)'
      }} />

      <div className="glass-card p-10 max-w-[420px] w-full relative z-10 hover:transform-none" style={{
        background: 'rgba(15,21,40,.7)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}>
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="flex items-center gap-[10px] justify-center mb-3">
            <svg viewBox="0 0 40 40" fill="none" width="40" height="40">
              <rect width="40" height="40" rx="10" fill="url(#lg4)" />
              <defs><linearGradient id="lg4" x1="0" y1="0" x2="40" y2="40"><stop stopColor="#6366F1" /><stop offset="1" stopColor="#4F46E5" /></linearGradient></defs>
              <path d="M11 10h6v8h10v-8h6v20h-6v-8H17v8h-6z" fill="#fff" />
              <rect x="18" y="22" width="4" height="6" rx="1" fill="rgba(255,255,255,.5)" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold" style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif"
          }}>
            Mais<em className="not-italic" style={{ color: 'var(--bb)' }}>Hóspedes</em>
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--fg3)' }}>Crie sua conta grátis</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--fg2)' }}>Seu nome</label>
            <div className="relative">
              <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 shrink-0" style={{ color: 'var(--fg3)' }} />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                autoComplete="name"
                className="input-dark !pl-11"
                placeholder="João Silva"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--fg2)' }}>Nome do hotel</label>
            <div className="relative">
              <Building2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 shrink-0" style={{ color: 'var(--fg3)' }} />
              <input
                type="text"
                value={hotelName}
                onChange={(e) => setHotelName(e.target.value)}
                required
                className="input-dark !pl-11"
                placeholder="Hotel Ipê Dourado"
              />
            </div>
          </div>

          <div className="relative">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--fg2)' }}>E-mail</label>
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 shrink-0" style={{ color: 'var(--fg3)' }} />
              <input
                ref={emailRef}
                type="email"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                onBlur={() => setTimeout(() => setEmailSuggestions([]), 150)}
                required
                autoComplete="email"
                className="input-dark !pl-11"
                placeholder="seu@email.com"
              />
            </div>
            {emailSuggestions.length > 0 && (
              <div className="absolute z-20 w-full mt-1 rounded-xl overflow-hidden" style={{
                background: 'rgba(15,21,40,.95)',
                border: '1px solid var(--glass-border)',
                backdropFilter: 'blur(12px)',
              }}>
                {emailSuggestions.map(s => (
                  <button
                    key={s}
                    type="button"
                    onMouseDown={() => selectEmailSuggestion(s)}
                    className="w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-white/5"
                    style={{ color: 'var(--fg2)' }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--fg2)' }}>Senha</label>
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 shrink-0" style={{ color: 'var(--fg3)' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="input-dark !pl-11 !pr-12"
                placeholder="Mínimo 6 caracteres"
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
                Criando conta...
              </span>
            ) : (
              <span className="flex items-center gap-2 justify-center">
                <UserPlus size={18} />
                Criar conta grátis
              </span>
            )}
          </button>

          <p className="text-xs text-center" style={{ color: 'var(--fg3)' }}>
            14 dias grátis no plano Profissional. Sem cartão.
          </p>
        </form>

        <div className="mt-6 pt-5 text-center" style={{ borderTop: '1px solid var(--glass-border)' }}>
          <p className="text-sm" style={{ color: 'var(--fg3)' }}>
            Já tem conta?{' '}
            <Link href="/login" className="font-semibold transition-colors" style={{ color: 'var(--bb)' }}>
              Faça login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
