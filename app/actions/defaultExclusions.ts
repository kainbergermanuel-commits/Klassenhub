'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveAuth } from '@/lib/previewAuth'

/**
 * Standard-Ausnahmen: „dieses Kind ist in diesem Fach dauerhaft nicht dabei".
 *
 * Gespeichert wird ausschliesslich die organisatorische Tatsache, nie ihr
 * Grund — kein Förderstatus, keine Diagnose. Siehe
 * supabase/add-subject-default-exclusions.sql.
 *
 * Die Ausnahme wirkt NUR als Vorauswahl beim Anlegen einer Hausübung. In der
 * Hausübung selbst landet danach wie bisher allein excluded_student_ids;
 * auf dem Lesepfad der Kinder ändert sich dadurch nichts.
 */

async function requireTeacherClass(classId: string) {
  const { user, profile } = await getEffectiveAuth()
  if (!user || !profile) throw new Error('Nicht angemeldet')
  if (profile.role !== 'teacher') throw new Error('Keine Berechtigung')
  if (!classId) throw new Error('Keine Klasse')
  return user.id
}

export async function setSubjectDefaultExclusion(
  classId: string, studentId: string, subjectShort: string, excluded: boolean,
) {
  const userId = await requireTeacherClass(classId)
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const table = (supabase as any).from('subject_default_exclusions')

  if (excluded) {
    const { error } = await table.upsert(
      { class_id: classId, student_id: studentId, subject_short: subjectShort, created_by: userId },
      { onConflict: 'class_id,student_id,subject_short' },
    )
    if (error) throw new Error(error.message)
  } else {
    const { error } = await table.delete()
      .eq('class_id', classId).eq('student_id', studentId).eq('subject_short', subjectShort)
    if (error) throw new Error(error.message)
  }
  revalidatePath('/einstellungen')
}
