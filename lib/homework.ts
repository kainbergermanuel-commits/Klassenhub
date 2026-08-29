/** Minimalform: alles, was für die Fristberechnung nötig ist. Bewusst kein
 *  HomeworkWithStatus, damit auch Ansichten mit dem schlanken Homework-Typ
 *  (z.B. StudentHomeworkPanel) dieselbe Regel nutzen können. */
type WithDue = { due_date: string; extended_due_date?: string }

/**
 * Das für DIESES Kind geltende Fälligkeitsdatum.
 *
 * Normalerweise `due_date`. Hat das Kind einen Zeitkristall eingesetzt
 * (siehe app/actions/useTimeCrystal.ts), gilt die persönlich verlängerte
 * Frist — die HÜ ist dann noch nicht vorbei und muss abhakbar bleiben.
 *
 * Immer diese Funktion verwenden statt `hw.due_date`, wenn es um „offen
 * oder vorbei?" geht. Für die reine Anzeige des Termins (Monatsgruppen der
 * vergangenen HÜ) bleibt dagegen `due_date` richtig, sonst springt eine
 * Karte in einen anderen Monat.
 *
 * Gegenstück auf der Streak-Seite: effectiveDueDate() in lib/streak.ts.
 */
export function dueDateFor(hw: WithDue): string {
  return hw.extended_due_date ?? hw.due_date
}

/** Um wie viele Tage die Frist verlängert wurde (0 = keine Verlängerung). */
export function extensionDays(hw: WithDue): number {
  if (!hw.extended_due_date) return 0
  const a = new Date(`${hw.due_date}T00:00:00`).getTime()
  const b = new Date(`${hw.extended_due_date}T00:00:00`).getTime()
  return Math.round((b - a) / 86400000)
}
