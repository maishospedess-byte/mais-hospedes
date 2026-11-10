'use client'

import { useEffect, useRef, ReactNode } from 'react'

export default function RevealOnScroll({ children, delay = 0, className = '' }: {
  children: ReactNode
  delay?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          setTimeout(() => el.classList.add('visible'), delay * 1000)
          obs.unobserve(e.target)
        }
      })
    }, { threshold: 0.12 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [delay])

  return (
    <div ref={ref} className={`reveal ${className}`}>
      {children}
    </div>
  )
}
