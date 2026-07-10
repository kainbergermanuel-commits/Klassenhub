/**
 * Berechnet die Streak-Länge. `frozenIds` (Streak-Joker) überbrücken eine
 * verpasste HÜ: sie zählt nicht mit, bricht die Streak aber auch nicht.
 */
export function computeStreak(
  doneIds: Set<string>,
  allHwDesc: { id: string; due_date: string }[],
  today: string,
  frozenIds?: Set<string>
): number {
  let streak = 0
  let pastReached = false
  for (const hw of allHwDesc) {
    const isPast = hw.due_date <= today
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
 * Liefert die HÜ, an der die Streak (ohne Joker) reißen würde – also die
 * erste vergangene, nicht erledigte HÜ in absteigender Reihenfolge. `null`
 * wenn die Streak aktuell nicht gerissen ist (oder es keine HÜ gibt).
 */
export function findBreakingHomework(
  doneIds: Set<string>,
  allHwDesc: { id: string; due_date: string }[],
  today: string,
  frozenIds?: Set<string>
): string | null {
  for (const hw of allHwDesc) {
    const isPast = hw.due_date <= today
    if (!isPast) continue
    if (doneIds.has(hw.id)) continue
    if (frozenIds?.has(hw.id)) continue
    return hw.id
  }
  return null
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
