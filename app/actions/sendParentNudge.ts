'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveAuth } from '@/lib/previewAuth'
import { localDateOf, todayLocal } from '@/lib/date'

/** Setzt die Botenfeder ein (max. 1× pro Tag) — schickt einen kanonischen,
 *  vordefinierten Hinweis an die Eltern ("Dein Kind bittet um Bestätigung
 *  von HÜ X"). Bewusst kein Freitext: zielt automatisch auf die älteste noch
 *  unbestätigte, aber bereits erledigte Hausübung. */
export async function sendParentNudge(): Promise<{ homeworkTitle: string }> {
  const { user, profile } = await getEffectiveAuth()
  if (!user?.id || !profile || profile.role !== 'student') throw new Error('Unauthorized')

  const supabase = await createClient()

  // BEIDE Seiten des Vergleichs über dieselbe Zeitzone führen. Vorher stand
  // hier todayISO() (lokales Wiener Datum) gegen created_at.slice(0,10)
  // (UTC-Datum): zwischen 00:00 und 02:00 Wiener Zeit liegt der UTC-Tag noch
  // im Vortag, das Tageslimit griff dann nicht — und die Anzeige widersprach
  // der Aktion, weil streaks/page.tsx bereits korrekt localDateOf/todayLocal
  // benutzt. Siehe lib/date.ts: „IMMER beide Seiten über diesen Helper".
  const { data: recentNudges } = await supabase
    .from('parent_nudges')
    .select('id,created_at')
    .eq('student_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(5)
  if ((recentNudges ?? []).some(n => localDateOf(n.created_at) === todayLocal())) {
    throw new Error('Heute schon eine Erinnerung geschickt')
  }

  const { data: pending } = await supabase
    .from('homework_completions')
    .select('homework_id,completed_at,homework:homework_id(title)')
    .eq('student_id', profile.id)
    .is('confirmed_by_parent_at', null)
    .order('completed_at', { ascending: true })
    .limit(1)

  const target = (pending ?? [])[0] as { homework_id: string; homework: { title: string } | null } | undefined
  if (!target) throw new Error('Keine offene Bestätigung')

  const { error } = await supabase.from('parent_nudges').insert({
    student_id: profile.id,
    homework_id: target.homework_id,
  } as never)
  if (error) throw new Error(error.message)

  revalidatePath('/streaks')
  revalidatePath('/')
  return { homeworkTitle: target.homework?.title ?? 'eine Hausübung' }
}
