'use server'

import { createClient } from '@/lib/supabase/server'
import { getAuth } from '@/lib/auth'

export async function confirmHomeworkCompletion(homeworkId: string, studentId: string) {
  const { profile } = await getAuth()
  if (!profile || profile.role !== 'parent') throw new Error('Unauthorized')
  if (profile.child_id !== studentId) throw new Error('Not your child')

  const supabase = await createClient()
  const { error } = await supabase
    .from('homework_completions')
    .update({ confirmed_by_parent_at: new Date().toISOString() } as never)
    .eq('homework_id', homeworkId)
    .eq('student_id', studentId)

  if (error) throw new Error(error.message)
}
