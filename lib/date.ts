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

/** Kalendertag (YYYY-MM-DD) eines UTC-Zeitstempels in einer festen Zeitzone —
 *  unabhängig davon, in welcher Zeitzone der Server läuft. Für "wurde das heute
 *  gemacht?"-Vergleiche mit `completed_at`/`created_at` (die als UTC gespeichert
 *  sind): naives `.slice(0,10)` würde in den Stunden nach UTC-Mitternacht
 *  (= 1–2 Uhr Wiener Zeit) den falschen Tag liefern. IMMER beide Seiten des
 *  Vergleichs über diesen Helper führen (todayLocal()), sonst mischt man Bezüge.
 *  Bewusst NICHT für Streak-/Fälligkeits-Logik verwendet — die ist in sich
 *  konsistent (todayISO gegen due_date), ein Wechsel dort wäre eine eigene,
 *  riskantere Entscheidung. */
export function localDateOf(iso: string, timeZone = 'Europe/Vienna'): string {
  // 'en-CA' liefert das Format YYYY-MM-DD.
  return new Date(iso).toLocaleDateString('en-CA', { timeZone })
}

/** Heutiger Wiener Kalendertag (Gegenstück zu localDateOf für die Jetzt-Seite). */
export function todayLocal(timeZone = 'Europe/Vienna'): string {
  return localDateOf(new Date().toISOString(), timeZone)
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

/* ── Fälligkeitsregel ────────────────────────────────────────────────────
 *  Eine Hausübung, die am Tag D fällig ist, muss am ABEND DES VORTAGS
 *  erledigt sein. Am Tag D selbst ist sie vorbei und lässt sich nicht mehr
 *  abhaken. Das ist die einzige Quelle für diese Regel: nie wieder
 *  `due_date <= today` frei hinschreiben, sondern isOver()/isActionable().
 *
 *  lib/streak.ts rechnet identisch (effectiveDueDate(...) <= today), nutzt
 *  diese Helfer aber bewusst NICHT — die Streak-Logik bleibt unangetastet.
 *
 *  NICHT betroffen ist die Eltern-Bestätigung: die darf jederzeit später
 *  nachkommen und repariert die Flamme rückwirkend, weil computeStreak nur
 *  prüft OB bestätigt wurde, nicht WANN (siehe confirmHomeworkCompletion.ts).
 */

/** Fällig am Tag D heißt: am Tag D ist es vorbei. */
export function isOver(dueDate: string, today: string): boolean {
  return dueDate <= today
}

/** Noch machbar — die HÜ lässt sich heute Abend erledigen. */
export function isActionable(dueDate: string, today: string): boolean {
  return dueDate > today
}

/* ── Fälligkeits-Anzeige ─────────────────────────────────────────────────
 *  Eine einzige Quelle für Text, Farbe und Achtung-Icon bei Hausübungen,
 *  damit Lehrer-, Schüler- und Eltern-Ansicht nicht auseinanderlaufen.
 *  Bezugspunkt ist IMMER die Fälligkeit ("Morgen fällig", "In 3 Tagen"),
 *  nie die Handlung — der Vortag-Hinweis steht im Tooltip und in der
 *  Anleitung, damit die Zeile kurz bleibt und nicht zwei Zeitrechnungen
 *  mischt. Relativ, wenn nah; absolut, wenn fern: ab einer Woche ist
 *  "In 9 Tagen" schwerer zu greifen als das Datum selbst.
 *
 *  Es heißt "versäumt", nie "überfällig" — so steht es auch im Filter-Tab.
 */

export type DueTone = 'missed' | 'soon' | 'later'

export interface DueInfo {
  /** Kurzlabel für die Meta-Zeile einer OFFENEN HÜ, z.B. "In 3 Tagen". */
  label: string
  /** Neutrales Datumslabel ohne Dringlichkeit — für bereits erledigte HÜ,
   *  bei denen ein Countdown keinen Sinn mehr ergibt. */
  dateOnlyLabel: string
  /** Volles Datum ausgeschrieben, z.B. "Freitag, 11. September 2026". */
  fullDate: string
  /** Tooltip-Text: volles Datum plus die Vortag-Regel. */
  tooltip: string
  tone: DueTone
  /** Textfarbe passend zum tone (Dringlichkeit trägt die Farbe, nicht das Wort). */
  color: string
  /** Kalendertage bis zur Fälligkeit (negativ = vorbei, 0 = heute fällig
   *  und damit nach der Regel bereits vorbei). */
  days: number
  /** Nach der Regel vorbei — identisch zu isOver(dueDate, heute). */
  over: boolean
  /** Achtung-Icon zeigen: genau am letzten machbaren Tag (morgen fällig).
   *  Bei versäumten HÜ bewusst NICHT, dort sagt die rote Pille schon alles.
   *  Nur für offene HÜ sinnvoll (mit !done kombinieren). */
  warn: boolean
}

const DUE_COLORS: Record<DueTone, string> = {
  missed: '#C95040',
  soon: '#C98A2B',
  later: '#6E7E80',
}

/** Volles Datum ausgeschrieben — für Tooltips. */
export function fullDateLabel(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('de-AT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

/** Kurzes Datum, z.B. "Fr., 11. Sep." */
export function shortDateLabel(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('de-AT', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

/** Wochentag des Vortags ("Donnerstag") — für den Regel-Hinweis im Tooltip. */
function weekdayBefore(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`)
  d.setDate(d.getDate() - 1)
  return d.toLocaleDateString('de-AT', { weekday: 'long' })
}

export function dueInfo(dateStr: string): DueInfo {
  const days = daysUntil(dateStr)
  const over = days <= 0
  const fullDate = fullDateLabel(dateStr)
  const short = shortDateLabel(dateStr)

  let label: string
  let tone: DueTone

  if (over) {
    tone = 'missed'
    label = 'Versäumt'
  } else if (days === 1) {
    tone = 'soon'
    label = 'Morgen fällig'
  } else if (days <= 3) {
    tone = 'soon'
    label = `In ${days} Tagen`
  } else if (days <= 6) {
    tone = 'later'
    label = `In ${days} Tagen`
  } else {
    tone = 'later'
    label = `Fällig: ${short}`
  }

  const tooltip = over
    ? `Fällig war am ${fullDate}.`
    : `Fällig am ${fullDate}. Bis ${weekdayBefore(dateStr)} Abend erledigen.`

  return {
    label,
    dateOnlyLabel: over ? `Fällig war: ${short}` : `Fällig: ${short}`,
    fullDate,
    tooltip,
    tone,
    color: DUE_COLORS[tone],
    days,
    over,
    warn: days === 1,
  }
}
