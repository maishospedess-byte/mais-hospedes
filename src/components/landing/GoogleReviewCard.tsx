'use client'

import { useEffect, useRef, useState } from 'react'

export default function GoogleReviewCard() {
  const cardRef = useRef<HTMLDivElement>(null)
  const [animated, setAnimated] = useState(false)
  const [rating, setRating] = useState(0)
  const [reviews, setReviews] = useState(0)
  const [starsLit, setStarsLit] = useState(0)
  const [barsAnimated, setBarsAnimated] = useState(false)

  useEffect(() => {
    const el = cardRef.current
    if (!el) return

    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !animated) {
        setAnimated(true)
        obs.disconnect()

        // Animate stars
        for (let i = 0; i < 5; i++) {
          setTimeout(() => setStarsLit(prev => prev + 1), 300 + i * 200)
        }

        // Animate number
        const dur = 2000
        const st = performance.now()
        const tick = (now: number) => {
          const p = Math.min((now - st) / dur, 1)
          const ease = 1 - Math.pow(1 - p, 3)
          setRating(parseFloat((4.8 * ease).toFixed(1)))
          setReviews(Math.round(247 * ease))
          if (p < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)

        // Animate bars
        setTimeout(() => setBarsAnimated(true), 400)
      }
    }, { threshold: 0.3 })

    obs.observe(el)
    return () => obs.disconnect()
  }, [animated])

  const barWidths = ['82%', '12%', '4%', '1%', '1%']

  return (
    <div ref={cardRef} className="glass-card p-9 relative overflow-hidden" style={{
      animation: animated ? 'cardGlow 4s ease-in-out infinite' : 'none'
    }}>
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'linear-gradient(135deg, rgba(79,70,229,.03), transparent)'
      }} />

      {/* Hotel info */}
      <div className="flex items-center gap-4 mb-5">
        <div className="flex items-center justify-center text-2xl text-white font-black" style={{
          width: 56, height: 56, borderRadius: 14,
          background: 'linear-gradient(135deg, #4285F4, #34A853)',
          fontFamily: "'Plus Jakarta Sans', sans-serif"
        }}>G</div>
        <div>
          <div className="text-lg font-bold text-[var(--fg)]">Hotel Ipê Dourado</div>
          <div className="text-sm text-[var(--fg2)]">Hotel · Cuiabá, MT</div>
        </div>
      </div>

      {/* Rating */}
      <div className="flex items-baseline gap-3 mb-1">
        <div className="text-[52px] font-black" style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          background: 'linear-gradient(135deg, var(--star), #F97316)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>{rating}</div>
        <div className="flex gap-[3px]">
          {[0, 1, 2, 3, 4].map(i => (
            <svg key={i} width="28" height="28" viewBox="0 0 24 24" style={{
              color: 'var(--star)',
              opacity: i < starsLit ? 1 : 0.2,
              transform: i < starsLit ? 'scale(1.1)' : 'scale(1)',
              transition: 'opacity .4s, transform .4s'
            }}>
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" fill="currentColor" />
            </svg>
          ))}
        </div>
      </div>

      <div className="text-sm text-[var(--fg2)] mb-6">{reviews} avaliações no Google</div>

      {/* Bars */}
      <div className="space-y-[6px]">
        {[5, 4, 3, 2, 1].map((n, i) => (
          <div key={n} className="flex items-center gap-2 text-[12px] text-[var(--fg3)]">
            <span className="w-3 text-right">{n}</span>
            <div className="flex-1 h-[6px] rounded-[3px] overflow-hidden" style={{ background: 'rgba(255,255,255,.06)' }}>
              <div className="h-full rounded-[3px] transition-all duration-[1.2s]" style={{
                background: 'var(--star)',
                width: barsAnimated ? barWidths[i] : '0%',
                transitionTimingFunction: 'cubic-bezier(.16,1,.3,1)',
                transitionDelay: `${i * 150}ms`
              }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
