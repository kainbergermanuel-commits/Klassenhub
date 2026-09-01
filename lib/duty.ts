/** Hilfslogik für die Dienst-Selbstbestätigung (pro Wochentag, 1=Mo … 5=Fr).
 *  Siehe supabase/feature-duty-completions.sql + toggleDutyCompletion.ts. */

import { getMondayOfWeek } from './date'

/** Aktueller Schulwochentag als 1..5 (Mo..Fr). Am Wochenende → 5 (ganze
 *  Woche gilt als "vergangen"), damit die Erledigung dann Mo–Fr umfasst.
 *  BEWUSST nicht exportiert: für sich genommen weiß die Funktion nicht, auf
 *  welche Woche sie sich bezieht, und genau daraus entstand die Sonntagslücke.
 *  Nach außen geht ausschließlich confirmableWeekday(weekStart). */
function currentSchoolWeekday(from: Date = new Date()): number {
  const d = from.getDay() // 0=So … 6=Sa
  if (d === 0 || d === 6) return 5
  return d // Mo=1 … Fr=5
}

/** Bis zu welchem Wochentag (1..5) die Dienstwoche ab `weekStart` bestätigt
 *  werden darf; 0 = noch gar nicht.
 *
 *  ⚠️ Warum das nicht `currentSchoolWeekday()` allein sein darf: die Dienste
 *  richten sich nach `getRelevantMondayOfWeek()`, das am SONNTAG bereits auf
 *  den kommenden Montag springt. `currentSchoolWeekday()` liefert am Sonntag
 *  aber 5 — zusammen hätte das die komplette, noch nicht begonnene Woche
 *  freigeschaltet und die Dienst-Quests wären sonntagabends mit fünf Klicks
 *  erfüllt gewesen. Deshalb wird der Wochentag immer gegen die Woche geprüft,
 *  zu der der Dienst tatsächlich gehört. */
export function confirmableWeekday(weekStart: string, from: Date = new Date()): number {
  const currentWeekStart = getMondayOfWeek(from)
  if (weekStart > currentWeekStart) return 0 // Woche hat noch nicht begonnen
  if (weekStart < currentWeekStart) return 5 // vergangene Woche: Mo–Fr nachtragbar
  return currentSchoolWeekday(from)
}

/** Die bereits vergangenen (inkl. heute) Schulwochentage der Dienstwoche
 *  `weekStart`: [1..n]. Leer, solange die Woche noch nicht begonnen hat. */
export function pastSchoolWeekdays(weekStart: string, from: Date = new Date()): number[] {
  const n = confirmableWeekday(weekStart, from)
  return Array.from({ length: n }, (_, i) => i + 1)
}

/** "Dienst diese Woche erfüllt" für die Quest-Auswertung: das Kind hat den
 *  Dienst an JEDEM bereits vergangenen Wochentag (Mo..heute) selbst bestätigt.
 *  Belohnt Dranbleiben, ist aber jeden Tag erreichbar. `doneWeekdays` = Set der
 *  bestätigten Wochentage dieses Kindes für seinen Dienst.
 *  Hat die Woche noch nicht begonnen, ist nichts "durchgehalten" — sonst wäre
 *  die Bedingung sonntags leer und damit für alle erfüllt. */
export function dutyKeptUp(doneWeekdays: Set<number>, weekStart: string, from: Date = new Date()): boolean {
  const past = pastSchoolWeekdays(weekStart, from)
  if (past.length === 0) return false
  return past.every(wd => doneWeekdays.has(wd))
}

function dutyStudentKey(dutyId: string, studentId: string): string {
  return `${dutyId}:${studentId}`
}

/** Fasst die (duty, student, weekday)-Zeilen zusammen und ermittelt, welche
 *  Schüler:innen ihren Dienst diese Woche "durchgehalten" haben (dutyKeptUp
 *  für ALLE ihnen zugeteilten Dienste). Für Solo-Quest + Gilden-Aggregation. */
export function buildDutyDone(
  duties: { id: string; assignee_ids: string[] }[],
  completions: { duty_id: string; student_id: string; weekday: number }[],
  weekStart: string,
  from: Date = new Date(),
): { doneByDutyStudent: Map<string, Set<number>>; keptUpStudents: Set<string>; assignedStudents: Set<string>; dutyDayCounts: Map<string, number> } {
  const doneByDutyStudent = new Map<string, Set<number>>()
  for (const c of completions) {
    const k = dutyStudentKey(c.duty_id, c.student_id)
    if (!doneByDutyStudent.has(k)) doneByDutyStudent.set(k, new Set())
    doneByDutyStudent.get(k)!.add(c.weekday)
  }
  const assignments = new Map<string, string[]>()
  for (const d of duties) for (const sid of d.assignee_ids) {
    if (!assignments.has(sid)) assignments.set(sid, [])
    assignments.get(sid)!.push(d.id)
  }
  const keptUpStudents = new Set<string>()
  for (const [sid, dutyIds] of assignments) {
    if (dutyIds.every(did => dutyKeptUp(doneByDutyStudent.get(dutyStudentKey(did, sid)) ?? new Set(), weekStart, from))) {
      keptUpStudents.add(sid)
    }
  }
  // Wer diese Woche überhaupt einen Dienst hat — Grundlage dafür, die
  // Gilden-Dienst-Quest nur gegen die dienst-tragenden Mitglieder zu messen
  // (nicht die ganze Gilde), siehe computeGuildQuestProgress.
  const assignedStudents = new Set(assignments.keys())
  // Bestätigte Diensttage je Kind (Maximum über die zugeteilten Dienste) —
  // Grundlage für die Gilden-Dienstquest, die dadurch dieselbe Schwelle nutzt
  // wie die Solo-Variante (3 von 5 Tagen, nachholbar) statt der strengeren
  // "lückenlos ab Montag"-Regel von keptUpStudents.
  const dutyDayCounts = new Map<string, number>()
  for (const [sid, dutyIds] of assignments) {
    const best = Math.max(...dutyIds.map(did => (doneByDutyStudent.get(dutyStudentKey(did, sid)) ?? new Set()).size))
    dutyDayCounts.set(sid, best)
  }
  return { doneByDutyStudent, keptUpStudents, assignedStudents, dutyDayCounts }
}

/** Bestätigte Wochentage eines Kindes für einen konkreten Dienst (sortiert). */
export function dutyDoneWeekdays(doneByDutyStudent: Map<string, Set<number>>, dutyId: string, studentId: string): number[] {
  return [...(doneByDutyStudent.get(dutyStudentKey(dutyId, studentId)) ?? new Set<number>())].sort((a, b) => a - b)
}
