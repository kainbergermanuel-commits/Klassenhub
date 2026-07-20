'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveAuth } from '@/lib/previewAuth'

/** Persönlicher Stundenplan der Lehrperson (siehe supabase/add-teacher-
 *  timetable.sql): eine Zelle setzen oder löschen. Anders als beim
 *  Klassen-Standardplan gibt es hier bewusst KEINEN Push — der Plan gehört
 *  nur der Lehrperson und geht an niemanden raus.
 *
 *  classLabel ist reiner Freitext ("4a") ohne Verknüpfung auf classes. */
export async function saveTeacherTimetableEntry(
  day: number,
  slot: number,
  subject: string,
  classLabel: string,
): Promise<void> {
  const { user, profile } = await getEffectiveAuth()
  if (!user || !profile || profile.role !== 'teacher') throw new Error('Unauthorized')

  const supabase = await createClient()
  const table = (supabase as unknown as { from: (t: string) => any }).from('teacher_timetable_entries')

  // Kein Fach = kein Eintrag. Ein Klassen-Label allein ergibt keine Stunde,
  // deshalb löscht ein leeres Fach die Zelle vollständig.
  if (!subject.trim()) {
    await table.delete().eq('teacher_id', user.id).eq('day', day).eq('slot', slot)
  } else {
    const { error } = await table.upsert(
      {
        teacher_id: user.id,
        day,
        slot,
        subject: subject.trim(),
        class_label: classLabel.trim().slice(0, 20),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'teacher_id,day,slot' },
    )
    if (error) throw new Error(error.message)
  }

  revalidatePath('/stundenplan')
  revalidatePath('/')
}
