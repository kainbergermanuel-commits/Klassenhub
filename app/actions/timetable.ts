'use server'

import { createClient } from '@/lib/supabase/server'
import { getEffectiveAuth } from '@/lib/previewAuth'
import { getActiveChild } from '@/lib/auth'

async function getStudentId(): Promise<string> {
  const { profile, user } = await getEffectiveAuth()
  if (!profile || !user) throw new Error('Nicht angemeldet')
  if (profile.role === 'student') return user.id
  if (profile.role === 'parent') {
    // Aktives Kind, sonst das Hauptkind. Der Rückfall hält die Rollen-Vorschau
    // am Leben, die kein echtes Elternkonto hinter sich hat.
    const aktiv = await getActiveChild(profile.id)
    const studentId = aktiv?.id ?? profile.child_id
    if (!studentId) throw new Error('Kein Kind verknüpft')
    return studentId
  }
  throw new Error('Keine Berechtigung')
}

export async function saveTimetableEntry(day: number, slot: number, subject: string) {
  const studentId = await getStudentId()
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const table = (supabase as any).from('timetable_entries')

  if (!subject.trim()) {
    await table.delete().eq('student_id', studentId).eq('day', day).eq('slot', slot)
    return
  }

  const { error } = await table.upsert(
    { student_id: studentId, day, slot, subject: subject.trim() },
    { onConflict: 'student_id,day,slot' }
  )
  if (error) throw new Error(error.message)
}
