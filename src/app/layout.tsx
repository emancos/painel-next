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
    <html lang="pt-BR" className={outfit.variable} data-admin-theme="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function() {
              try {
                var t = localStorage.getItem('admin_theme');
                if (t === 'light') {
                  document.documentElement.classList.remove('dark');
                  document.documentElement.setAttribute('data-admin-theme', 'light');
                } else {
                  document.documentElement.classList.add('dark');
                  document.documentElement.setAttribute('data-admin-theme', 'dark');
                }
              } catch(e) {
                document.documentElement.classList.add('dark');
                document.documentElement.setAttribute('data-admin-theme', 'dark');
              }
            })()`,
          }}
        />
      </head>
      <body className="min-h-screen bg-[#090D16] text-slate-100 antialiased selection:bg-cyan-500 selection:text-white">
        {children}
      </body>
    </html>
  )
}
