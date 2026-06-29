'use server'

import { createClient } from '@/lib/supabase/server'
import { getAuth } from '@/lib/auth'
import { todayISO, schoolYearStartISO } from '@/lib/date'
import { computeStreak, MILESTONES } from '@/lib/streak'

/** Liefert den neu erreichten Meilenstein (5/10/15/20) zurück, falls diese
 *  Bestätigung eine Schwelle überschritten hat – sonst null. */
export async function confirmHomeworkCompletion(
  homeworkId: string,
  studentId: string,
): Promise<{ reachedMilestone: number | null }> {
  const { profile } = await getAuth()
  if (!profile || profile.role !== 'parent') throw new Error('Unauthorized')
  if (profile.child_id !== studentId) throw new Error('Not your child')

  const supabase = await createClient()
  const { error } = await supabase
    .from('homework_completions')
    .update({ confirmed_by_parent_at: new Date().toISOString() } as never)
    .eq('homework_id', homeworkId)
    .eq('student_id', studentId)

  if (error) throw new Error(error.message)

  // Meilenstein-Chronik fortschreiben + prüfen, ob GENAU diese Bestätigung eine
  // Schwelle (5/10/15/20) frisch überschritten hat (für die Jubel-Anzeige).
  const reachedMilestone = await recordReachedMilestones(supabase, studentId, profile.class_id ?? null, profile.id, [homeworkId])
  return { reachedMilestone }
}

/** Bestätigt alle übergebenen (noch offenen) HÜ-Erledigungen des Kindes auf einmal. */
export async function confirmAllHomeworkCompletions(
  homeworkIds: string[],
  studentId: string,
): Promise<{ reachedMilestone: number | null }> {
  const { profile } = await getAuth()
  if (!profile || profile.role !== 'parent') throw new Error('Unauthorized')
  if (profile.child_id !== studentId) throw new Error('Not your child')
  if (homeworkIds.length === 0) return { reachedMilestone: null }

  const supabase = await createClient()
  const { error } = await supabase
    .from('homework_completions')
    .update({ confirmed_by_parent_at: new Date().toISOString() } as never)
    .eq('student_id', studentId)
    .in('homework_id', homeworkIds)
    .is('confirmed_by_parent_at', null)

  if (error) throw new Error(error.message)

  const reachedMilestone = await recordReachedMilestones(supabase, studentId, profile.class_id ?? null, profile.id, homeworkIds)
  return { reachedMilestone }
}

async function recordReachedMilestones(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studentId: string,
  classId: string | null,
  confirmedBy: string,
  justConfirmedHwIds: string[],
): Promise<number | null> {
  if (!classId) return null

  const today = todayISO()
  const schoolYearStart = schoolYearStartISO()

  const [{ data: allHw }, { data: confirmedCompletions }, { data: existing }] = await Promise.all([
    supabase.from('homework').select('id,due_date').eq('class_id', classId).gte('due_date', schoolYearStart).order('due_date', { ascending: false }),
    supabase.from('homework_completions').select('homework_id').eq('student_id', studentId).not('confirmed_by_parent_at', 'is', null),
    supabase.from('streak_confirmations').select('milestone').eq('student_id', studentId),
  ])
  const hw = allHw ?? []

  // Bestätigter Streak NACH dieser Bestätigung – und davor (ohne die eben
  // bestätigte HÜ rekonstruiert), um das Überschreiten einer Schwelle zu erkennen.
  const confirmedIdsAfter = new Set((confirmedCompletions ?? []).map(c => c.homework_id))
  const confirmedIdsBefore = new Set(confirmedIdsAfter)
  for (const id of justConfirmedHwIds) confirmedIdsBefore.delete(id)
  const streakAfter = computeStreak(confirmedIdsAfter, hw, today)
  const streakBefore = computeStreak(confirmedIdsBefore, hw, today)

  // History-Chronik: erreichte Meilensteine einmalig protokollieren.
  const alreadyRecorded = new Set((existing ?? []).map(m => m.milestone))
  const toRecord = MILESTONES.filter(m => streakAfter >= m && !alreadyRecorded.has(m))
  if (toRecord.length > 0) {
    await supabase.from('streak_confirmations').upsert(
      toRecord.map(milestone => ({ student_id: studentId, milestone, confirmed_by: confirmedBy })) as never,
      { onConflict: 'student_id,milestone', ignoreDuplicates: true },
    )
  }

  // Jubel: höchste Schwelle, die GENAU diese Bestätigung frisch überschritten hat
  // (unabhängig davon, ob sie früher schon einmal erreicht/protokolliert war).
  const crossed = MILESTONES.filter(m => m > streakBefore && m <= streakAfter)
  return crossed.length > 0 ? Math.max(...crossed) : null
}
