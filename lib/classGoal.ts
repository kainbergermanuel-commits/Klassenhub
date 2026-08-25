import { firstDayOfMonthISO, lastDayOfMonthISO } from '@/lib/date'
import { getSeasonTheme } from '@/lib/seasonTheme'

/**
 * Aktuelles Season-Fenster [erster Tag des Monats .. letzter Tag des Monats].
 * Eine Season = ein Kalendermonat, identisch zu streaks/page.tsx und
 * streaks/reise/page.tsx — die drei müssen dasselbe Fenster verwenden, sonst
 * weichen Klassenziel-Fortschritt und Etappen-Leiste voneinander ab.
 */
function currentSeasonWindow(): { start: string; end: string } {
  return { start: firstDayOfMonthISO(), end: lastDayOfMonthISO() }
}

// ─── VORSCHLAGSZIEL ─────────────────────────────────────────────────────────
// Ohne gesetztes Klassenziel verschwand früher die gesamte Erzählebene: das
// Glas-Panel auf /streaks entfiel für Schüler:innen, die StoryHeroCard fror auf
// Etappe 1 ein und /streaks/reise zeigte ALLE Etappen als gesperrt. Ein
// vergessenes Monatsziel legte damit das ganze Abenteuer still.
//
// Deshalb rechnet das System selbst eines aus und markiert es als Vorschlag.
// Bewusst KEIN DB-Eintrag: `class_goals` bleibt leer, bis die Lehrperson ein
// echtes Ziel setzt, das den Vorschlag dann ohne Sonderfall überschreibt.

/** Anteil der theoretisch möglichen Bestätigungen, den ein Vorschlag ansetzt.
 *  Fordernd, aber erreichbar: nicht jede HÜ wird von jedem Kind bestätigt. */
const SUGGESTION_SHARE = 0.7
/** Untergrenze, damit ein Vorschlag in HÜ-armen Monaten nicht bei 2 landet. */
const SUGGESTION_MIN = 10
/** Angenommene HÜ-Zahl, wenn weder dieser noch der Vormonat etwas hergibt
 *  (z. B. in der allerersten Schulwoche im September). */
const ASSUMED_MONTHLY_HOMEWORK = 4

/**
 * Vorschlagswert für ein nicht gesetztes Klassenziel. Basis ist die tatsächliche
 * HÜ-Zahl des Monats; ist der laufende Monat noch dünn besetzt, zieht der
 * Vormonat als Referenz. `null` = für diese Season ist bewusst kein Ziel
 * vorgesehen (Epilog-Welt) oder es gibt keine Kinder.
 *
 * Rein rechnerisch aus bereits geladenen Daten, macht KEINE eigene DB-Abfrage.
 */
export function suggestGoalTarget(
  allHomework: { due_date: string }[],
  studentCount: number,
  season: string,
): number | null {
  if (getSeasonTheme(season).isEpilogue) return null
  if (studentCount <= 0) return null

  const now = new Date()
  const prevRef = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const inRange = (from: string, to: string) =>
    allHomework.filter(h => h.due_date >= from && h.due_date <= to).length

  const base = Math.max(
    inRange(firstDayOfMonthISO(now), lastDayOfMonthISO(now)),
    inRange(firstDayOfMonthISO(prevRef), lastDayOfMonthISO(prevRef)),
    ASSUMED_MONTHLY_HOMEWORK,
  )
  return Math.max(SUGGESTION_MIN, Math.round(base * studentCount * SUGGESTION_SHARE))
}

/**
 * Zählt die eltern-bestätigten Erledigungen, deren Hausübung in der laufenden
 * Season liegt (= Klassenziel-Fortschritt). Rein rechnerisch aus bereits
 * geladenen Daten — macht KEINE eigene DB-Abfrage.
 */
export function countClassGoalDone(
  allHomework: { id: string; due_date: string }[],
  completions: { homework_id: string; confirmed_by_parent_at: string | null }[],
): number {
  const { start, end } = currentSeasonWindow()
  const seasonHwIds = new Set(
    allHomework.filter(h => h.due_date >= start && h.due_date <= end).map(h => h.id),
  )
  if (seasonHwIds.size === 0) return 0
  let done = 0
  for (const c of completions) {
    if (c.confirmed_by_parent_at && seasonHwIds.has(c.homework_id)) done++
  }
  return done
}
