import type { Metadata } from 'next'
import { Outfit } from 'next/font/google'
import '@/styles/globals.css'

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Painel de Chamados Inteligente',
  description: 'Sistema modernizado de senhas de atendimento com síntese de voz neural e tempo real.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className={`dark ${outfit.variable}`}>
      <body className="min-h-screen bg-[#090D16] text-slate-100 antialiased selection:bg-cyan-500 selection:text-white">
        {children}
      </body>
    </html>
  )
}
