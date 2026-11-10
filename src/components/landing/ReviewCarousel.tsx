'use client'

const reviews = [
  { stars: '★★★★★', text: '"Nunca vi um hotel tão bem organizado. Recebi todas as informações pelo WhatsApp antes mesmo de perguntar!"', who: 'Ana Beatriz · 2 semanas atrás' },
  { stars: '★★★★★', text: '"Atendimento incrível. A mensagem de boas vindas no WhatsApp já me fez sentir em casa."', who: 'Carlos Eduardo · 1 mês atrás' },
  { stars: '★★★★★', text: '"Café da manhã maravilhoso, equipe atenciosa. O sistema de comunicação deles é o melhor que já vi."', who: 'Marina Silva · 3 semanas atrás' },
  { stars: '★★★★★', text: '"Voltei pela terceira vez. Sempre me surpreendem com a organização."', who: 'Roberto Almeida · 1 semana atrás' },
  { stars: '★★★★★', text: '"Hotel impecável! A pesquisa de satisfação mostrou que eles realmente se importam."', who: 'Juliana Costa · 2 meses atrás' },
  { stars: '★★★★★', text: '"Excelente! Recebi informações do Wi-Fi e café antes de chegar no quarto."', who: 'Fernando Souza · 3 semanas atrás' },
]

export default function ReviewCarousel() {
  const allReviews = [...reviews, ...reviews]

  return (
    <div className="overflow-hidden mt-12">
      <div className="flex gap-4" style={{
        animation: 'reviewSlide 20s linear infinite',
        width: 'max-content'
      }}>
        {allReviews.map((r, i) => (
          <div key={i} className="glass-card flex-shrink-0 p-5 hover:transform-none" style={{ width: 280 }}>
            <div className="text-[14px] mb-2" style={{ color: 'var(--star)', letterSpacing: 2 }}>{r.stars}</div>
            <div className="text-[13px] leading-relaxed mb-3 italic" style={{ color: 'var(--fg2)' }}>{r.text}</div>
            <div className="text-[12px]" style={{ color: 'var(--fg3)' }}>{r.who}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
