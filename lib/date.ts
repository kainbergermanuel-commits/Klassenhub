// Alle Datumsberechnungen in LOKALER Zeit (Europe/Vienna), nicht UTC.
// toISOString() würde nahe Mitternacht (UTC+1/+2) das Datum um einen Tag verschieben.

function toISODateLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Heutiges Datum als YYYY-MM-DD (lokal). */
export function todayISO(): string {
  return toISODateLocal(new Date())
}

/**
 * Beginn des aktuellen Schuljahres als YYYY-MM-DD (1. September).
 * Ab September → heuriges Jahr, davor → Vorjahr. Dient als untere Grenze
 * für Streak-Berechnungen (eine Serie reicht nie über das Schuljahr hinaus).
 */
export function schoolYearStartISO(from: Date = new Date()): string {
  const year = from.getMonth() >= 8 ? from.getFullYear() : from.getFullYear() - 1
  return `${year}-09-01`
}

/** Datum +/- n Tage als YYYY-MM-DD (lokal). */
export function addDaysISO(days: number, from: Date = new Date()): string {
  const d = new Date(from)
  d.setDate(d.getDate() + days)
  return toISODateLocal(d)
}

/** Montag der Woche eines Datums als YYYY-MM-DD (lokal). */
export function getMondayOfWeek(from: Date = new Date()): string {
  const d = new Date(from)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return toISODateLocal(d)
}

/**
 * Montag der "relevanten" Woche:
 * Sonntag → nächste Woche (Vorschau), alle anderen Tage → aktuelle Woche.
 */
export function getRelevantMondayOfWeek(from: Date = new Date()): string {
  const d = new Date(from)
  if (d.getDay() === 0) d.setDate(d.getDate() + 1)
  return getMondayOfWeek(d)
}

/**
 * Montag der "relevanten" Woche für den Stundenplan: ab Freitag (Fr/Sa/So)
 * bereits die kommende Woche, weil der Unterricht für die aktuelle Woche
 * gelaufen ist. Bewusst eine eigene Funktion statt getRelevantMondayOfWeek()
 * zu ändern — die wird auch von Dienste/Planung/Startseite genutzt, wo
 * "ab Freitag nächste Woche" nicht gewünscht ist.
 */
export function getStundenplanMondayOfWeek(from: Date = new Date()): string {
  const d = new Date(from)
  const day = d.getDay() // 0=So, 5=Fr, 6=Sa
  const daysToNextMonday: Record<number, number> = { 5: 3, 6: 2, 0: 1 }
  if (day in daysToNextMonday) d.setDate(d.getDate() + daysToNextMonday[day])
  return getMondayOfWeek(d)
}

/** Kalenderwoche eines YYYY-MM-DD Datums. */
export function getWeekNumber(dateStr: string): number {
  const d = new Date(`${dateStr}T00:00:00`)
  const start = new Date(d.getFullYear(), 0, 1)
  return Math.ceil(((d.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7)
}

/** Letzter Tag des aktuellen Monats als YYYY-MM-DD (lokal). */
export function lastDayOfMonthISO(from: Date = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth() + 1, 0)
  return toISODateLocal(d)
}

/** Erster Tag des aktuellen Monats als YYYY-MM-DD (lokal). */
export function firstDayOfMonthISO(from: Date = new Date()): string {
  return toISODateLocal(new Date(from.getFullYear(), from.getMonth(), 1))
}

/** Letzter Tag des Vormonats als YYYY-MM-DD (lokal). */
export function lastDayOfPrevMonthISO(from: Date = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth(), 0)
  return toISODateLocal(d)
}

/** Erster Tag des Vormonats als YYYY-MM-DD (lokal). */
export function firstDayOfPrevMonthISO(from: Date = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth() - 1, 1)
  return toISODateLocal(d)
}

/** Monatslabel z.B. "Juni 2026" für ein YYYY-MM-DD Datum. */
export function monthLabel(dateStr: string): string {
  const [y, m] = dateStr.split('-')
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('de-AT', { month: 'long', year: 'numeric' })
}

/** Tage bis zu einem YYYY-MM-DD Datum (negativ = vergangen). */
export function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(`${dateStr}T00:00:00`)
  return Math.round((d.getTime() - today.getTime()) / 86400000)
}

export function daysUntilLabel(dateStr: string): string {
  const days = daysUntil(dateStr)
  if (days === 0) return 'Heute'
  if (days === 1) return 'Morgen'
  if (days < 0) return 'Vorbei'
  return `in ${days} Tagen`
}

/** Tageszeitabhängige Begrüßung ("Guten Morgen/Tag/Abend", lokale Zeit). */
export function greeting(from: Date = new Date()): string {
  const h = from.getHours()
  if (h < 12) return 'Guten Morgen'
  if (h < 18) return 'Guten Tag'
  return 'Guten Abend'
}
