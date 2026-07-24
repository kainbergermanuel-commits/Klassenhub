'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveAuth } from '@/lib/previewAuth'

/** Gangaufsicht der Lehrperson für (Tag, Pause) setzen oder entfernen (siehe
 *  supabase/add-teacher-supervisions.sql). Wie beim persönlichen Stundenplan:
 *  rein persönlich, kein Push an Kinder/Eltern.
 *
 *  break_slot 0 = vor der 1. Stunde, N = Pause nach der N. Stunde. Zeit/Länge
 *  ergeben sich clientseitig aus lib/supervisionSlots.ts, werden nicht gespeichert. */
export async function setSupervision(day: number, breakSlot: number, on: boolean): Promise<void> {
  const { user, profile } = await getEffectiveAuth()
  if (!user || !profile || profile.role !== 'teacher') throw new Error('Unauthorized')

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const table = (supabase as unknown as { from: (t: string) => any }).from('teacher_supervisions')

  if (on) {
    const { error } = await table.upsert(
      { teacher_id: user.id, day, break_slot: breakSlot, updated_at: new Date().toISOString() },
      { onConflict: 'teacher_id,day,break_slot' },
    )
    if (error) throw new Error(error.message)
  } else {
    const { error } = await table.delete()
      .eq('teacher_id', user.id).eq('day', day).eq('break_slot', breakSlot)
    if (error) throw new Error(error.message)
  }

  revalidatePath('/stundenplan')
  revalidatePath('/')
}
