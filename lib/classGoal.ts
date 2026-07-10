import { firstDayOfMonthISO, lastDayOfMonthISO } from '@/lib/date'

/**
 * Aktuelles Season-Fenster [erster Tag des Monats .. monthEnd].
 * ⚠️ TEST-HACK: monthEnd bis Ende des NÄCHSTEN Monats verlängert (identisch zu
 * streaks/page.tsx), damit Testdaten länger erhalten bleiben.
 * TODO(live): vor Go-Live an beiden Stellen auf den aktuellen Monat zurücksetzen.
 */
function currentSeasonWindow(): { start: string; end: string } {
  const start = firstDayOfMonthISO()
  const end = lastDayOfMonthISO(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1))
  return { start, end }
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
