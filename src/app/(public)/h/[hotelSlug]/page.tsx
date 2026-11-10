'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useParams } from 'next/navigation'
import {
  User,
  Phone,
  Mail,
  CalendarDays,
  Users,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  Globe,
  Shield,
  Loader2,
  MessageCircle,
  ExternalLink,
} from 'lucide-react'
import type { Locale } from '@/lib/i18n/translations'
import { t } from '@/lib/i18n/translations'

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface HotelData {
  id: string
  name: string
  slug: string
  is_active: boolean
  instagram_url: string | null
  whatsapp_number: string | null
}

interface FormData {
  full_name: string
  whatsapp_number: string
  ddi: string
  email: string
  checkin_date: string
  checkout_date: string
  guest_count: string
  consent: boolean
}

interface FormErrors {
  full_name?: string
  whatsapp_number?: string
  email?: string
  checkin_date?: string
  checkout_date?: string
  consent?: string
}

/* ------------------------------------------------------------------ */
/* DDI Config                                                          */
/* ------------------------------------------------------------------ */

const DDI_OPTIONS = [
  { code: '+55', country: 'BR', label: 'Brasil (+55)' },
  { code: '+595', country: 'PY', label: 'Paraguay (+595)' },
] as const

/* ------------------------------------------------------------------ */
/* Phone masks                                                         */
/* ------------------------------------------------------------------ */

