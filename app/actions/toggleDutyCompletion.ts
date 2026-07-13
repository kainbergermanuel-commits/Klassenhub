'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveAuth } from '@/lib/previewAuth'

/** Selbstbestätigung des eigenen Dienstes (SDT-Autonomie: das Kind
 *  kontrolliert sich selbst, kein Lehrer-Haken). Schließt die "ehrliche
 *  Datenlücke" aus dem Gamification-Plan — die Dienst-Quest zählt jetzt die
 *  echte Erledigung statt nur die Zuteilung. */
export async function toggleDutyCompletion(dutyId: string, done: boolean): Promise<void> {
  const { user, profile } = await getEffectiveAuth()
  if (!user || !profile || profile.role !== 'student') throw new Error('Unauthorized')

  const supabase = await createClient()

  if (!done) {
    const { error } = await supabase
      .from('duty_completions')
      .delete()
      .match({ duty_id: dutyId, student_id: profile.id })
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase
      .from('duty_completions')
      .upsert({ duty_id: dutyId, student_id: profile.id } as never)
    if (error) throw new Error(error.message)
  }

  revalidatePath('/')
  revalidatePath('/streaks')
  revalidatePath('/dienste')
}
