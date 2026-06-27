'use server'

import { createClient } from '@/lib/supabase/server'
import { getAuth } from '@/lib/auth'

export type TeacherSubject = {
  subject: string
  short: string
  color: string
  primary: boolean
}

export async function saveTeacherSubjects(subjects: TeacherSubject[]) {
  const { user, profile } = await getAuth()
  if (!user || profile?.role !== 'teacher') throw new Error('Unauthorized')

  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({ subjects })
    .eq('id', user.id)

  if (error) throw error
}
