'use server'

import { createClient } from '@/lib/supabase/server'
import { getAuth } from '@/lib/auth'
import { getEffectiveAuth } from '@/lib/previewAuth'

export type TeacherSubject = {
  subject: string
  short: string
  color: string
  primary: boolean
}

export async function saveTeacherSubjects(subjects: TeacherSubject[]) {
  const { user, profile } = await getAuth()
  if (!user || profile?.role !== 'teacher') throw new Error('Unauthorized')

  const { activeClassId } = await getEffectiveAuth()
  if (!activeClassId) throw new Error('Keine aktive Klasse')

  const supabase = await createClient()
  const { error } = await (supabase
    .from('teacher_classes' as string)
    .update({ subjects })
    .eq('teacher_id', user.id)
    .eq('class_id', activeClassId) as unknown as Promise<{ error: unknown }>)

  if (error) throw error
}
