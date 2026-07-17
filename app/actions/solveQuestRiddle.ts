'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveAuth } from '@/lib/previewAuth'
import { findRiddle } from '@/lib/riddles'
import { checkRiddleAnswer } from '@/lib/riddles.server'

/** Reicht eine Rätsel-Lösung ein. Bei richtig wird der Gelöst-Zustand
 *  gespeichert (quest_riddle_solutions), bei falsch passiert nichts außer
 *  einer sanften Rückmeldung — kein Werfen, kein Lockout, unbegrenzte Versuche
 *  (kein Beschämen, Prinzip 1 / rote Linie "keine Suchtmechanik").
 *
 *  getEffectiveAuth() statt getAuth(): berücksichtigt die "Vorschau als
 *  Schüler:in"-Funktion der Lehrpersonen — analog zu chooseQuestPath.ts.
 *
 *  `scope` = '' → Arc-Item-Rätsel wird einmal gelöst und bleibt gelöst
 *  (dauerhaft). Wochengebundene Rätsel würden hier weekStart übergeben. */
export async function solveQuestRiddle(
  riddleKey: string,
  submitted: string,
  scope = ''
): Promise<{ ok: boolean }> {
  const { user, profile, activeClassId } = await getEffectiveAuth()
  if (!user || !profile || profile.role !== 'student') throw new Error('Unauthorized')
  if (!activeClassId) throw new Error('Keine Klasse')

  const riddle = findRiddle(riddleKey)
  if (!riddle) throw new Error('Unbekanntes Rätsel')

  if (!checkRiddleAnswer(riddleKey, submitted)) {
    return { ok: false }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('quest_riddle_solutions').upsert({
    class_id: activeClassId,
    student_id: profile.id,
    riddle_key: riddleKey,
    scope,
  } as never, { onConflict: 'class_id,student_id,riddle_key,scope', ignoreDuplicates: true })
  if (error) throw new Error(error.message)

  revalidatePath('/')
  revalidatePath('/streaks')
  return { ok: true }
}
