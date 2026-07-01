'use client'

import { useEffect } from 'react'

/**
 * Setzt die body-Hintergrundfarbe, solange diese Komponente gemountet ist,
 * und stellt sie danach wieder her. iOS färbt die Statusbar-/Notch-Zone im
 * PWA-Vollbild aus dieser Farbe — so bekommen die App-Seiten eine weiße
 * Statusbar (passend zur weißen Karte), während die Login-Seite beige bleibt.
 */
export default function BodyTheme({ color }: { color: string }) {
  useEffect(() => {
    const prev = document.body.style.backgroundColor
    document.body.style.backgroundColor = color
    return () => {
      document.body.style.backgroundColor = prev
    }
  }, [color])

  return null
}
