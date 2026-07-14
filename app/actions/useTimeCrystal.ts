'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveAuth } from '@/lib/previewAuth'
import { todayISO, schoolYearStartISO } from '@/lib/date'
import { computeStreak, findBreakingHomework } from '@/lib/streak'

/** Um wie viele Tage der Zeitkristall die Frist verlängert. */
const EXTENSION_DAYS = 3

/** Setzt den Zeitkristall ein (1× pro Season) — verlängert die Frist der HÜ,
 *  an der die Streak des eingeloggten Schülers gerade reißt, um
 *  EXTENSION_DAYS Tage, ohne dass die Streak bricht. Anders als der
 *  Schutzschild (der eine verpasste HÜ überbrückt) bleibt die HÜ hier real
 *  offen und für die Lehrkraft sichtbar verlängert (Prinzip 5) — ein aktives
 *  Werkzeug, kein stiller Puffer. */
export async function useTimeCrystal(): Promise<{ newStreak: number }> {
  const { user, profile } = await getEffectiveAuth()
  if (!user?.id || !profile || profile.role !== 'student') throw new Error('Unauthorized')
  if (!profile.class_id) throw new Error('Keine Klasse')

  const supabase = await createClient()
  const today = todayISO()
  const currentSeason = today.slice(0, 7)
  const schoolYearStart = schoolYearStartISO()

  const [{ data: allHw }, { data: completions }, { data: freezes }, { data: extensions }] = await Promise.all([
    supabase.from('homework').select('id,due_date').eq('class_id', profile.class_id).gte('due_date', schoolYearStart).order('due_date', { ascending: false }),
    supabase.from('homework_completions').select('homework_id').eq('student_id', profile.id).not('confirmed_by_parent_at', 'is', null),
    supabase.from('streak_freezes').select('homework_id').eq('student_id', profile.id),
    supabase.from('homework_extensions').select('homework_id,extra_days,created_at').eq('student_id', profile.id),
  ])

  const hw = allHw ?? []
  const doneIds = new Set((completions ?? []).map(c => c.homework_id))
  const frozenIds = new Set((freezes ?? []).map(f => f.homework_id))
  const extensionMap = new Map((extensions ?? []).map(e => [e.homework_id, e.extra_days]))

  const usedThisSeason = (extensions ?? []).some(e => e.created_at.slice(0, 7) === currentSeason)
  if (usedThisSeason) throw new Error('Zeitkristall diese Season bereits verbraucht')

  const breakingHwId = findBreakingHomework(doneIds, hw, today, frozenIds, extensionMap)
  if (!breakingHwId) throw new Error('Keine reißende Streak zum Verlängern')

  const { error } = await supabase.from('homework_extensions').insert({
    student_id: profile.id,
    homework_id: breakingHwId,
    extra_days: EXTENSION_DAYS,
  } as never)
  if (error) throw new Error(error.message)

  const newExtensionMap = new Map(extensionMap)
  newExtensionMap.set(breakingHwId, EXTENSION_DAYS)
  const newStreak = computeStreak(doneIds, hw, today, frozenIds, newExtensionMap)
  revalidatePath('/streaks')
  revalidatePath('/')
  return { newStreak }
}
