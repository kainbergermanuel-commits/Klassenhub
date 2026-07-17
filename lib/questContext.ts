import type { QuestContext, QuestFeasibility } from '@/lib/quests'

/** Konsolidiert den `QuestContext`-Aufbau, der zuvor identisch in
 *  app/(app)/page.tsx UND app/(app)/streaks/page.tsx dupliziert war (Risiko:
 *  eine Signal-Änderung an nur einer Stelle nachziehen). Lädt selbst nichts
 *  aus der DB — nimmt die von den Server-Components bereits geladenen
 *  Rohdaten entgegen und leitet daraus reine Ableitungen (dueByHwId,
 *  earlyHomeworkIds, doneDatesThisWeek, Reminder-/Termin-Filterung nach
 *  target_student_ids) her. */
export interface QuestContextInput {
  weekStart: string
  weekEnd: string
  /** Heutiges Datum (ISO) — nötig, um "bereits fällige" HÜ dieser Woche von
   *  noch bevorstehenden zu unterscheiden (weekDueDoneCount). */
  today: string
  studentId: string
  /** Alle HÜ der Klasse (für dueByHwId) — Datumsfeld reicht. */
  allHomework: { id: string; due_date: string }[]
  /** Eigene Erledigungen des Schülers, mit Zeitstempel (für "vorzeitig" +
   *  "an verschiedenen Tagen erledigt"). */
  ownCompletions: { homework_id: string; completed_at: string | null }[]
  confirmedHomeworkIds: Set<string>
  reminders: { id: string; event_date: string; target_student_ids: string[] | null }[]
  viewedReminderIds: Set<string>
  events: { id: string; start_date: string; target_student_ids: string[] | null }[]
  dutyDoneCount: number
  currentStreakLength: number
}

export function buildQuestContext(input: QuestContextInput): QuestContext {
  const { weekStart, weekEnd, today, studentId, allHomework, ownCompletions, confirmedHomeworkIds,
    reminders, viewedReminderIds, events, dutyDoneCount, currentStreakLength } = input

  const weekHw = allHomework.filter(h => h.due_date >= weekStart && h.due_date <= weekEnd)
  const dueByHwId = new Map(allHomework.map(h => [h.id, h.due_date]))
  const doneHomeworkIds = new Set(ownCompletions.map(c => c.homework_id))

  // Bereits fällige HÜ dieser Woche (due_date <= heute), die erledigt sind —
  // deckelt streak_hold auf echte Beiträge dieser Woche, siehe lib/quests.ts.
  const weekDueDoneCount = weekHw.filter(h => h.due_date <= today && doneHomeworkIds.has(h.id)).length

  const earlyHomeworkIds = new Set(
    ownCompletions
      .filter(c => {
        const due = dueByHwId.get(c.homework_id)
        return due && c.completed_at && c.completed_at.slice(0, 10) < due
      })
      .map(c => c.homework_id)
  )

  // Verschiedene Kalendertage mit mind. einer Erledigung diese Woche (Phase 1:
  // "distinct-day"-Signal statt roher Anzahl, siehe lib/questVault.ts hw_x3).
  const doneDatesThisWeek = new Set(
    ownCompletions
      .filter(c => c.completed_at && c.completed_at.slice(0, 10) >= weekStart && c.completed_at.slice(0, 10) <= weekEnd)
      .map(c => c.completed_at!.slice(0, 10))
  )

  const weekReminderIds = reminders
    .filter(r => r.event_date >= weekStart && r.event_date <= weekEnd)
    .filter(r => !r.target_student_ids || r.target_student_ids.includes(studentId))
    .map(r => r.id)

  const weekEventIds = events
    .filter(e => e.start_date >= weekStart && e.start_date <= weekEnd)
    .filter(e => !e.target_student_ids || e.target_student_ids.includes(studentId))
    .map(e => e.id)

  return {
    weekStart,
    weekEnd,
    weekHomeworkIds: weekHw.map(h => h.id),
    doneHomeworkIds,
    earlyHomeworkIds,
    confirmedHomeworkIds,
    weekReminderIds,
    viewedReminderIds,
    weekEventIds,
    doneDatesThisWeek,
    dutyDoneCount,
    currentStreakLength,
    weekDueDoneCount,
  }
}

/** Welche Quest-Signale diese Woche für dieses Kind überhaupt erfüllbar sind
 *  (Phase 1: Machbarkeits-Filter). Rein aus schon geladenen Wochen-Daten. */
export function buildFeasibility(ctx: Pick<QuestContext, 'weekHomeworkIds' | 'weekEventIds'>, hasDuty: boolean): QuestFeasibility {
  return {
    hasWeekHomework: ctx.weekHomeworkIds.length > 0,
    hasDuty,
    hasWeekEvent: ctx.weekEventIds.length > 0,
  }
}
