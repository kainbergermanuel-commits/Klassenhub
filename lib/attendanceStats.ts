import { localDateOf } from '@/lib/date'
import type { Attendance, AttendanceStatus } from '@/lib/types'

/** Reine Statistik-Ableitungen aus Anwesenheits-Einträgen — gemeinsam von der
 *  Lehrer-Statistik (ganze Klasse) und der persönlichen Karte (ein Kind,
 *  studentCount=1) genutzt. Keine DB-Zugriffe, alles aus den bereits geladenen
 *  Schuljahres-Einträgen (nur Abweichungen: kein Eintrag = anwesend). */

export type StatusFilter = 'all' | AttendanceStatus

export interface MonthBucket { key: string; excused: number; unexcused: number }
export interface Bucket { label: string; count: number }

export interface AttendanceStats {
  /** Alle Fehltage im Zeitraum (unabhängig vom Status-Fokus). */
  total: number
  excused: number
  unexcused: number
  /** Schultage (Mo–Fr) im Zeitraum bis heute — ohne Ferienabzug. */
  schoolDays: number
  /** Anwesenheitsquote in % (Schultage), aus allen Fehltagen. */
  presentRate: number
  /** Monatsachse mit E/U — respektiert den Status-Fokus. */
  months: MonthBucket[]
  monthMax: number
  /** Mo–Fr Fehltage — respektiert den Status-Fokus. */
  weekday: number[]
  peakWeekday: number
  /** Anteil Mo+Fr an allen (Status-gefilterten) Fehltagen, 0–1. */
  moFrShare: number
  /** Anonyme Verteilung Fehltage je Kind (inkl. Kinder mit 0). */
  childBuckets: Bucket[]
  /** Eltern-Abmeldungen: rechtzeitig (am/vor dem Tag gemeldet), verspätet,
   *  noch offen (unbestätigt). */
  parent: { total: number; timely: number; late: number; open: number }
}

/** Anzahl Wochentage (Mo–Fr) von start bis end inklusive. */
export function weekdayCountBetween(startISO: string, endISO: string): number {
  if (endISO < startISO) return 0
  let count = 0
  const cur = new Date(`${startISO}T00:00:00`)
  const end = new Date(`${endISO}T00:00:00`)
  while (cur <= end) {
    const d = cur.getDay()
    if (d >= 1 && d <= 5) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

/** Monats-Schlüssel ('YYYY-MM') von start bis end inklusive. */
export function monthKeysBetween(startISO: string, endISO: string): string[] {
  const out: string[] = []
  let cursor = startISO.slice(0, 7)
  const endMonth = endISO.slice(0, 7)
  while (cursor <= endMonth && out.length < 14) {
    out.push(cursor)
    const [y, m] = cursor.split('-').map(Number)
    cursor = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
  }
  return out
}

const CHILD_EDGES: [number, string][] = [[0, '0'], [2, '1–2'], [5, '3–5'], [10, '6–10'], [Infinity, '11+']]

export function buildAttendanceStats(
  entries: Attendance[],
  opts: { studentCount: number; startISO: string; endISO: string; statusFilter: StatusFilter },
): AttendanceStats {
  const { studentCount, startISO, endISO, statusFilter } = opts
  // Zeitraum-Filter (alle Status) — Basis für KPIs.
  const inRange = entries.filter(e => e.date >= startISO && e.date <= endISO)
  const excused = inRange.filter(e => e.status === 'entschuldigt').length
  const unexcused = inRange.filter(e => e.status === 'unentschuldigt').length
  const total = inRange.length

  const schoolDays = weekdayCountBetween(startISO, endISO)
  const studentDays = studentCount * schoolDays
  const presentRate = studentDays > 0 ? Math.max(0, Math.round(((studentDays - total) / studentDays) * 1000) / 10) : 100

  // Status-Fokus für die Auswertungs-Charts.
  const focus = statusFilter === 'all' ? inRange : inRange.filter(e => e.status === statusFilter)

  const monthKeys = monthKeysBetween(startISO, endISO)
  const monthMap = new Map<string, { excused: number; unexcused: number }>()
  for (const k of monthKeys) monthMap.set(k, { excused: 0, unexcused: 0 })
  for (const e of focus) {
    const m = monthMap.get(e.date.slice(0, 7))
    if (m) { if (e.status === 'entschuldigt') m.excused++; else m.unexcused++ }
  }
  const months = monthKeys.map(key => ({ key, ...monthMap.get(key)! }))
  const monthMax = Math.max(1, ...months.map(m => m.excused + m.unexcused))

  const weekday = [0, 0, 0, 0, 0]
  for (const e of focus) {
    const wd = new Date(`${e.date}T00:00:00`).getDay()
    if (wd >= 1 && wd <= 5) weekday[wd - 1]++
  }
  const weekdayMax = Math.max(...weekday)
  const peakWeekday = focus.length >= 3 && weekdayMax > 0 ? weekday.indexOf(weekdayMax) : -1
  const moFrShare = focus.length > 0 ? (weekday[0] + weekday[4]) / focus.length : 0

  // Anonyme Verteilung je Kind (Status-Fokus). Kinder ohne Eintrag → Bucket „0".
  const perChild = new Map<string, number>()
  for (const e of focus) perChild.set(e.student_id, (perChild.get(e.student_id) ?? 0) + 1)
  const childBuckets: Bucket[] = CHILD_EDGES.map(([, label]) => ({ label, count: 0 }))
  const bucketIdx = (n: number) => CHILD_EDGES.findIndex(([edge]) => n <= edge)
  for (const count of perChild.values()) childBuckets[bucketIdx(count)].count++
  childBuckets[0].count += Math.max(0, studentCount - perChild.size) // Kinder mit 0 Fehltagen

  // Eltern-Abmeldungen: Rechtzeitigkeit (am/vor dem Abwesenheitstag gemeldet).
  const parentEntries = inRange.filter(e => e.source === 'parent')
  let timely = 0, late = 0, open = 0
  for (const e of parentEntries) {
    if (localDateOf(e.created_at) <= e.date) timely++; else late++
    if (!e.confirmed_at) open++
  }

  return {
    total, excused, unexcused, schoolDays, presentRate,
    months, monthMax, weekday, peakWeekday, moFrShare, childBuckets,
    parent: { total: parentEntries.length, timely, late, open },
  }
}
