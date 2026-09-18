import { isSchoolday } from '@/lib/date'
import { isAbsence } from '@/lib/attendance'
import type { Attendance } from '@/lib/types'

/** Fehlstunden statt Fehltage.
 *
 *  Drei Dinge, die bewusst NICHT zusammengerechnet werden:
 *    Fehltage     – Tage
 *    Verspätungen – Anzahl, kein Zeitverlust (eine Verspätung ist keine
 *                   halbe Fehlstunde)
 *    Fehlstunden  – Unterrichtsstunden, aus ganzen Fehltagen UND aus dem
 *                   vorzeitigen Gehen, jeweils gegen den echten Stundenplan
 *                   des Wochentags gerechnet.
 *
 *  Ohne Stundenplan gibt es keine Fehlstunden-Zahl, nur die Tage. Die
 *  Oberfläche blendet die Auswertung dann aus, statt eine Pauschale
 *  („Schultage × 6") zu erfinden, die am Donnerstag schon falsch wäre. */

/** Wochentag (1 = Mo … 5 = Fr) → die an diesem Tag belegten Stunden-Nummern. */
export type WeekdaySlots = Record<number, number[]>

export function buildWeekdaySlots(rows: { day: number; slot: number }[]): WeekdaySlots {
  const out: WeekdaySlots = {}
  for (const r of rows) {
    if (r.day < 1 || r.day > 5) continue
    ;(out[r.day] ??= []).push(r.slot)
  }
  for (const day of Object.keys(out)) out[Number(day)].sort((a, b) => a - b)
  return out
}

export interface LessonStats {
  /** Ohne Stundenplan-Einträge lässt sich nichts umrechnen. */
  hasTimetable: boolean
  /** Tage mit Verspätung. */
  lateDays: number
  /** Tage, an denen ein Kind vorzeitig gegangen ist. */
  earlyDays: number
  /** Fehlstunden nur aus dem vorzeitigen Gehen. */
  partialHours: number
  /** Fehlstunden aus ganzen Fehltagen. */
  fullDayHours: number
  /** Fehlstunden gesamt (die Zahl, die eine Schule berichtet). */
  missedHours: number
  /** Nenner: tatsächlich angesetzte Unterrichtsstunden im Zeitraum. */
  scheduledHours: number
  /** Versäumte Unterrichtsstunden in Prozent. */
  missedRate: number
  /** Verspätungen nach Wochentag, Mo–Fr. */
  lateWeekday: number[]
}

/** Unterrichtsstunden eines einzelnen Kindes im Zeitraum, Wochentag-genau.
 *
 *  Ohne Ferienabzug — genau wie `schoolDays` in attendanceStats. Bei einer
 *  Stundenquote fällt das stärker ins Gewicht als bei einer Tagesquote; die
 *  Oberfläche schreibt es deshalb dazu. */
export function scheduledHoursBetween(slots: WeekdaySlots, startISO: string, endISO: string): number {
  if (endISO < startISO) return 0
  let hours = 0
  const cur = new Date(`${startISO}T00:00:00`)
  const end = new Date(`${endISO}T00:00:00`)
  while (cur <= end) {
    if (isSchoolday(cur)) hours += slots[cur.getDay()]?.length ?? 0
    cur.setDate(cur.getDate() + 1)
  }
  return hours
}

export function buildLessonStats(
  entries: Attendance[],
  opts: { slots: WeekdaySlots; startISO: string; endISO: string; studentCount: number },
): LessonStats {
  const { slots, startISO, endISO, studentCount } = opts
  const hasTimetable = Object.keys(slots).length > 0

  const inRange = entries.filter(e => e.date >= startISO && e.date <= endISO && isSchoolday(e.date))

  let lateDays = 0, earlyDays = 0, partialHours = 0, fullDayHours = 0
  const lateWeekday = [0, 0, 0, 0, 0]

  for (const e of inRange) {
    const weekday = new Date(`${e.date}T00:00:00`).getDay()
    const daySlots = slots[weekday] ?? []

    if (e.late) {
      lateDays++
      if (weekday >= 1 && weekday <= 5) lateWeekday[weekday - 1]++
    }
    if (e.gone_from_slot != null) {
      earlyDays++
      partialHours += daySlots.filter(slot => slot >= e.gone_from_slot!).length
    }
    if (isAbsence(e)) fullDayHours += daySlots.length
  }

  // Der Nenner ist die Stundenzahl EINES Kindes mal der Anzahl Kinder: den
  // Klassen-Stundenplan besuchen alle gemeinsam, deshalb ist die Multiplikation
  // hier tatsächlich die richtige Grundgesamtheit und nicht die übliche Falle.
  // (Bekannte Grenze: Kinder, die erst im Lauf des Jahres dazukommen, blähen
  // den Nenner leicht auf — siehe joined_class_at.)
  const scheduledHours = scheduledHoursBetween(slots, startISO, endISO) * Math.max(1, studentCount)
  const missedHours = fullDayHours + partialHours

  return {
    hasTimetable,
    lateDays,
    earlyDays,
    partialHours,
    fullDayHours,
    missedHours,
    scheduledHours,
    missedRate: scheduledHours > 0 ? Math.round((missedHours / scheduledHours) * 1000) / 10 : 0,
    lateWeekday,
  }
}
