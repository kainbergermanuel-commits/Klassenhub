'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveAuth } from '@/lib/previewAuth'
import { todayISO, schoolYearStartISO, localDateOf } from '@/lib/date'
import { computeStreak, findBreakingHomework } from '@/lib/streak'

/** Setzt einen Streak-Joker ein (1× pro Season) für die HÜ, an der die
 *  Streak des eingeloggten Schülers gerade reißt. Gibt die neue Streak-Länge
 *  zurück, oder wirft, wenn kein Joker mehr verfügbar ist oder nichts zu retten ist.
 *  ⚠️ Muss getEffectiveAuth() nutzen (nicht getAuth()) — sonst schlägt die
 *  Lehrer-Vorschau-als-Schüler-Funktion mit "Unauthorized" fehl, weil dann
 *  das echte Lehrer-Profil statt des vorgeschauten Schüler-Profils zurückkäme
 *  (2026-07-14 live bestätigt, siehe useTimeCrystal.ts für das Vorbild-Muster). */
export async function useStreakFreeze(): Promise<{ newStreak: number }> {
  const { user, profile } = await getEffectiveAuth()
  if (!user?.id || !profile || profile.role !== 'student') throw new Error('Unauthorized')
  if (!profile.class_id) throw new Error('Keine Klasse')

  const supabase = await createClient()
  const today = todayISO()
  // Season aus dem lokalen Datum; der Vergleich unten führt created_at
  // (UTC) über localDateOf in dieselbe Zeitzone. Sonst zählte am 1. eines
  // Monats zwischen 00:00 und 02:00 Wiener Zeit noch der Vormonat.
  const currentSeason = today.slice(0, 7)
  const schoolYearStart = schoolYearStartISO()

  const [{ data: allHw }, { data: completions }, { data: freezes }, { data: extensions }] = await Promise.all([
    supabase.from('homework').select('id,due_date').eq('class_id', profile.class_id).gte('due_date', schoolYearStart).order('due_date', { ascending: false }),
    supabase.from('homework_completions').select('homework_id').eq('student_id', profile.id).not('confirmed_by_parent_at', 'is', null),
    supabase.from('streak_freezes').select('id,homework_id,created_at').eq('student_id', profile.id),
    supabase.from('homework_extensions').select('homework_id,extra_days').eq('student_id', profile.id),
  ])

  const hw = allHw ?? []
  const doneIds = new Set((completions ?? []).map(c => c.homework_id))
  const frozenIds = new Set((freezes ?? []).map(f => f.homework_id))
  // Zeitkristall-Verlängerungen einbeziehen (siehe useTimeCrystal.ts) — sonst
  // würde eine bereits per Kristall verlängerte HÜ hier trotzdem als
  // "reißend" erkannt (falsches Ziel), weil ihr rohes Fälligkeitsdatum ohne
  // die Verlängerung noch in der Vergangenheit liegt.
  const extensionMap = new Map((extensions ?? []).map(e => [e.homework_id, e.extra_days]))

  const usedThisSeason = (freezes ?? []).some(f => localDateOf(f.created_at).slice(0, 7) === currentSeason)
  if (usedThisSeason) throw new Error('Joker diese Season bereits verbraucht')

  const breakingHwId = findBreakingHomework(doneIds, hw, today, frozenIds, extensionMap)
  if (!breakingHwId) throw new Error('Kein gerissener Streak zum Retten')

  // Wirkungs-Guard: ein Schild überbrückt genau EINE Lücke. Fehlt direkt davor
  // (älter) die nächste HÜ ebenfalls, rettet er die Streak nicht — dann wird
  // das 1×/Season-Item nicht verbraucht, sondern bleibt erhalten.
  const currentStreak = computeStreak(doneIds, hw, today, frozenIds, extensionMap)
  const newStreak = computeStreak(doneIds, hw, today, new Set([...frozenIds, breakingHwId]), extensionMap)
  if (newStreak <= currentStreak) {
    throw new Error('Der Schutzschild reicht hier nicht — direkt davor fehlt eine weitere Hausübung.')
  }

  const { error } = await supabase.from('streak_freezes').insert({
    student_id: profile.id,
    homework_id: breakingHwId,
  } as never)
  if (error) throw new Error(error.message)

  revalidatePath('/streaks')
  revalidatePath('/')
  return { newStreak }
}
