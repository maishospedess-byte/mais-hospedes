'use client'

import { useEffect, useRef, useState } from 'react'

type Message = {
  type: 'in' | 'out'
  html: string
}

const flows: Message[][] = [
  [
    { type: 'in', html: 'Olá, Ana! 👋<br/><br/>Bem vinda ao <b>Hotel Ipê Dourado</b>! Ficamos felizes em recebê-la.<br/><br/>Seu cadastro foi recebido com sucesso. Qualquer dúvida, é só responder aqui 😊<span class="tm">14:32 <span class="ck">✓✓</span></span>' },
    { type: 'out', html: 'Oi! Obrigada!! Estou chegando agora 😊<span class="tm">14:33 <span class="ck">✓✓</span></span>' },
    { type: 'in', html: 'Perfeito, Ana! A equipe já está preparando tudo. Até já! 🏨<span class="tm">14:33 <span class="ck">✓✓</span></span>' },
  ],
  [
    { type: 'in', html: 'Ana, sua estadia está confirmada! 🎉<br/><br/>📋 <b>Informações úteis:</b><br/>☕ Café: 06:30 às 10:00<br/>📶 Wi-Fi: IpeGuest<br/>🔑 Senha: bemvindo2026<br/>🕐 Checkout: até 12:00<br/><br/>Ótima estadia!<span class="tm">14:45 <span class="ck">✓✓</span></span>' },
    { type: 'out', html: 'Que atencioso! Obrigada pelas infos 🙏<span class="tm">14:47 <span class="ck">✓✓</span></span>' },
  ],
  [
    { type: 'in', html: 'Ana, obrigado pela estadia! 💛<br/><br/>De 0 a 10, como foi sua experiência?<br/><br/>⭐ Se puder, avalie no Google:<br/><span class="lk">g.page/r/hotel-ipe-dourado/review</span><span class="tm">12:01 <span class="ck">✓✓</span></span>' },
    { type: 'out', html: '10! Amei tudo! Vou avaliar agora ⭐⭐⭐⭐⭐<span class="tm">12:03 <span class="ck">✓✓</span></span>' },
    { type: 'in', html: 'Ficamos muito felizes! 🎉 Obrigado pela avaliação. Volte sempre!<span class="tm">12:03 <span class="ck">✓✓</span></span>' },
  ],
]

const pillLabels = ['Boas vindas', 'Informações', 'Satisfação']

