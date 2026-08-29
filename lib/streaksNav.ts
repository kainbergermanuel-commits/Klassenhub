/** Unterseiten von „Abenteuer" (/streaks) — durchblätterbar, jederzeit
 *  erreichbar, kein Zwang (Prinzip 4). Zentral hier, damit Sidebar und
 *  MobileHeader dieselbe Liste rendern (kein Drift zwischen Desktop/Mobile). */
export interface StreaksSubLink {
  href: string
  icon: string
  label: string
}

export const STREAKS_SUBLINKS: StreaksSubLink[] = [
  { href: '/streaks/reise', icon: 'map', label: 'Die Reise' },
  // "Erste Schritte" ist seit 2026-08 ein eigener Menüpunkt (/anleitung,
  // Abschnitt "Hilfe") — als Unterseite war die Anleitung nur sichtbar,
  // wenn man ohnehin schon im Abenteuer war.
]
