import type { Metadata, Viewport } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Mais Hóspedes",
  description: "Automatize a comunicação do seu hotel via WhatsApp",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" data-app-theme="dark" suppressHydrationWarning>
      <head>
        {/* aplica o tema salvo antes da primeira pintura (evita "piscar") */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('mh-theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'}document.documentElement.setAttribute('data-app-theme',t)}catch(e){}`,
          }}
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@500;600;700;800;900&display=swap"
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
