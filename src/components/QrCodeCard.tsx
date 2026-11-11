'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Copy, Download, ExternalLink, Check } from 'lucide-react'

export function hotelFormUrl(slug: string) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '')
  return `${base.replace(/\/$/, '')}/h/${slug}`
}

/** QR Code gerado localmente (alta resolução para impressão). A URL nunca muda. */
export function QrCodeCard({ slug, hotelName, size = 180, compact }: { slug: string; hotelName: string; size?: number; compact?: boolean }) {
  const url = hotelFormUrl(slug)
  const [png, setPng] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    QRCode.toDataURL(url, { width: 1200, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#0F172A', light: '#FFFFFF' } })
      .then(setPng).catch(() => setPng(null))
  }, [url])

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* */ }
  }

  return (
    <div className={`flex ${compact ? 'flex-row items-center' : 'flex-col sm:flex-row sm:items-center'} gap-4`}>
      <div className="p-2.5 rounded-xl shrink-0 self-start" style={{ background: '#fff', border: '1px solid var(--border)' }}>
        {png
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={png} alt={`QR Code do ${hotelName}`} width={size} height={size} style={{ width: size, height: size }} />
          : <div style={{ width: size, height: size }} />}
      </div>
      <div className="min-w-0 space-y-2.5">
        {!compact && <p className="text-sm" style={{ color: 'var(--fg2)' }}>Imprima e deixe na recepção. O hóspede aponta a câmera do celular e faz o cadastro em menos de 1 minuto. Este endereço é permanente.</p>}
        <div className="ui-kbd break-all inline-block max-w-full">{url}</div>
        <div className="flex flex-wrap gap-2">
          {png && (
            <a href={png} download={`qrcode-${slug}.png`} className="ui-btn ui-btn-primary ui-btn-sm"><Download size={14} /> Baixar PNG</a>
          )}
          <button onClick={copy} className="ui-btn ui-btn-secondary ui-btn-sm">{copied ? <><Check size={14} /> Copiado</> : <><Copy size={14} /> Copiar link</>}</button>
          <a href={url} target="_blank" rel="noopener noreferrer" className="ui-btn ui-btn-ghost ui-btn-sm"><ExternalLink size={14} /> Abrir formulário</a>
        </div>
      </div>
    </div>
  )
}
