'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveAuth } from '@/lib/previewAuth'

/** Selbstbestätigung des eigenen Dienstes für einen bestimmten Wochentag
 *  (1=Mo … 5=Fr) — SDT-Autonomie: das Kind kontrolliert sich selbst, kein
 *  Lehrer-Haken. Schließt die "ehrliche Datenlücke" aus dem Gamification-Plan. */
export async function toggleDutyCompletion(dutyId: string, weekday: number, done: boolean): Promise<void> {
  const { user, profile } = await getEffectiveAuth()
  if (!user || !profile || profile.role !== 'student') throw new Error('Unauthorized')
  if (!Number.isInteger(weekday) || weekday < 1 || weekday > 5) throw new Error('Ungültiger Wochentag')

  const supabase = await createClient()

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
