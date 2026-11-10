import Link from 'next/link'
import { createServerSupabase } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function LandingPage() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/painel')

  return (
    <div className="min-h-screen bg-[#0F1729] text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <h1 className="text-xl font-bold text-indigo-400">Mais Hóspedes</h1>
        <div className="flex gap-3">
          <Link href="/login" className="px-4 py-2 text-sm text-gray-300 hover:text-white transition">
            Entrar
          </Link>
          <Link href="/register" className="px-4 py-2 text-sm bg-indigo-600 rounded-lg hover:bg-indigo-700 transition font-medium">
            Criar conta grátis
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-block px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-xs font-medium mb-6">
          7 dias grátis — sem cartão
        </div>
        <h2 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
          Transforme hóspedes em{' '}
          <span className="text-indigo-400">avaliações 5 estrelas</span>
        </h2>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10">
          Automatize o check-in via WhatsApp, colete satisfação em tempo real e direcione
          hóspedes satisfeitos para avaliar no Google. Tudo no piloto automático.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/register" className="px-8 py-4 bg-indigo-600 rounded-xl text-lg font-semibold hover:bg-indigo-700 transition shadow-lg shadow-indigo-500/25">
            Começar grátis agora
          </Link>
          <a href="#como-funciona" className="px-8 py-4 border border-gray-600 rounded-xl text-lg font-medium hover:border-gray-400 transition text-gray-300">
            Como funciona?
          </a>
        </div>
      </section>

      {/* Numbers */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-3 gap-6 text-center">
          <div className="bg-white/5 rounded-xl p-6">
            <div className="text-3xl font-bold text-indigo-400">4.8★</div>
            <div className="text-sm text-gray-400 mt-1">Média de avaliações</div>
          </div>
          <div className="bg-white/5 rounded-xl p-6">
            <div className="text-3xl font-bold text-indigo-400">85%</div>
            <div className="text-sm text-gray-400 mt-1">Taxa de resposta</div>
          </div>
          <div className="bg-white/5 rounded-xl p-6">
            <div className="text-3xl font-bold text-indigo-400">3x</div>
            <div className="text-sm text-gray-400 mt-1">Mais avaliações</div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="como-funciona" className="max-w-4xl mx-auto px-6 py-16">
        <h3 className="text-2xl font-bold text-center mb-12">Como funciona</h3>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { icon: '📱', title: '1. QR Code na recepção', desc: 'Hóspede escaneia o QR Code e preenche seus dados em segundos. Sem app, sem papel.' },
            { icon: '💬', title: '2. WhatsApp automático', desc: 'Mensagens de boas-vindas, informações do hotel e pesquisa de satisfação enviadas automaticamente.' },
            { icon: '⭐', title: '3. Avaliações no Google', desc: 'Hóspedes satisfeitos são direcionados para avaliar no Google. Insatisfeitos, você resolve antes.' },
          ].map((step) => (
            <div key={step.title} className="text-center">
              <div className="w-14 h-14 bg-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">{step.icon}</div>
              <h4 className="font-semibold text-lg mb-2">{step.title}</h4>
              <p className="text-gray-400 text-sm">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <h3 className="text-2xl font-bold text-center mb-12">Planos</h3>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { name: 'Essencial', price: 97, rooms: 'Até 30 quartos', features: ['Check-in via QR Code', 'Pesquisa de satisfação', 'Direcionamento Google', '1 fluxo de automação'] },
            { name: 'Profissional', price: 197, rooms: 'Até 80 quartos', popular: true, features: ['Tudo do Essencial', '5 fluxos de automação', 'Mensagens personalizadas', 'Painel de analytics', 'Suporte prioritário'] },
            { name: 'Premium', price: 397, rooms: 'Quartos ilimitados', features: ['Tudo do Profissional', 'Automações ilimitadas', 'Multi-hotel', 'Acesso à API', 'Suporte dedicado'] },
          ].map((plan) => (
            <div key={plan.name} className={`rounded-2xl p-6 ${plan.popular ? 'bg-indigo-600 ring-2 ring-indigo-400 scale-105' : 'bg-white/5'}`}>
              {plan.popular && <div className="text-xs font-medium text-indigo-200 mb-2">Mais popular</div>}
              <h4 className="text-xl font-bold">{plan.name}</h4>
              <div className="text-sm text-gray-300 mt-1">{plan.rooms}</div>
              <div className="mt-4 mb-6">
                <span className="text-3xl font-bold">R${plan.price}</span>
                <span className="text-gray-400">/mês</span>
              </div>
              <ul className="space-y-2 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                    <span className="text-indigo-400 mt-0.5">✓</span>{f}
                  </li>
                ))}
              </ul>
              <Link href="/register" className={`block text-center py-3 rounded-xl font-medium transition ${plan.popular ? 'bg-white text-indigo-600 hover:bg-gray-100' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                Começar grátis
              </Link>
            </div>
          ))}
        </div>
        <p className="text-center text-sm text-gray-500 mt-6">Todos os planos incluem 7 dias grátis. Cancele quando quiser.</p>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 py-16 text-center">
        <h3 className="text-3xl font-bold mb-4">Pronto para ter mais avaliações?</h3>
        <p className="text-gray-400 mb-8">Comece agora e veja resultados na primeira semana.</p>
        <Link href="/register" className="inline-block px-8 py-4 bg-indigo-600 rounded-xl text-lg font-semibold hover:bg-indigo-700 transition shadow-lg shadow-indigo-500/25">
          Criar minha conta grátis
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 text-center text-sm text-gray-500">
        <p>© 2026 Mais Hóspedes. Todos os direitos reservados.</p>
      </footer>
    </div>
  )
}
