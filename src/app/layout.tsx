import type { Metadata, Viewport } from 'next'
import { Outfit } from 'next/font/google'
import '@/styles/globals.css'
import { getSystemFavicon } from '@/lib/favicon-server'
import { DynamicFavicon } from '@/components/DynamicFavicon'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
}

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
})

export async function generateMetadata(): Promise<Metadata> {
  const faviconUrl = await getSystemFavicon()

  return {
    title: 'Painel de Chamados Inteligente',
    description: 'Sistema modernizado de senhas de atendimento com síntese de voz neural e tempo real.',
    icons: {
      icon: [
        {
          url: faviconUrl,
          type: faviconUrl.endsWith('.svg')
            ? 'image/svg+xml'
            : faviconUrl.endsWith('.png')
            ? 'image/png'
            : faviconUrl.endsWith('.jpg') || faviconUrl.endsWith('.jpeg')
            ? 'image/jpeg'
            : 'image/x-icon',
        },
      ],
      shortcut: faviconUrl,
      apple: faviconUrl,
    },
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const faviconUrl = await getSystemFavicon()

  return (
    <html lang="pt-BR" className={outfit.variable} data-admin-theme="dark" suppressHydrationWarning>
      <head>
        <DynamicFavicon initialIcon={faviconUrl} />
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
