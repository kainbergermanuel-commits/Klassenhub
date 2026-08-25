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

  const supabase = await createClient()
  const correct = checkRiddleAnswer(riddleKey, submitted)

  // Jeden Versuch protokollieren, richtig wie falsch (siehe
  // supabase/feature-riddle-attempts.sql). Ohne das bliebe unsichtbar, ob ein
  // Rätsel zum Nachlesen einlädt oder ob man die Antwort raten kann.
  // Fehlertolerant wie der achievements-Upsert unten: reine Analytik, sie darf
  // das Lösen nie scheitern lassen (z.B. in der Lehrer-Vorschau-als-Schüler,
  // wo die RLS gegen den echten auth.uid() prüft).
  await supabase.from('quest_riddle_attempts').insert(
    { class_id: activeClassId, student_id: profile.id, riddle_key: riddleKey, correct } as never,
  )

  if (!correct) {
    return { ok: false }
  }

  const { error } = await supabase.from('quest_riddle_solutions').upsert({
    class_id: activeClassId,
    student_id: profile.id,
    riddle_key: riddleKey,
    scope,
  } as never, { onConflict: 'class_id,student_id,riddle_key,scope', ignoreDuplicates: true })
  if (error) throw new Error(error.message)

  // Erfolg fürs Logbuch protokollieren (kind='riddle', period='' = dauerhaft) —
  // fehlertolerant wie die übrigen achievements-Inserts: schlägt z.B. in der
  // Lehrer-Vorschau-als-Schüler fehl (RLS prüft echten auth.uid()), das ist
  // reine Bonus-Statistik und darf das Lösen selbst nicht scheitern lassen.
  await supabase.from('achievements').upsert(
    { student_id: profile.id, kind: 'riddle', key: riddleKey, period: '' } as never,
    { onConflict: 'student_id,kind,key,period', ignoreDuplicates: true }
  )

  revalidatePath('/')
  revalidatePath('/streaks')
  return { ok: true }
}
