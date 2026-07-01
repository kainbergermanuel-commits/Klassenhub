import type { Metadata, Viewport } from 'next'
import { Hanken_Grotesk } from 'next/font/google'
import ServiceWorkerRegister from '@/components/layout/ServiceWorkerRegister'
import './globals.css'

const hanken = Hanken_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-hanken',
})

export const metadata: Metadata = {
  title: 'KlassenHub',
  description: 'Mobile-first Klassen-Kommunikation',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'KlassenHub',
    statusBarStyle: 'default',
  },
}

export const viewport: Viewport = {
  themeColor: '#0F8A82',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={hanken.variable}>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </head>
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}
