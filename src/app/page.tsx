import Link from 'next/link'
import { createServerSupabase } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function LandingPage() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/painel')

  return (
    <div className="min-h-screen bg-[#0A0E1A] text-white overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/15 rounded-full blur-[100px]" />
        <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[80px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-sm font-bold">M</div>
          <span className="text-lg font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Mais Hóspedes</span>
        </div>
        <div className="flex gap-3 items-center">
          <Link href="/login" className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors duration-300">
            Entrar
          </Link>
          <Link href="/register" className="px-5 py-2.5 text-sm bg-gradient-to-r from-indigo-600 to-indigo-500 rounded-full hover:from-indigo-500 hover:to-indigo-400 transition-all duration-300 font-medium shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40">
            Criar conta grátis
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-indigo-300 rounded-full text-sm font-medium mb-8 backdrop-blur-sm">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            7 dias grátis — sem cartão de crédito
          </div>
        </div>
        
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.1] mb-8 animate-fade-in-up animation-delay-200 tracking-tight">
          Transforme hóspedes em{' '}
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-300 bg-clip-text text-transparent">avaliações 5 estrelas</span>
        </h1>
        
        <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-12 animate-fade-in-up animation-delay-400 leading-relaxed">
          Automatize o check-in via WhatsApp, colete satisfação em tempo real e direcione 
          hóspedes satisfeitos para avaliar no Google. Tudo no piloto automático.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up animation-delay-600">
          <Link href="/register" className="group px-8 py-4 bg-gradient-to-r from-indigo-600 to-indigo-500 rounded-2xl text-lg font-semibold hover:from-indigo-500 hover:to-indigo-400 transition-all duration-300 shadow-2xl shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02]">
            Começar grátis agora
            <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">→</span>
          </Link>
          <a href="#como-funciona" className="px-8 py-4 border border-white/15 rounded-2xl text-lg font-medium hover:bg-white/5 hover:border-white/25 transition-all duration-300 text-gray-300 backdrop-blur-sm">
            Como funciona?
          </a>
        </div>
      </section>

      {/* Social proof numbers */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-3 gap-4 md:gap-6">
          {[
            { value: '4.8★', label: 'Média de avaliações', icon: '⭐' },
            { value: '85%', label: 'Taxa de resposta', icon: '💬' },
            { value: '3x', label: 'Mais avaliações', icon: '📈' },
          ].map((stat, i) => (
            <div key={stat.label} className={`group bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 md:p-8 text-center backdrop-blur-sm hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-500 animate-fade-in-up`} style={{ animationDelay: `${0.6 + i * 0.15}s` }}>
              <div className="text-2xl mb-2">{stat.icon}</div>
              <div className="text-3xl md:text-4xl font-extrabold bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">{stat.value}</div>
              <div className="text-sm text-gray-500 mt-2">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="como-funciona" className="relative z-10 max-w-5xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <span className="text-indigo-400 text-sm font-semibold uppercase tracking-widest">Simples e eficiente</span>
          <h2 className="text-3xl md:text-4xl font-bold mt-3">Como funciona</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { 
              step: '01', 
              icon: '📱', 
              title: 'QR Code na recepção', 
              desc: 'Hóspede escaneia o QR Code e preenche seus dados em segundos. Sem app, sem papel, sem atrito.',
              gradient: 'from-blue-500/20 to-indigo-500/20'
            },
            { 
              step: '02', 
              icon: '💬', 
              title: 'WhatsApp automático', 
              desc: 'Mensagens de boas-vindas, informações do hotel e pesquisa de satisfação enviadas automaticamente.',
              gradient: 'from-indigo-500/20 to-purple-500/20'
            },
            { 
              step: '03', 
              icon: '⭐', 
              title: 'Avaliações no Google', 
              desc: 'Hóspedes satisfeitos são direcionados para avaliar no Google. Insatisfeitos, você resolve antes.',
              gradient: 'from-purple-500/20 to-pink-500/20'
            },
          ].map((item) => (
            <div key={item.step} className="group relative">
              <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              <div className="relative bg-white/[0.03] border border-white/[0.06] rounded-3xl p-8 hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-500 h-full">
                <div className="flex items-center gap-3 mb-5">
                  <span className="text-xs font-bold text-indigo-400/60 tracking-wider">{item.step}</span>
                  <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                </div>
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="font-bold text-lg mb-3">{item.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <span className="text-indigo-400 text-sm font-semibold uppercase tracking-widest">Planos</span>
          <h2 className="text-3xl md:text-4xl font-bold mt-3">Escolha o ideal para seu hotel</h2>
          <p className="text-gray-500 mt-4">Todos incluem 7 dias grátis. Cancele quando quiser.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 items-start">
          {[
            { name: 'Essencial', price: 97, rooms: 'Até 30 quartos', features: ['Check-in via QR Code', 'Pesquisa de satisfação', 'Direcionamento Google', '1 fluxo de automação'] },
            { name: 'Profissional', price: 197, rooms: 'Até 80 quartos', popular: true, features: ['Tudo do Essencial', '5 fluxos de automação', 'Mensagens personalizadas', 'Painel de analytics', 'Suporte prioritário'] },
            { name: 'Premium', price: 397, rooms: 'Quartos ilimitados', features: ['Tudo do Profissional', 'Automações ilimitadas', 'Multi-hotel (até 5)', 'Acesso à API', 'Suporte dedicado'] },
          ].map((plan) => (
            <div key={plan.name} className={`relative group rounded-3xl p-8 transition-all duration-500 ${
              plan.popular 
                ? 'bg-gradient-to-b from-indigo-600 to-indigo-700 border-2 border-indigo-400/30 shadow-2xl shadow-indigo-500/20 scale-[1.02] md:scale-105' 
                : 'bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.12]'
            }`}>
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-amber-400 to-orange-400 rounded-full text-xs font-bold text-black">
                  Mais popular
                </div>
              )}
              <h3 className="text-xl font-bold">{plan.name}</h3>
              <p className={`text-sm mt-1 ${plan.popular ? 'text-indigo-200' : 'text-gray-500'}`}>{plan.rooms}</p>
              <div className="mt-6 mb-8">
                <span className="text-4xl font-extrabold">R${plan.price}</span>
                <span className={`${plan.popular ? 'text-indigo-200' : 'text-gray-500'}`}>/mês</span>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className={`flex items-start gap-3 text-sm ${plan.popular ? 'text-indigo-100' : 'text-gray-400'}`}>
                    <svg className={`w-5 h-5 flex-shrink-0 mt-0.5 ${plan.popular ? 'text-indigo-300' : 'text-indigo-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/register" className={`block text-center py-3.5 rounded-2xl font-semibold transition-all duration-300 ${
                plan.popular 
                  ? 'bg-white text-indigo-600 hover:bg-gray-100 shadow-lg' 
                  : 'bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1]'
              }`}>
                Começar grátis
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 py-24 text-center">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 rounded-3xl blur-2xl" />
          <div className="relative bg-white/[0.03] border border-white/[0.06] rounded-3xl p-12 md:p-16 backdrop-blur-sm">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Pronto para ter mais avaliações?</h2>
            <p className="text-gray-400 mb-10 text-lg">Comece agora e veja resultados na primeira semana.</p>
            <Link href="/register" className="inline-block px-10 py-4 bg-gradient-to-r from-indigo-600 to-indigo-500 rounded-2xl text-lg font-semibold hover:from-indigo-500 hover:to-indigo-400 transition-all duration-300 shadow-2xl shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02]">
              Criar minha conta grátis →
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.06] py-8 text-center text-sm text-gray-600">
        <p>© 2026 Mais Hóspedes. Todos os direitos reservados.</p>
      </footer>
    </div>
  )
}
