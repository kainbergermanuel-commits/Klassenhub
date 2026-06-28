'use server'

import { createClient } from '@/lib/supabase/server'
import { getEffectiveAuth } from '@/lib/previewAuth'

async function getStudentId(): Promise<string> {
  const { profile, user } = await getEffectiveAuth()
  if (!profile || !user) throw new Error('Nicht angemeldet')
  if (profile.role === 'student') return user.id
  if (profile.role === 'parent') {
    if (!profile.child_id) throw new Error('Kein Kind verknüpft')
    return profile.child_id
  }
  throw new Error('Keine Berechtigung')
}

export async function saveTimetableEntry(day: number, slot: number, subject: string) {
  const studentId = await getStudentId()
  const supabase = await createClient()
  const table = supabase.from('timetable_entries' as never)

  if (!subject.trim()) {
    await (table as unknown as ReturnType<typeof supabase.from>).delete()
      .eq('student_id', studentId).eq('day', day).eq('slot', slot)
    return
  }

  const { error } = await (table as unknown as ReturnType<typeof supabase.from>).upsert({
    student_id: studentId,
    day,
    slot,
    subject: subject.trim(),
  } as never, { onConflict: 'student_id,day,slot' }) as unknown as Promise<{ error: { message: string } | null }>
  if (error) throw new Error(error.message)
}
