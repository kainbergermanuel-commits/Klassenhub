import { addDaysISO } from '@/lib/date'

/** Effektives Fälligkeitsdatum unter Berücksichtigung einer persönlichen
 *  Zeitkristall-Verlängerung (siehe supabase/feature-hw-extension.sql).
 *  `extensions` bildet homework_id -> zusätzliche Tage ab — NUR für die
 *  Hausübungen, die dieses eine Kind selbst verlängert hat (nie klassenweit). */
export function effectiveDueDate(dueDate: string, hwId: string, extensions?: Map<string, number>): string {
  const extraDays = extensions?.get(hwId)
  if (!extraDays) return dueDate
  return addDaysISO(extraDays, new Date(`${dueDate}T00:00:00`))
}

/**
 * Berechnet die Streak-Länge. `frozenIds` (Streak-Joker) überbrücken eine
 * verpasste HÜ: sie zählt nicht mit, bricht die Streak aber auch nicht.
 * `extensions` (Zeitkristall) verschiebt das Fälligkeitsdatum EINER HÜ nach
 * hinten, sodass sie noch gar nicht als "vergangen" gilt.
 */
export function computeStreak(
  doneIds: Set<string>,
  allHwDesc: { id: string; due_date: string }[],
  today: string,
  frozenIds?: Set<string>,
  extensions?: Map<string, number>
): number {
  let streak = 0
  let pastReached = false
  for (const hw of allHwDesc) {
    const isPast = effectiveDueDate(hw.due_date, hw.id, extensions) <= today
    if (isPast) pastReached = true
    if (doneIds.has(hw.id)) {
      streak++
    } else if (frozenIds?.has(hw.id)) {
      continue
    } else if (pastReached) {
      break
    }
  }
  return streak
}

/**
 * Liefert die HÜ, an der die Streak (ohne Joker/Zeitkristall) reißen würde –
 * also die erste vergangene, nicht erledigte HÜ in absteigender Reihenfolge.
 * `null` wenn die Streak aktuell nicht gerissen ist (oder es keine HÜ gibt).
 */
export function findBreakingHomework(
  doneIds: Set<string>,
  allHwDesc: { id: string; due_date: string }[],
  today: string,
  frozenIds?: Set<string>,
  extensions?: Map<string, number>
): string | null {
  for (const hw of allHwDesc) {
    const isPast = effectiveDueDate(hw.due_date, hw.id, extensions) <= today
    if (!isPast) continue
    if (doneIds.has(hw.id)) continue
    if (frozenIds?.has(hw.id)) continue
    return hw.id
  }
  return null
}

/** Gruppiert geladene streak_freezes-Zeilen zu einer Map student_id -> Set<homework_id>,
 *  fürs Durchreichen an computeStreak() als frozenIds. */
export function groupFrozenByStudent(
  freezes: { student_id: string; homework_id: string }[]
): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>()
  for (const f of freezes) {
    if (!map.has(f.student_id)) map.set(f.student_id, new Set())
    map.get(f.student_id)!.add(f.homework_id)
  }
  return map
}

/** Returns the current milestone threshold (5, 10, 15, …) for a given streak. */
export function currentMilestone(streak: number): number {
  return Math.floor(streak / 5) * 5
}

/**
 * Returns the number of flame icons to show for a streak.
 * < 5  → 0 flames (just show the number)
 * 5–9  → 1 flame
 * 10–14 → 2 flames
 * 15–19 → 3 flames
 * 20+   → 4 flames
 */
export function flameCount(streak: number): number {
  if (streak < 5) return 0
  return Math.min(Math.floor(streak / 5), 4)
}

export const MILESTONES = [5, 10, 15, 20] as const

/** Ab diesem (jemals erreichten) Meilenstein gilt ein Schüler dauerhaft als
 *  "HÜ-Veteran": eigene Erledigungen werden nicht mehr von den Eltern
 *  bestätigt, sondern automatisch — als verdientes Privileg. */
export const VETERAN_MILESTONE = 15

/** Anzahl Tage, um die der Zeitkristall die Frist einer HÜ verlängert.
 *  Single Source of Truth für Aktion (useTimeCrystal) und die Verfügbarkeits-
 *  Berechnung auf den Seiten. */
export const CRYSTAL_EXTENSION_DAYS = 3

/**
 * Ob ein Schutzschild (Joker) auf die aktuell reißende HÜ die Streak wirklich
 * verlängert. Ein Schild überbrückt genau EINE Lücke — fehlt direkt davor
 * (älter) die nächste HÜ ebenfalls, bringt er nichts. Verhindert, dass das
 * 1×-pro-Season-Item wirkungslos verbraucht wird.
 */
export function freezeWouldHelp(
  doneIds: Set<string>,
  allHwDesc: { id: string; due_date: string }[],
  today: string,
  frozenIds?: Set<string>,
  extensions?: Map<string, number>,
): boolean {
  const breaking = findBreakingHomework(doneIds, allHwDesc, today, frozenIds, extensions)
  if (!breaking) return false
  const before = computeStreak(doneIds, allHwDesc, today, frozenIds, extensions)
  const after = computeStreak(doneIds, allHwDesc, today, new Set([...(frozenIds ?? []), breaking]), extensions)
  return after > before
}

/**
 * Ob ein Zeitkristall (Fristverlängerung um CRYSTAL_EXTENSION_DAYS) auf die
 * aktuell reißende HÜ die Streak wirklich rettet. Nur dann darf das
 * 1×-pro-Season-Item verbraucht werden — sonst verpufft es, wenn die HÜ schon
 * zu weit überfällig ist (Verlängerung landet weiterhin in der Vergangenheit)
 * oder eine jüngere erledigte HÜ den Bruchpunkt bereits fixiert hat.
 */
export function crystalWouldHelp(
  doneIds: Set<string>,
  allHwDesc: { id: string; due_date: string }[],
  today: string,
  frozenIds?: Set<string>,
  extensions?: Map<string, number>,
): boolean {
  const breaking = findBreakingHomework(doneIds, allHwDesc, today, frozenIds, extensions)
  if (!breaking) return false
  const before = computeStreak(doneIds, allHwDesc, today, frozenIds, extensions)
  const trial = new Map(extensions ?? [])
  trial.set(breaking, CRYSTAL_EXTENSION_DAYS)
  const after = computeStreak(doneIds, allHwDesc, today, frozenIds, trial)
  return after > before
}
