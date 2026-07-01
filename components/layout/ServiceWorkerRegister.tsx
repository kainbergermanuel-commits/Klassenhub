'use client'

import { useEffect } from 'react'

/**
 * Registriert den Service Worker (/sw.js). Nötig, damit Chrome auf Android
 * die PWA als installierbar erkennt und den "App installieren"-Banner anbietet.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Registrierung fehlgeschlagen – App funktioniert trotzdem normal weiter.
      })
    }
  }, [])

  return null
}
