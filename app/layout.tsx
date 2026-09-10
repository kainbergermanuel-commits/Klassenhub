import type { Metadata, Viewport } from 'next'
import { Hanken_Grotesk, Bricolage_Grotesque } from 'next/font/google'
import ServiceWorkerRegister from '@/components/layout/ServiceWorkerRegister'
import { SPLASH_SCREENS } from '@/lib/splashScreens'
import './globals.css'

const hanken = Hanken_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-hanken',
})

// Display-Schrift nur für Seiten-Titel/Begrüßungen (h1), Body bleibt Hanken.
const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-display',
})

export const metadata: Metadata = {
  title: 'ClassHaven',
  description: 'Mobile-first Klassen-Kommunikation',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'ClassHaven',
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
    <html lang="de" className={`${hanken.variable} ${bricolage.variable}`}>
      <head>
        {/* Startbilder für den iOS-Homescreen. Ohne eine passende Media-Query
            zeigt iOS beim Start eine leere (je nach Erscheinungsbild schwarze)
            Fläche; das Manifest-`background_color` greift dort nicht.
            Erzeugt von scripts/generate-splash.py. */}
        {SPLASH_SCREENS.map(s => (
          <link
            key={`${s.w}x${s.h}`}
            rel="apple-touch-startup-image"
            href={`/splash/${s.w}x${s.h}.png`}
            media={`(device-width: ${s.deviceWidth}px) and (device-height: ${s.deviceHeight}px) and (-webkit-device-pixel-ratio: ${s.ratio}) and (orientation: portrait)`}
          />
        ))}
      </head>
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}
