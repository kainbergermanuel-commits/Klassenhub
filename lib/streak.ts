export function computeStreak(
  doneIds: Set<string>,
  allHwDesc: { id: string; due_date: string }[],
  today: string
): number {
  let streak = 0
  let pastReached = false
  for (const hw of allHwDesc) {
    const isPast = hw.due_date <= today
    if (isPast) pastReached = true
    if (doneIds.has(hw.id)) {
      streak++
    } else if (pastReached) {
      break
    }
  }
  return streak
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

/** Highest confirmed milestone for a student, or 0 if none. */
export function confirmedStreak(
  studentId: string,
  confirmations: { student_id: string; milestone: number }[]
): number {
  const milestones = confirmations
    .filter(c => c.student_id === studentId)
    .map(c => c.milestone)
  return milestones.length > 0 ? Math.max(...milestones) : 0
}
