import Link from 'next/link'
import { createServerSupabase } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import WhatsAppPhone from '@/components/landing/WhatsAppPhone'
import GoogleReviewCard from '@/components/landing/GoogleReviewCard'
import ReviewCarousel from '@/components/landing/ReviewCarousel'
import RevealOnScroll from '@/components/landing/RevealOnScroll'
import {
  HeartHandshake,
  Star,
  MessageSquare,
  BarChart3,
  Zap,
  QrCode,
  Check,
  ArrowRight,
  TrendingUp,
  ScanLine,
} from 'lucide-react'

export default async function LandingPage() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/painel')

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
      {/* ═══ NAV ═══ */}
      <nav className="sticky top-0 z-50" style={{
        background: 'rgba(5,8,16,.75)',
        backdropFilter: 'blur(20px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
        borderBottom: '1px solid var(--glass-border)'
      }}>
        <div className="max-w-[1200px] mx-auto px-4 h-[68px] flex items-center justify-between">
          <div className="flex items-center gap-[10px]">
            <svg viewBox="0 0 40 40" fill="none" width="36" height="36">
              <rect width="40" height="40" rx="10" fill="url(#lg)" />
              <defs><linearGradient id="lg" x1="0" y1="0" x2="40" y2="40"><stop stopColor="#6366F1" /><stop offset="1" stopColor="#4F46E5" /></linearGradient></defs>
              <path d="M11 10h6v8h10v-8h6v20h-6v-8H17v8h-6z" fill="#fff" />
              <rect x="18" y="22" width="4" height="6" rx="1" fill="rgba(255,255,255,.5)" />
            </svg>
            <span className="text-[20px] font-extrabold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Mais<em className="not-italic" style={{ color: 'var(--bb)' }}>Hóspedes</em>
            </span>
          </div>
          <div className="flex gap-7 items-center">
            <a href="#como" className="hidden sm:block text-sm font-medium transition-colors hover:text-[var(--fg)]" style={{ color: 'var(--fg2)' }}>Como funciona</a>
            <a href="#recursos" className="hidden sm:block text-sm font-medium transition-colors hover:text-[var(--fg)]" style={{ color: 'var(--fg2)' }}>Recursos</a>
            <a href="#planos" className="hidden sm:block text-sm font-medium transition-colors hover:text-[var(--fg)]" style={{ color: 'var(--fg2)' }}>Planos</a>
            <Link href="/login" className="hidden sm:block text-sm font-medium transition-colors hover:text-[var(--fg)]" style={{ color: 'var(--fg2)' }}>Entrar</Link>
            <Link href="/register" className="btn-primary !py-[10px] !px-[22px] !text-[13px] !rounded-[10px]">Teste grátis</Link>
          </div>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-visible" style={{ paddingBlock: '80px 40px' }}>
        {/* Mesh gradient */}
        <div className="absolute pointer-events-none" style={{
          inset: '-300px',
          background: 'radial-gradient(ellipse 45% 35% at 25% 15%, rgba(79,70,229,.18), transparent 60%), radial-gradient(ellipse 35% 30% at 75% 25%, rgba(167,139,250,.1), transparent 50%), radial-gradient(ellipse 30% 25% at 50% 60%, rgba(99,102,241,.06), transparent 50%)'
        }} />

        {/* Orbs */}
        <div className="orb" style={{ width: 500, height: 500, top: -150, left: '5%', background: 'rgba(79,70,229,.14)' }} />
        <div className="orb" style={{ width: 350, height: 350, top: 100, right: 0, background: 'rgba(167,139,250,.08)', animationDelay: '3s' }} />
        <div className="orb" style={{ width: 200, height: 200, bottom: -50, left: '40%', background: 'rgba(99,102,241,.1)', animationDelay: '5s' }} />

        <div className="max-w-[1200px] mx-auto px-4 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-[60px] items-center">
            {/* Text */}
            <div>
              <RevealOnScroll>
                <h1 className="font-black tracking-tight mb-6" style={{
                  fontSize: 'clamp(36px, 5.5vw, 64px)',
                  letterSpacing: '-2px',
                  fontFamily: "'Plus Jakarta Sans', sans-serif"
                }}>
                  Transforme hóspedes em <span className="gradient-text">oportunidades de crescimento</span>
                </h1>
              </RevealOnScroll>

              <RevealOnScroll delay={0.1}>
                <p className="max-w-[480px] mb-9" style={{
                  fontSize: 'clamp(16px, 1.8vw, 18px)',
                  color: 'var(--fg2)',
                  lineHeight: 1.7
                }}>
                  Automatize o relacionamento com seus hóspedes, fortaleça sua reputação e transforme cada hospedagem em uma oportunidade de crescimento.
                </p>
              </RevealOnScroll>

              <RevealOnScroll delay={0.2}>
                <div className="flex gap-[14px] flex-wrap mb-4">
                  <Link href="/register" className="btn-primary !py-4 !px-11 !text-base !rounded-2xl inline-flex items-center gap-2">
                    Começar meus 14 dias grátis <ArrowRight size={18} />
                  </Link>
                  <a href="#como" className="btn-glass !py-4 !px-11 !text-base !rounded-2xl">
                    Ver como funciona
                  </a>
                </div>
              </RevealOnScroll>

              <RevealOnScroll delay={0.3}>
                <div className="text-[13px] flex items-center gap-1.5" style={{ color: 'var(--fg3)' }}>
                  <Check size={14} style={{ color: 'var(--green)' }} />
                  14 dias grátis · Sem cartão · Cancele quando quiser
                </div>
              </RevealOnScroll>
            </div>

            {/* 3D Phone */}
            <RevealOnScroll delay={0.2}>
              <WhatsAppPhone />
            </RevealOnScroll>
          </div>
        </div>
      </section>

      {/* ═══ GOOGLE RESULTS ═══ */}
      <section className="py-[120px]" id="resultados">
        <div className="max-w-[1200px] mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-[60px] items-center">
            <div>
              <RevealOnScroll>
                <div className="text-[11px] font-bold uppercase tracking-[3px] mb-[14px] flex items-center gap-2" style={{ color: 'var(--bb)' }}>
                  <TrendingUp size={14} />
                  Resultados reais
                </div>
                <h2 className="font-extrabold tracking-tight mb-4" style={{
                  fontSize: 'clamp(28px, 4vw, 42px)',
                  letterSpacing: '-1px',
                  fontFamily: "'Plus Jakarta Sans', sans-serif"
                }}>
                  Seus hóspedes<br />avaliam no <span className="gradient-text">Google</span>
                </h2>
                <p className="text-[17px] leading-relaxed mb-8" style={{ color: 'var(--fg2)' }}>
                  A pesquisa de satisfação e o link do Google são enviados automaticamente ao checkout. Mais visibilidade, mais confiança, mais reservas.
                </p>
              </RevealOnScroll>

              <RevealOnScroll delay={0.1}>
                <div className="flex gap-5 flex-wrap">
                  {[
                    { value: '+340%', label: 'mais avaliações', color: 'var(--star)' },
                    { value: '95%', label: 'taxa de entrega', color: 'var(--green)' },
                    { value: '4.8', label: 'nota média', color: 'var(--bb)' },
                  ].map(s => (
                    <div key={s.label} className="text-center">
                      <div className="text-4xl font-black" style={{
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        color: s.color
                      }}>{s.value}</div>
                      <div className="text-[13px]" style={{ color: 'var(--fg2)' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </RevealOnScroll>
            </div>

            <RevealOnScroll delay={0.2}>
              <GoogleReviewCard />
            </RevealOnScroll>
          </div>

          <RevealOnScroll>
            <ReviewCarousel />
          </RevealOnScroll>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="py-[120px] text-center" id="como">
        <div className="max-w-[1200px] mx-auto px-4">
          <RevealOnScroll>
            <div className="text-[11px] font-bold uppercase tracking-[3px] mb-[14px]" style={{ color: 'var(--bb)' }}>
              Como funciona
            </div>
          </RevealOnScroll>
          <RevealOnScroll>
            <h2 className="font-extrabold tracking-tight mb-4" style={{
              fontSize: 'clamp(30px, 4.5vw, 48px)',
              letterSpacing: '-1px',
              fontFamily: "'Plus Jakarta Sans', sans-serif"
            }}>
              Simples para a recepção,<br />mágico para o hóspede
            </h2>
          </RevealOnScroll>
          <RevealOnScroll>
            <p className="text-[17px] max-w-[540px] mx-auto mb-16" style={{ color: 'var(--fg2)' }}>
              Sem instalar app. O hóspede escaneia o QR Code e pronto.
            </p>
          </RevealOnScroll>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { num: '1', title: 'QR Code na recepção', desc: 'Imprima um QR Code único e permanente. Coloque na recepção, no quarto ou no balcão.', Icon: QrCode },
              { num: '2', title: 'Hóspede se cadastra', desc: 'Escaneia, preenche nome e WhatsApp em menos de 30 segundos. Sem baixar nada.', Icon: ScanLine },
              { num: '3', title: 'Painel em tempo real', desc: 'A recepção vê o cadastro instantaneamente, com alerta sonoro e visual.', Icon: Zap },
              { num: '4', title: 'Automações disparam', desc: 'Boas vindas, informações úteis, pesquisa de satisfação e convite Google. Tudo automático.', Icon: MessageSquare },
            ].map((step, i) => (
              <RevealOnScroll key={step.num} delay={i * 0.1}>
                <div className="glass-card p-8 text-left">
                  <div className="flex items-center justify-center text-white mb-5" style={{
                    width: 48, height: 48, borderRadius: 14,
                    background: 'linear-gradient(135deg, var(--brand), var(--bl))',
                    boxShadow: '0 8px 24px rgba(79,70,229,.3)',
                  }}>
                    <step.Icon size={22} />
                  </div>
                  <h3 className="text-[17px] font-bold mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{step.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--fg2)' }}>{step.desc}</p>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section className="py-[120px]" id="recursos">
        <div className="max-w-[1200px] mx-auto px-4">
          <RevealOnScroll>
            <div className="text-[11px] font-bold uppercase tracking-[3px] mb-[14px]" style={{ color: 'var(--bb)' }}>
              Recursos
            </div>
          </RevealOnScroll>
          <RevealOnScroll>
            <h2 className="font-extrabold tracking-tight mb-4" style={{
              fontSize: 'clamp(30px, 4.5vw, 48px)',
              letterSpacing: '-1px',
              fontFamily: "'Plus Jakarta Sans', sans-serif"
            }}>
              Cada hóspede é uma oportunidade de fazer seu hotel crescer.
            </h2>
          </RevealOnScroll>
          <RevealOnScroll>
            <p className="text-[17px] max-w-[600px] mb-16" style={{ color: 'var(--fg2)' }}>
              Da primeira impressão à avaliação no Google. Uma experiência memorável para seus hóspedes e resultados mensuráveis para seu negócio.
            </p>
          </RevealOnScroll>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { Icon: HeartHandshake, title: 'Relacionamento com hóspedes', desc: 'Crie uma conexão desde a chegada e mantenha uma comunicação personalizada durante a hospedagem.', bg: 'rgba(79,70,229,.12)', iconColor: '#818CF8' },
              { Icon: Star, title: 'Mais avaliações no Google', desc: 'Automatize convites para avaliações e fortaleça a reputação digital do hotel.', bg: 'rgba(245,158,11,.12)', iconColor: '#F59E0B' },
              { Icon: MessageSquare, title: 'Experiência automatizada', desc: 'Envie informações úteis pelo WhatsApp oficial do próprio hotel.', bg: 'rgba(37,211,102,.12)', iconColor: '#25D366' },
              { Icon: BarChart3, title: 'Satisfação em tempo real', desc: 'Descubra como os hóspedes avaliam sua experiência.', bg: 'rgba(79,70,229,.12)', iconColor: '#818CF8' },
              { Icon: TrendingUp, title: 'Resultados mensuráveis', desc: 'Acompanhe a evolução dos indicadores de satisfação e reputação.', bg: 'rgba(245,158,11,.12)', iconColor: '#F59E0B' },
              { Icon: Zap, title: 'Operação inteligente', desc: 'Reduza tarefas repetitivas da recepção com QR Code e automações.', bg: 'rgba(37,211,102,.12)', iconColor: '#25D366' },
            ].map((feat, i) => (
              <RevealOnScroll key={feat.title} delay={(i % 3) * 0.1}>
                <div className="glass-card p-8">
                  <div className="flex items-center justify-center mb-5" style={{
                    width: 50, height: 50, borderRadius: 14, background: feat.bg
                  }}>
                    <feat.Icon size={24} style={{ color: feat.iconColor }} />
                  </div>
                  <h3 className="text-[17px] font-bold mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{feat.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--fg2)' }}>{feat.desc}</p>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PRICING ═══ */}
      <section className="py-[120px] text-center" id="planos">
        <div className="max-w-[1200px] mx-auto px-4">
          <RevealOnScroll>
            <div className="text-[11px] font-bold uppercase tracking-[3px] mb-[14px]" style={{ color: 'var(--bb)' }}>
              Planos
            </div>
          </RevealOnScroll>
          <RevealOnScroll>
            <h2 className="font-extrabold tracking-tight mb-4" style={{
              fontSize: 'clamp(30px, 4.5vw, 48px)',
              letterSpacing: '-1px',
              fontFamily: "'Plus Jakarta Sans', sans-serif"
            }}>
              Invista na experiência.<br />Transforme hóspedes em novas oportunidades.
            </h2>
          </RevealOnScroll>
          <RevealOnScroll>
            <p className="text-[17px] max-w-[540px] mx-auto mb-16" style={{ color: 'var(--fg2)' }}>
              Automatize o relacionamento com seus hóspedes, fortaleça sua reputação e transforme cada hospedagem em uma oportunidade de crescimento.
            </p>
          </RevealOnScroll>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-[980px] mx-auto" style={{ perspective: '800px' }}>
            {/* Essencial */}
            <RevealOnScroll>
              <div className="glass-card p-9 flex flex-col text-left h-full">
                <div className="text-[15px] font-semibold mb-2" style={{ color: 'var(--fg2)' }}>Essencial</div>
                <div className="text-5xl font-black mb-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  R$97<small className="text-base font-normal" style={{ color: 'var(--fg3)' }}>/mês</small>
                </div>
                <div className="text-[13px] mb-7" style={{ color: 'var(--fg3)' }}>150 estadias · 2 usuários · 1 unidade</div>
                <ul className="flex flex-col gap-3 flex-1 mb-7">
                  {['QR Code permanente', 'Formulário trilíngue', 'Boas vindas automáticas', 'Pesquisa de satisfação', 'Link Google no checkout', 'Dashboard básico'].map(f => (
                    <li key={f} className="text-sm pl-[26px] relative flex items-start" style={{ color: 'var(--fg2)' }}>
                      <Check size={16} className="absolute left-0 top-[2px]" style={{ color: 'var(--bb)' }} />{f}
                    </li>
                  ))}
                </ul>
                <Link href="/register" className="btn-glass w-full justify-center">Começar</Link>
              </div>
            </RevealOnScroll>

            {/* Profissional */}
            <RevealOnScroll delay={0.1}>
              <div className="plan-popular rounded-[20px] p-9 flex flex-col text-left h-full md:scale-105 z-10 relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 px-5 py-[6px] text-[11px] font-bold tracking-[.5px] uppercase text-white rounded-b-xl" style={{
                  background: 'linear-gradient(135deg, var(--brand), var(--bl))'
                }}>Recomendado</div>
                <div className="text-[15px] font-semibold mt-6 mb-2" style={{ color: 'var(--bb)' }}>Profissional</div>
                <div className="text-5xl font-black mb-1" style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  background: 'linear-gradient(135deg, #fff, var(--bb))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  R$197<small className="text-base font-normal" style={{ WebkitTextFillColor: 'var(--fg2)' }}>/mês</small>
                </div>
                <div className="text-[13px] mb-7" style={{ color: 'var(--fg3)' }}>600 estadias · 5 usuários · 1 unidade</div>
                <ul className="flex flex-col gap-3 flex-1 mb-7">
                  {['Tudo do Essencial', '4 fluxos de automação', 'Mensagem durante estadia', 'Gestão de reputação', 'Dashboard avançado', 'Relatório mensal'].map(f => (
                    <li key={f} className="text-sm pl-[26px] relative flex items-start" style={{ color: 'var(--fg2)' }}>
                      <Check size={16} className="absolute left-0 top-[2px]" style={{ color: 'var(--bx)' }} />{f}
                    </li>
                  ))}
                </ul>
                <Link href="/register" className="btn-primary w-full justify-center">Teste grátis 14 dias</Link>
              </div>
            </RevealOnScroll>

            {/* Premium */}
            <RevealOnScroll delay={0.2}>
              <div className="glass-card p-9 flex flex-col text-left h-full">
                <div className="text-[15px] font-semibold mb-2" style={{ color: 'var(--fg2)' }}>Premium</div>
                <div className="text-5xl font-black mb-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  R$347<small className="text-base font-normal" style={{ color: 'var(--fg3)' }}>/mês</small>
                </div>
                <div className="text-[13px] mb-7" style={{ color: 'var(--fg3)' }}>1.500 estadias · 15 usuários · até 3 unidades</div>
                <ul className="flex flex-col gap-3 flex-1 mb-7">
                  {['Tudo do Profissional', 'Relatórios avançados', 'Suporte prioritário', 'Multiunidade', 'Gestão de equipe', 'Onboarding assistido'].map(f => (
                    <li key={f} className="text-sm pl-[26px] relative flex items-start" style={{ color: 'var(--fg2)' }}>
                      <Check size={16} className="absolute left-0 top-[2px]" style={{ color: 'var(--bb)' }} />{f}
                    </li>
                  ))}
                </ul>
                <Link href="/register" className="btn-glass w-full justify-center">Começar</Link>
              </div>
            </RevealOnScroll>
          </div>

          {/* WhatsApp cost note - kept transparent but not prominent */}
          <RevealOnScroll>
            <p className="text-[13px] mt-8 max-w-[480px] mx-auto" style={{ color: 'var(--fg3)' }}>
              O custo das mensagens do WhatsApp é pago diretamente à Meta, conforme uso. Detalhes na contratação.
            </p>
          </RevealOnScroll>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="py-[120px] text-center relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{
          width: 700, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(79,70,229,.1), transparent 65%)',
          filter: 'blur(60px)',
          animation: 'glow 4s ease-in-out infinite'
        }} />
        <div className="max-w-[1200px] mx-auto px-4 relative">
          <RevealOnScroll>
            <h2 className="font-extrabold tracking-tight mb-4" style={{
              fontSize: 'clamp(30px, 4.5vw, 44px)',
              letterSpacing: '-.5px',
              fontFamily: "'Plus Jakarta Sans', sans-serif"
            }}>
              Seu próximo hóspede pode ser<br />o motivo da sua <span className="gradient-text">próxima reserva</span>.
            </h2>
          </RevealOnScroll>
          <RevealOnScroll>
            <p className="text-[17px] max-w-[540px] mx-auto mb-10" style={{ color: 'var(--fg2)' }}>
              Encante quem chega, fortaleça sua reputação e transforme boas experiências em novas oportunidades para seu hotel.
            </p>
          </RevealOnScroll>
          <RevealOnScroll>
            <Link href="/register" className="btn-primary !py-4 !px-11 !text-[17px] !rounded-2xl inline-flex items-center gap-2">
              Começar meus 14 dias grátis <ArrowRight size={20} />
            </Link>
          </RevealOnScroll>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="py-10 text-center text-[13px]" style={{
        borderTop: '1px solid var(--glow2)',
        color: 'var(--fg3)'
      }}>
        <div className="max-w-[1200px] mx-auto px-4">
          <div className="flex items-center gap-[10px] justify-center mb-3">
            <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
              <rect width="40" height="40" rx="10" fill="url(#lg2)" />
              <defs><linearGradient id="lg2" x1="0" y1="0" x2="40" y2="40"><stop stopColor="#6366F1" /><stop offset="1" stopColor="#4F46E5" /></linearGradient></defs>
              <path d="M11 10h6v8h10v-8h6v20h-6v-8H17v8h-6z" fill="#fff" />
            </svg>
            <span className="text-base font-extrabold" style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              color: 'var(--fg2)'
            }}>
              Mais<em className="not-italic" style={{ color: 'var(--bb)' }}>Hóspedes</em>
            </span>
          </div>
          <p>Relacionamento, reputação e crescimento para hotéis.</p>
          <p className="mt-3 text-[12px]">&copy; 2026 Mais Hóspedes. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  )
}