export default function WhatsAppPhone() {
  const chatRef = useRef<HTMLDivElement>(null)
  const [messages, setMessages] = useState<{ type: string; html: string; id: number }[]>([])
  const [showTyping, setShowTyping] = useState(false)
  const [activePill, setActivePill] = useState(0)
  const flowRef = useRef(0)
  const runningRef = useRef(false)
  const idCounter = useRef(0)

  useEffect(() => {
    if (runningRef.current) return
    runningRef.current = true

    async function sleep(ms: number) {
      return new Promise(resolve => setTimeout(resolve, ms))
    }

    async function showMessages(flowMsgs: Message[]) {
      for (const m of flowMsgs) {
        if (m.type === 'in') {
          setShowTyping(true)
          await sleep(1000)
          setShowTyping(false)
        } else {
          await sleep(600)
        }
        const id = idCounter.current++
        setMessages(prev => [...prev, { type: m.type, html: m.html, id }])
        await sleep(400)
      }
    }

    async function runLoop() {
      while (true) {
        const idx = flowRef.current
        setActivePill(idx)
        setMessages([])
        await sleep(400)
        await showMessages(flows[idx])
        await sleep(2500)
        flowRef.current = (flowRef.current + 1) % flows.length
      }
    }

    setTimeout(() => runLoop(), 800)
  }, [])

  return (
    <div>
      {/* 3D Phone */}
      <div style={{ perspective: '1200px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ animation: 'float 6s ease-in-out infinite', transformStyle: 'preserve-3d' }}>
          <div className="relative" style={{
            width: 280,
            background: 'linear-gradient(160deg, #1A1A35, #0E0E22)',
            borderRadius: 40,
            padding: 8,
            boxShadow: '0 80px 150px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.06), inset 0 1px 0 rgba(255,255,255,.08), 0 0 100px rgba(79,70,229,.1)',
          }}>
            {/* Notch */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10" style={{
              width: 100, height: 24, background: '#000', borderRadius: '0 0 14px 14px'
            }}>
              <div className="absolute top-[7px] left-1/2 -translate-x-1/2" style={{
                width: 48, height: 5, background: '#1a1a2e', borderRadius: 3
              }} />
            </div>

            {/* Screen */}
            <div style={{ borderRadius: 34, overflow: 'hidden', background: '#ECE5DD' }}>
              {/* WhatsApp Header */}
              <div className="flex items-center gap-2" style={{
                background: '#075E54', padding: '32px 12px 8px'
              }}>
                <div className="flex items-center justify-center text-[11px] text-white font-bold" style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #128C7E, #25D366)'
                }}>ID</div>
                <div>
                  <div className="text-white text-[12px] font-semibold">Hotel Ipê Dourado</div>
                  <div className="text-[9px]" style={{ color: 'rgba(255,255,255,.55)' }}>online</div>
                </div>
              </div>

              {/* Chat body */}
              <div ref={chatRef} className="flex flex-col gap-1 relative" style={{
                padding: 8, minHeight: 320
              }}>
                <div className="self-center text-[9px] px-[10px] py-[2px] rounded-[5px]"
                  style={{ background: 'rgba(0,0,0,.07)', color: 'rgba(0,0,0,.4)' }}>
                  Hoje
                </div>

                {messages.map((m) => (
                  <div key={m.id}
                    className={`max-w-[86%] ${m.type === 'out' ? 'self-end' : 'self-start'}`}
                    style={{
                      padding: '6px 8px',
                      borderRadius: m.type === 'out' ? '7px 7px 2px 7px' : '7px 7px 7px 2px',
                      fontSize: '10.5px',
                      lineHeight: 1.45,
                      color: '#303030',
                      background: m.type === 'out' ? '#DCF8C6' : '#fff',
                      animation: 'msgPop .45s cubic-bezier(.16,1,.3,1) forwards',
                    }}
                    dangerouslySetInnerHTML={{ __html: m.html }}
                  />
                ))}

                {/* Typing indicator */}
                {showTyping && (
                  <div className="self-start flex gap-[3px]" style={{
                    background: '#fff', padding: '8px 12px',
                    borderRadius: '7px 7px 7px 2px',
                  }}>
                    {[0, 1, 2].map(i => (
                      <span key={i} className="block" style={{
                        width: 6, height: 6, borderRadius: '50%', background: '#90949c',
                        animation: `dotPulse 1.2s ease-in-out infinite`,
                        animationDelay: `${i * 0.2}s`,
                      }} />
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center gap-[5px]" style={{
                background: '#F0F0F0', padding: '6px 8px'
              }}>
                <div className="flex-1 text-[10px] px-3 py-[6px] rounded-[18px] bg-white" style={{ color: '#999' }}>
                  Mensagem
                </div>
                <div className="flex items-center justify-center flex-shrink-0" style={{
                  width: 28, height: 28, borderRadius: '50%', background: '#075E54'
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#fff"><path d="M2 21l21-9L2 3v7l15 2-15 2z" /></svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Flow pills */}
      <div className="flex justify-center gap-2 mt-6 flex-wrap">
        {pillLabels.map((label, i) => (
          <div key={label} className="px-[14px] py-[6px] rounded-[20px] text-[11px] font-semibold transition-all duration-400" style={{
            color: activePill === i ? 'var(--bb)' : 'var(--fg3)',
            background: activePill === i ? 'rgba(99,102,241,.08)' : 'var(--glass)',
            border: activePill === i ? '1px solid var(--bl)' : '1px solid transparent',
            boxShadow: activePill === i ? '0 0 20px rgba(99,102,241,.15)' : 'none',
          }}>
            {label}
          </div>
        ))}
      </div>

      <style jsx global>{`
        .tm { font-size: 8px; color: rgba(0,0,0,.3); float: right; margin-left: 5px; margin-top: 2px; }
        .ck { color: #53BDEB; font-size: 8px; }
        .lk { color: #1A73E8; text-decoration: underline; font-size: 9.5px; }
      `}</style>
    </div>
  )
}
