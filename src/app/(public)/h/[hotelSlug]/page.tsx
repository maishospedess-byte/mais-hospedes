'use client'

import { useState, useEffect } from 'react'
import { type Locale, t } from '@/lib/i18n/translations'
import { createBrowserSupabase } from '@/lib/supabase/client'

type Hotel = {
  id: string
  name: string
  slug: string
  instagram_url: string | null
  whatsapp_number: string | null
  is_active: boolean
}

type FormData = {
  full_name: string
  whatsapp_number: string
  email: string
  checkin_date: string
  checkout_date: string
  guest_count: string
  consent: boolean
}

const FLAGS: Record<Locale, string> = {
  'pt-BR': '🇧🇷',
  es: '🇪🇸',
  en: '🇺🇸',
}

export default function GuestRegistrationPage({
  params,
}: {
  params: { hotelSlug: string }
}) {
  const hotelSlug = params.hotelSlug
  const [hotel, setHotel] = useState<Hotel | null>(null)
  const [locale, setLocale] = useState<Locale>('pt-BR')
  const i18n = t(locale)
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState<FormData>({
    full_name: '',
    whatsapp_number: '',
    email: '',
    checkin_date: '',
    checkout_date: '',
    guest_count: '',
    consent: false,
  })

  // Load hotel data
  useEffect(() => {
    if (!hotelSlug) return

    async function loadHotel() {
      const supabase = createBrowserSupabase()
      const { data, error: err } = await supabase
        .from('hotels')
        .select('id, name, slug, instagram_url, whatsapp_number, is_active')
        .eq('slug', hotelSlug)
        .single()

      if (err || !data) {
        setError(i18n.errors.hotelNotFound)
        setLoading(false)
        return
      }

      if (!data.is_active) {
        setError(i18n.errors.hotelInactive)
        setLoading(false)
        return
      }

      setHotel(data as Hotel)
      setLoading(false)
    }

    loadHotel()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelSlug])

  function updateField(field: keyof FormData, value: string | boolean) {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setFieldErrors((prev) => {
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  function validateStep1(): boolean {
    const errors: Record<string, string> = {}

    if (!formData.full_name.trim() || formData.full_name.trim().length < 2) {
      errors.full_name = i18n.errors.nameRequired
    }
    if (formData.full_name.length > 200) {
      errors.full_name = i18n.errors.nameTooLong
    }

    const cleanNumber = formData.whatsapp_number.replace(/\s/g, '')
    if (!cleanNumber || !/^\+[1-9]\d{1,14}$/.test(cleanNumber)) {
      errors.whatsapp_number = i18n.errors.whatsappInvalid
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = i18n.errors.emailInvalid
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  function validateStep2(): boolean {
    const errors: Record<string, string> = {}

    if (!formData.checkin_date) {
      errors.checkin_date = i18n.errors.checkinRequired
    }
    if (!formData.checkout_date) {
      errors.checkout_date = i18n.errors.checkoutRequired
    }
    if (formData.checkin_date && formData.checkout_date) {
      if (new Date(formData.checkout_date) <= new Date(formData.checkin_date)) {
        errors.checkout_date = i18n.errors.checkoutBeforeCheckin
      }
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  function validateStep3(): boolean {
    const errors: Record<string, string> = {}

    if (!formData.consent) {
      errors.consent = i18n.errors.consentRequired
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  function nextStep() {
    if (step === 1 && !validateStep1()) return
    if (step === 2 && !validateStep2()) return
    setStep((s) => Math.min(s + 1, 3))
  }

  function prevStep() {
    setStep((s) => Math.max(s - 1, 1))
  }

  async function handleSubmit() {
    if (!validateStep3() || !hotel) return

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotel_slug: hotel.slug,
          full_name: formData.full_name.trim(),
          whatsapp_number: formData.whatsapp_number.replace(/\s/g, ''),
          email: formData.email || undefined,
          checkin_date: formData.checkin_date,
          checkout_date: formData.checkout_date,
          guest_count: formData.guest_count ? parseInt(formData.guest_count) : undefined,
          language: locale,
          consent: formData.consent,
        }),
      })

      const result = await res.json()

      if (!res.ok) {
        if (result.code === 'DUPLICATE') {
          setError(i18n.errors.duplicateRegistration)
        } else {
          setError(result.error || i18n.errors.submitError)
        }
        setSubmitting(false)
        return
      }

      setSuccess(true)
    } catch {
      setError(i18n.errors.submitError)
    } finally {
      setSubmitting(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-white">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-200" />
          <div className="h-3 w-32 bg-indigo-100 rounded" />
        </div>
      </div>
    )
  }

  // Error state (hotel not found)
  if (error && !hotel) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-white p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <div className="text-4xl mb-4">😕</div>
          <p className="text-gray-700 text-lg">{error}</p>
        </div>
      </div>
    )
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-white p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-3">{i18n.success.title}</h1>
          <p className="text-gray-600 mb-4">{i18n.success.message}</p>
          <p className="text-sm text-gray-400 mb-6">{i18n.success.note}</p>

          <div className="flex flex-col gap-3">
            {hotel?.instagram_url && (
              <a
                href={hotel.instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium hover:opacity-90 transition"
              >
                📸 {i18n.success.followInstagram}
              </a>
            )}
            {hotel?.whatsapp_number && (
              <a
                href={`https://wa.me/${hotel.whatsapp_number.replace(/\+/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-green-500 text-white font-medium hover:opacity-90 transition"
              >
                💬 {i18n.success.saveContact}
              </a>
            )}
          </div>

          <div className="mt-8">
            <span className="text-xs text-gray-300 font-medium tracking-wider uppercase">
              Mais Hóspedes
            </span>
          </div>
        </div>
      </div>
    )
  }

  // Form
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex flex-col">
      {/* Language selector */}
      <div className="flex justify-center gap-2 pt-4 px-4">
        {(['pt-BR', 'es', 'en'] as Locale[]).map((lang) => (
          <button
            key={lang}
            onClick={() => setLocale(lang)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition ${
              locale === lang
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <span>{FLAGS[lang]}</span>
            <span>{i18n.language[lang === 'pt-BR' ? 'ptBR' : lang]}</span>
          </button>
        ))}
      </div>

      {/* Header */}
      <div className="text-center px-6 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">{i18n.form.welcome}</h1>
        <p className="text-gray-500 mt-1 text-sm">{i18n.form.subtitle}</p>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-2 px-6 mb-6">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex-1">
            <div
              className={`h-1.5 rounded-full transition-colors ${
                s <= step ? 'bg-indigo-600' : 'bg-gray-200'
              }`}
            />
            <p className={`text-xs mt-1 ${s <= step ? 'text-indigo-600 font-medium' : 'text-gray-400'}`}>
              {s === 1 ? i18n.form.step1 : s === 2 ? i18n.form.step2 : i18n.form.step3}
            </p>
          </div>
        ))}
      </div>

      {/* Form content */}
      <div className="flex-1 px-6 pb-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 max-w-md mx-auto">
          {/* Step 1: Personal data */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {i18n.form.fullName} *
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => updateField('full_name', e.target.value)}
                  placeholder={i18n.form.fullNamePlaceholder}
                  className={`w-full px-4 py-3 rounded-xl border transition focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none ${
                    fieldErrors.full_name ? 'border-red-400 bg-red-50' : 'border-gray-200'
                  }`}
                  autoComplete="name"
                />
                {fieldErrors.full_name && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.full_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {i18n.form.whatsapp} *
                </label>
                <input
                  type="tel"
                  value={formData.whatsapp_number}
                  onChange={(e) => updateField('whatsapp_number', e.target.value)}
                  placeholder={i18n.form.whatsappPlaceholder}
                  className={`w-full px-4 py-3 rounded-xl border transition focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none ${
                    fieldErrors.whatsapp_number ? 'border-red-400 bg-red-50' : 'border-gray-200'
                  }`}
                  autoComplete="tel"
                />
                {fieldErrors.whatsapp_number && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.whatsapp_number}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {i18n.form.email}
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder={i18n.form.emailPlaceholder}
                  className={`w-full px-4 py-3 rounded-xl border transition focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none ${
                    fieldErrors.email ? 'border-red-400 bg-red-50' : 'border-gray-200'
                  }`}
                  autoComplete="email"
                />
                {fieldErrors.email && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Stay dates */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {i18n.form.checkinDate} *
                </label>
                <input
                  type="date"
                  value={formData.checkin_date}
                  onChange={(e) => updateField('checkin_date', e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border transition focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none ${
                    fieldErrors.checkin_date ? 'border-red-400 bg-red-50' : 'border-gray-200'
                  }`}
                />
                {fieldErrors.checkin_date && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.checkin_date}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {i18n.form.checkoutDate} *
                </label>
                <input
                  type="date"
                  value={formData.checkout_date}
                  onChange={(e) => updateField('checkout_date', e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border transition focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none ${
                    fieldErrors.checkout_date ? 'border-red-400 bg-red-50' : 'border-gray-200'
                  }`}
                />
                {fieldErrors.checkout_date && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.checkout_date}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {i18n.form.guestCount}
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={formData.guest_count}
                  onChange={(e) => updateField('guest_count', e.target.value)}
                  placeholder={i18n.form.guestCountPlaceholder}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 transition focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
            </div>
          )}

          {/* Step 3: Confirmation */}
          {step === 3 && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">{i18n.form.fullName}</span>
                  <span className="font-medium text-gray-900">{formData.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{i18n.form.whatsapp}</span>
                  <span className="font-medium text-gray-900">{formData.whatsapp_number}</span>
                </div>
                {formData.email && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">{i18n.form.email}</span>
                    <span className="font-medium text-gray-900">{formData.email}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">{i18n.form.checkinDate}</span>
                  <span className="font-medium text-gray-900">{formData.checkin_date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{i18n.form.checkoutDate}</span>
                  <span className="font-medium text-gray-900">{formData.checkout_date}</span>
                </div>
              </div>

              {/* Consent */}
              <label className={`flex items-start gap-3 p-4 rounded-xl border transition cursor-pointer ${
                fieldErrors.consent ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-indigo-300'
              }`}>
                <input
                  type="checkbox"
                  checked={formData.consent}
                  onChange={(e) => updateField('consent', e.target.checked)}
                  className="mt-0.5 h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="text-sm text-gray-700">{i18n.form.consent}</span>
                  <p className="text-xs text-gray-400 mt-1">{i18n.form.privacyNotice}</p>
                </div>
              </label>
              {fieldErrors.consent && (
                <p className="text-red-500 text-xs">{fieldErrors.consent}</p>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm">
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex gap-3 mt-6">
            {step > 1 && (
              <button
                onClick={prevStep}
                className="flex-1 px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition"
              >
                {i18n.form.back}
              </button>
            )}
            {step < 3 ? (
              <button
                onClick={nextStep}
                className="flex-1 px-6 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition shadow-sm"
              >
                {i18n.form.next}
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 px-6 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? i18n.form.submitting : i18n.form.submit}
              </button>
            )}
          </div>
        </div>

        {/* Branding */}
        <div className="text-center mt-6">
          <span className="text-xs text-gray-300 font-medium tracking-wider uppercase">
            Mais Hóspedes
          </span>
        </div>
      </div>
    </div>
  )
}
