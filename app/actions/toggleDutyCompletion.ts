'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveAuth } from '@/lib/previewAuth'
import { confirmableWeekday } from '@/lib/duty'

/** Selbstbestätigung des eigenen Dienstes für einen bestimmten Wochentag
 *  (1=Mo … 5=Fr) — SDT-Autonomie: das Kind kontrolliert sich selbst, kein
 *  Lehrer-Haken. Schließt die "ehrliche Datenlücke" aus dem Gamification-Plan. */
export async function toggleDutyCompletion(dutyId: string, weekday: number, done: boolean): Promise<void> {
  const { user, profile, isPreview } = await getEffectiveAuth()
  if (!user || !profile || profile.role !== 'student') throw new Error('Unauthorized')
  // In der Lehrer-Vorschau ist die Datenbank-Session weiterhin die des Lehrers:
  // ein Schreibversuch scheitert an der RLS-Policy (student_id = auth.uid()),
  // beim Löschen träfe er stillschweigend null Zeilen. Statt eines toten
  // Bedienelements hier ein klarer Abbruch, den die Oberfläche anzeigen kann.
  if (isPreview) throw new Error('In der Vorschau lässt sich der Dienst nicht abhaken.')
  if (!Number.isInteger(weekday) || weekday < 1 || weekday > 5) throw new Error('Ungültiger Wochentag')

  const supabase = await createClient()

  // Server-seitiges Gegenstück zum UI-Schutz in DutyModule/DutyWeek: ein Tag
  // darf erst als erledigt gelten, sobald er in SEINER Dienstwoche vergangen
  // ist. Die Woche kommt aus der Datenbank, nicht vom Client — sonst könnte
  // ein direkter Action-Aufruf die ganze Woche vorab abhaken und die
  // Dienst-Quest ohne echtes Zutun erfüllen. Löschen (done=false) bleibt
  // uneingeschränkt, dafür gibt es keinen Missbrauchsfall.
  if (done) {
    const { data: duty, error: dutyError } = await supabase
      .from('duties')
      .select('week_start')
      .eq('id', dutyId)
      .single()
    if (dutyError || !duty) throw new Error('Dienst nicht gefunden')
    if (weekday > confirmableWeekday(duty.week_start)) {
      throw new Error('Dieser Tag liegt noch in der Zukunft')
    }
  }

  if (!done) {
    const { error } = await supabase
      .from('duty_completions')
      .delete()
      .match({ duty_id: dutyId, student_id: profile.id, weekday })
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase
      .from('duty_completions')
      .upsert({ duty_id: dutyId, student_id: profile.id, weekday } as never)
    if (error) throw new Error(error.message)
  }

  revalidatePath('/')
  revalidatePath('/streaks')
  revalidatePath('/dienste')
}