function applyPhoneMask(value: string, ddi: string): string {
  const digits = value.replace(/\D/g, '')
  if (ddi === '+55') {
    if (digits.length <= 2) return digits.length ? `(${digits}` : ''
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
    if (digits.length <= 10)
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`
  }
  if (ddi === '+595') {
    if (digits.length <= 3) return digits.length ? `(${digits}` : ''
    if (digits.length <= 9)
      return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 9)}`
  }
  return digits
}

function phoneToE164(raw: string, ddi: string): string {
  const digits = raw.replace(/\D/g, '')
  return `${ddi}${digits}`
}

function isValidPhone(raw: string, ddi: string): boolean {
  const digits = raw.replace(/\D/g, '')
  if (ddi === '+55') return digits.length === 10 || digits.length === 11
  if (ddi === '+595') return digits.length >= 7 && digits.length <= 9
  return digits.length >= 7
}

/* ------------------------------------------------------------------ */
/* Email suggestions                                                   */
/* ------------------------------------------------------------------ */

const EMAIL_DOMAINS = [
  'gmail.com',
  'hotmail.com',
  'outlook.com',
  'yahoo.com',
  'icloud.com',
  'live.com',
  'uol.com.br',
  'terra.com.br',
  'bol.com.br',
]

function getEmailSuggestions(input: string): string[] {
  if (!input.includes('@')) return []
  const [local, partialDomain] = input.split('@')
  if (!local || !partialDomain) return []
  return EMAIL_DOMAINS.filter(
    (d) => d.startsWith(partialDomain.toLowerCase()) && d !== partialDomain.toLowerCase()
  )
    .slice(0, 3)
    .map((d) => `${local}@${d}`)
}

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function GuestRegistrationPage() {
  const params = useParams()
  const hotelSlug = params.hotelSlug as string

  const [hotel, setHotel] = useState<HotelData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [locale, setLocale] = useState<Locale>('pt-BR')
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [emailSuggestions, setEmailSuggestions] = useState<string[]>([])
  const [showEmailSuggestions, setShowEmailSuggestions] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState<FormData>({
    full_name: '',
    whatsapp_number: '',
    ddi: '+55',
    email: '',
    checkin_date: '',
    checkout_date: '',
    guest_count: '',
    consent: false,
  })

  const i = useMemo(() => t(locale), [locale])

  // Fetch hotel via API (service role — works without auth)
  useEffect(() => {
    if (!hotelSlug) return
    setLoading(true)
    setError(null)

    let cancelled = false

    async function fetchHotel(attempt: number) {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 12000)

      try {
        const res = await fetch(`/api/hotel/${encodeURIComponent(hotelSlug)}`, {
          signal: controller.signal,
          cache: 'no-store',
        })
        clearTimeout(timeoutId)
        if (cancelled) return

        const body = await res.json().catch(() => ({}))
        if (!res.ok) {
          if (res.status === 404 && body.code === 'HOTEL_NOT_FOUND') {
            setError(i.errors.hotelNotFound)
            return
          }
          throw new Error('SERVER_ERROR')
        }
        const data = body as HotelData
        if (!data.is_active) {
          setError(i.errors.hotelInactive)
        } else {
          setHotel(data)
        }
      } catch (err) {
        clearTimeout(timeoutId)
        if (cancelled) return
        const isNotFound = err instanceof Error && err.message === 'HOTEL_NOT_FOUND'
        if (isNotFound) {
          setError(i.errors.hotelNotFound)
          return
        }
        // Retry once on network/server errors (common on mobile wake-up)
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 1500))
          if (!cancelled) return fetchHotel(attempt + 1)
        }
        setError(i.errors.connectionError)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchHotel(1)
    return () => { cancelled = true }
  }, [hotelSlug, i.errors.hotelNotFound, i.errors.hotelInactive, i.errors.connectionError])

  // Close email suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (emailRef.current && !emailRef.current.contains(e.target as Node)) {
        setShowEmailSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const updateField = useCallback(
    <K extends keyof FormData>(key: K, value: FormData[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }))
      setFormErrors((prev) => ({ ...prev, [key]: undefined }))
    },
    []
  )

  const handlePhoneChange = useCallback(
    (raw: string) => {
      const masked = applyPhoneMask(raw, form.ddi)
      updateField('whatsapp_number', masked)
    },
    [form.ddi, updateField]
  )

  const handleEmailChange = useCallback(
    (val: string) => {
      updateField('email', val)
      const suggestions = getEmailSuggestions(val)
      setEmailSuggestions(suggestions)
      setShowEmailSuggestions(suggestions.length > 0)
    },
    [updateField]
  )

  const selectEmailSuggestion = useCallback(
    (suggestion: string) => {
      updateField('email', suggestion)
      setShowEmailSuggestions(false)
    },
    [updateField]
  )

  /* ---- Validation ---- */

  const validateStep1 = useCallback((): boolean => {
    const errs: FormErrors = {}
    if (!form.full_name.trim()) errs.full_name = i.errors.nameRequired
    else if (form.full_name.length > 120) errs.full_name = i.errors.nameTooLong
    if (!isValidPhone(form.whatsapp_number, form.ddi))
      errs.whatsapp_number = i.errors.whatsappInvalid
    if (form.email && !isValidEmail(form.email)) errs.email = i.errors.emailInvalid
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }, [form, i.errors])

  const validateStep2 = useCallback((): boolean => {
    const errs: FormErrors = {}
    if (!form.checkin_date) errs.checkin_date = i.errors.checkinRequired
    if (!form.checkout_date) errs.checkout_date = i.errors.checkoutRequired
    if (form.checkin_date && form.checkout_date && form.checkout_date <= form.checkin_date)
      errs.checkout_date = i.errors.checkoutBeforeCheckin
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }, [form, i.errors])

  const validateStep3 = useCallback((): boolean => {
    const errs: FormErrors = {}
    if (!form.consent) errs.consent = i.errors.consentRequired
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }, [form.consent, i.errors])

  /* ---- Navigation ---- */

  const nextStep = useCallback(() => {
    if (step === 1 && validateStep1()) setStep(2)
    else if (step === 2 && validateStep2()) setStep(3)
  }, [step, validateStep1, validateStep2])

  const prevStep = useCallback(() => {
    if (step > 1) setStep(step - 1)
  }, [step])

  /* ---- Submit ---- */

  const handleSubmit = useCallback(async () => {
    if (!validateStep3() || !hotel) return
    setSubmitting(true)
    setSubmitError(null)

    const payload = {
      hotel_slug: hotel.slug,
      full_name: form.full_name.trim(),
      whatsapp_number: phoneToE164(form.whatsapp_number, form.ddi),
      email: form.email.trim() || undefined,
      checkin_date: form.checkin_date,
      checkout_date: form.checkout_date,
      guest_count: form.guest_count ? parseInt(form.guest_count, 10) : undefined,
      language: locale,
      consent: true,
    }

    try {
      const res = await fetch('/api/registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = await res.json()

      if (!res.ok) {
        if (body.code === 'DUPLICATE') {
          setSubmitError(i.errors.duplicateRegistration)
        } else {
          setSubmitError(i.errors.submitError)
        }
        return
      }

      setSubmitted(true)
    } catch {
      setSubmitError(i.errors.connectionError)
    } finally {
      setSubmitting(false)
    }
  }, [validateStep3, hotel, form, locale, i.errors])

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */

  // Loading
  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#050810]">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    )
  }

  // Error (hotel not found / inactive)
  if (error || !hotel) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#050810] px-4">
        <div className="glass-card p-8 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-gray-300 text-lg">{error || i.errors.hotelNotFound}</p>
        </div>
      </div>
    )
  }

  // Success
  if (submitted) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#050810] px-4">
        <div className="glass-card p-8 max-w-md w-full text-center space-y-6">
          <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto" />
          <h2 className="text-2xl font-bold text-white">{i.success.title}</h2>
          <p className="text-gray-300">{i.success.message}</p>
          <p className="text-sm text-gray-500">{i.success.note}</p>

          <div className="flex flex-col gap-3 pt-2">
            {hotel.instagram_url && (
              <a
                href={hotel.instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-glass flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                {i.success.followInstagram}
              </a>
            )}
            {hotel.whatsapp_number && (
              <a
                href={`https://wa.me/${hotel.whatsapp_number.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-glass flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm"
              >
                <MessageCircle className="w-4 h-4" />
                {i.success.saveContact}
              </a>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Today string for date inputs
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="min-h-dvh bg-[#050810] flex flex-col items-center py-6 px-4">
      {/* Header */}
      <div className="w-full max-w-md mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-white">{hotel.name}</h1>

          {/* Language selector */}
          <div className="relative">
            <button
              type="button"
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-200 transition-colors"
              onClick={() => setLocale(locale === 'pt-BR' ? 'es' : 'pt-BR')}
            >
              <Globe className="w-4 h-4" />
              {locale === 'pt-BR' ? 'PT' : 'ES'}
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                s <= step ? 'bg-indigo-500' : 'bg-white/10'
              }`}
            />
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span className={step >= 1 ? 'text-indigo-400' : ''}>{i.form.step1}</span>
          <span className={step >= 2 ? 'text-indigo-400' : ''}>{i.form.step2}</span>
          <span className={step >= 3 ? 'text-indigo-400' : ''}>{i.form.step3}</span>
        </div>
      </div>

      {/* Welcome */}
      <div className="w-full max-w-md mb-6 text-center">
        <h2 className="text-2xl font-bold text-white mb-1">{i.form.welcome}</h2>
        <p className="text-gray-400 text-sm">{i.form.subtitle}</p>
      </div>

      {/* Form card */}
      <div className="glass-card p-6 w-full max-w-md">
        {/* Step 1: Personal data */}
        {step === 1 && (
          <div className="space-y-5">
            {/* Name */}
            <div>
              <label className="text-sm text-gray-300 mb-1.5 flex items-center gap-1.5">
                <User className="w-4 h-4 text-indigo-400" />
                {i.form.fullName}
              </label>
              <input
                type="text"
                className="input-dark w-full"
                placeholder={i.form.fullNamePlaceholder}
                value={form.full_name}
                onChange={(e) => updateField('full_name', e.target.value)}
                autoComplete="name"
                autoFocus
              />
              {formErrors.full_name && (
                <p className="text-red-400 text-xs mt-1">{formErrors.full_name}</p>
              )}
            </div>

            {/* Phone with DDI */}
            <div>
              <label className="text-sm text-gray-300 mb-1.5 flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-indigo-400" />
                {i.form.whatsapp}
              </label>
              <div className="flex gap-2">
                <select
                  className="input-dark w-[130px] shrink-0"
                  value={form.ddi}
                  onChange={(e) => {
                    updateField('ddi', e.target.value)
                    updateField('whatsapp_number', '')
                  }}
                >
                  {DDI_OPTIONS.map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.country} {opt.code}
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  className="input-dark flex-1 min-w-0"
                  placeholder={i.form.whatsappPlaceholder}
                  value={form.whatsapp_number}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  autoComplete="tel"
                  inputMode="numeric"
                />
              </div>
              {formErrors.whatsapp_number && (
                <p className="text-red-400 text-xs mt-1">{formErrors.whatsapp_number}</p>
              )}
            </div>

            {/* Email with suggestions */}
            <div className="relative" ref={emailRef}>
              <label className="text-sm text-gray-300 mb-1.5 flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-indigo-400" />
                {i.form.email}
              </label>
              <input
                type="email"
                className="input-dark w-full"
                placeholder={i.form.emailPlaceholder}
                value={form.email}
                onChange={(e) => handleEmailChange(e.target.value)}
                onFocus={() => {
                  if (emailSuggestions.length > 0) setShowEmailSuggestions(true)
                }}
                autoComplete="email"
                inputMode="email"
              />
              {showEmailSuggestions && emailSuggestions.length > 0 && (
                <div className="absolute z-10 left-0 right-0 mt-1 bg-[#0f1420] border border-white/10 rounded-lg overflow-hidden shadow-lg">
                  {emailSuggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="block w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 transition-colors"
                      onClick={() => selectEmailSuggestion(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
              {formErrors.email && (
                <p className="text-red-400 text-xs mt-1">{formErrors.email}</p>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Stay dates */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <label className="text-sm text-gray-300 mb-1.5 flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 text-indigo-400" />
                {i.form.checkinDate}
              </label>
              <input
                type="date"
                className="input-dark w-full"
                value={form.checkin_date}
                min={today}
                onChange={(e) => updateField('checkin_date', e.target.value)}
              />
              {formErrors.checkin_date && (
                <p className="text-red-400 text-xs mt-1">{formErrors.checkin_date}</p>
              )}
            </div>

            <div>
              <label className="text-sm text-gray-300 mb-1.5 flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 text-indigo-400" />
                {i.form.checkoutDate}
              </label>
              <input
                type="date"
                className="input-dark w-full"
                value={form.checkout_date}
                min={form.checkin_date || today}
                onChange={(e) => updateField('checkout_date', e.target.value)}
              />
              {formErrors.checkout_date && (
                <p className="text-red-400 text-xs mt-1">{formErrors.checkout_date}</p>
              )}
            </div>

            <div>
              <label className="text-sm text-gray-300 mb-1.5 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-indigo-400" />
                {i.form.guestCount}
              </label>
              <input
                type="number"
                className="input-dark w-full"
                placeholder={i.form.guestCountPlaceholder}
                value={form.guest_count}
                min="1"
                max="20"
                onChange={(e) => updateField('guest_count', e.target.value)}
                inputMode="numeric"
              />
            </div>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && (
          <div className="space-y-5">
            {/* Summary */}
            <div className="bg-white/5 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">{i.form.fullName}</span>
                <span className="text-white">{form.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{i.form.whatsapp}</span>
                <span className="text-white">
                  {form.ddi} {form.whatsapp_number}
                </span>
              </div>
              {form.email && (
                <div className="flex justify-between">
                  <span className="text-gray-500">E-mail</span>
                  <span className="text-white">{form.email}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">{i.form.checkinDate}</span>
                <span className="text-white">{form.checkin_date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{i.form.checkoutDate}</span>
                <span className="text-white">{form.checkout_date}</span>
              </div>
              {form.guest_count && (
                <div className="flex justify-between">
                  <span className="text-gray-500">{i.form.guestCount}</span>
                  <span className="text-white">{form.guest_count}</span>
                </div>
              )}
            </div>

            {/* Consent */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-gray-600 bg-transparent text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0"
                checked={form.consent}
                onChange={(e) => updateField('consent', e.target.checked)}
              />
              <span className="text-sm text-gray-300">{i.form.consent}</span>
            </label>
            {formErrors.consent && (
              <p className="text-red-400 text-xs">{formErrors.consent}</p>
            )}

            {/* Privacy */}
            <div className="flex items-start gap-2 text-xs text-gray-500">
              <Shield className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{i.form.privacyNotice}</span>
            </div>

            {submitError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">
                {submitError}
              </div>
            )}
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex gap-3 mt-6">
          {step > 1 && (
            <button
              type="button"
              className="btn-glass flex items-center justify-center gap-1 py-3 px-4 rounded-xl text-sm flex-1"
              onClick={prevStep}
            >
              <ChevronLeft className="w-4 h-4" />
              {i.form.back}
            </button>
          )}
          {step < 3 && (
            <button
              type="button"
              className="btn-primary flex items-center justify-center gap-1 py-3 px-4 rounded-xl text-sm flex-1"
              onClick={nextStep}
            >
              {i.form.next}
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
          {step === 3 && (
            <button
              type="button"
              className="btn-primary flex items-center justify-center gap-1 py-3 px-4 rounded-xl text-sm flex-1 disabled:opacity-50"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {i.form.submitting}
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  {i.form.submit}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
