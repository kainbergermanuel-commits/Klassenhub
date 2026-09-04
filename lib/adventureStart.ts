import { todayISO } from '@/lib/date'

/**
 * Scharfschaltung des Abenteuers: In der ERSTEN Schulwoche 2026/27 bleibt die
 * gesamte Erzählebene (Story-Hero, Quests, Rätsel, Heldenbuch, /streaks) noch
 * verborgen und zeigt stattdessen nur einen Countdown-Teaser.
 *
 * Grund (Manuels Entscheidung): In Woche 1 gibt es noch keine Hausübungen, also
 * auch nichts zu erreichen. Ohne Sperre würden Kinder und Eltern ein Feature
 * bespielen, das noch leer ist — der Start soll ein Moment sein, kein
 * Leerlauf. Ab Woche 2 läuft alles unverändert weiter.
 *
 * Bewusst ein fixes Datum im Code statt einer App-Einstellung: einmalige
 * Angelegenheit dieses Schuljahres. Ab dem Starttag ist dieser Schalter tot
 * und darf im Lauf des Septembers wieder ausgebaut werden (mitsamt
 * AdventureTeaser und den vier Aufrufstellen).
 *
 * Die Zähl-Logik ist NICHT betroffen: Season-Fenster, Klassenziel und Streaks
 * rechnen weiter wie immer. Gesperrt ist nur die Anzeige.
 */
export const ADVENTURE_START = '2026-09-14' // Montag, Beginn der 2. Schulwoche

/** Ist das Abenteuer bereits freigeschaltet? Gilt für ALLE Rollen, auch für
 *  Lehrpersonen — die interagieren ohnehin nicht aktiv mit dem Abenteuer. */
export function adventureUnlocked(today: string = todayISO()): boolean {
  return today >= ADVENTURE_START
}

/** Kalendertage bis zur Freischaltung (0, sobald sie erreicht ist). Rein aus
 *  den ISO-Strings gerechnet, damit dieselbe lokale Tagesgrenze gilt wie in
 *  lib/date.ts (kein UTC-Versatz um Mitternacht). */
export function daysUntilAdventure(today: string = todayISO()): number {
  const ms = Date.parse(`${ADVENTURE_START}T00:00:00`) - Date.parse(`${today}T00:00:00`)
  return Math.max(0, Math.round(ms / 86_400_000))
}
