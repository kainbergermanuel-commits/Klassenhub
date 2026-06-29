import type { Gender } from '@/lib/types'

/**
 * Gegenderte Substantiv-Form für eine einzelne, bekannte Person.
 * m  → Grundform ("Schüler", "Klassensprecher")
 * f  → + "in"     ("Schülerin", "Klassensprecherin")
 * null/unbekannt → neutrale Doppelform mit Binnen-I ("Schüler:in")
 *
 * Funktioniert für alle relevanten Begriffe, deren weibliche Form per "-in"
 * gebildet wird (Schüler, Klassensprecher, Administrator, …).
 */
export function gendered(base: string, gender: Gender | null): string {
  if (gender === 'm') return base
  if (gender === 'f') return base + 'in'
  return base + ':in'
}
