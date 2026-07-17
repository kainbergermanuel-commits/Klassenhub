'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveAuth } from '@/lib/previewAuth'

/** Standard-Stundenplan der Klasse (Lehrer-Feature): eine Zelle im
 *  Klassen-Vorlage-Raster setzen/löschen. Der eigentliche Push an die
 *  Kinder passiert erst mit pushClassTimetable() — dies hier speichert nur
 *  die Vorlage (class_timetable_entries), noch nichts bei den Kindern. */
export async function saveClassTimetableEntry(day: number, slot: number, subject: string): Promise<void> {
  const { user, profile, activeClassId } = await getEffectiveAuth()
  if (!user || !profile || profile.role !== 'teacher') throw new Error('Unauthorized')
  if (!activeClassId) throw new Error('Keine aktive Klasse')

  const supabase = await createClient()
  const table = (supabase as unknown as { from: (t: string) => any }).from('class_timetable_entries')

  if (!subject.trim()) {
    await table.delete().eq('class_id', activeClassId).eq('day', day).eq('slot', slot)
  } else {
    const { error } = await table.upsert(
      { class_id: activeClassId, day, slot, subject: subject.trim(), updated_at: new Date().toISOString() },
      { onConflict: 'class_id,day,slot' }
    )
    if (error) throw new Error(error.message)
  }

  revalidatePath('/stundenplan')
}

/** Kopiert den aktuellen Klassen-Standardplan in die persönlichen
 *  timetable_entries JEDES Kindes der Klasse — überschreibt bestehende
 *  Einträge der Kinder vollständig (Manuels Entscheidung: einfach &
 *  vorhersehbar). Kinder/Eltern können danach wie gewohnt weiter selbst
 *  bearbeiten — der Push liefert nur den Startzustand. */
export async function pushClassTimetable(): Promise<{ studentCount: number }> {
  const { user, profile, activeClassId } = await getEffectiveAuth()
  if (!user || !profile || profile.role !== 'teacher') throw new Error('Unauthorized')
  if (!activeClassId) throw new Error('Keine aktive Klasse')

  const supabase = await createClient()

  const [{ data: template }, { data: students }] = await Promise.all([
    (supabase.from('class_timetable_entries' as never).select('day,slot,subject').eq('class_id', activeClassId) as unknown as Promise<{ data: { day: number; slot: number; subject: string }[] | null }>),
    supabase.from('profiles').select('id').eq('class_id', activeClassId).eq('role', 'student'),
  ])

  const studentIds = (students ?? []).map(s => s.id)
  if (studentIds.length === 0) return { studentCount: 0 }

  const timetableTable = (supabase as unknown as { from: (t: string) => any }).from('timetable_entries')

  // Vollständig überschreiben: erst alle bestehenden Zeilen der Kinder
  // löschen, dann die Vorlage für jedes Kind neu einfügen.
  const { error: deleteError } = await timetableTable.delete().in('student_id', studentIds)
  if (deleteError) throw new Error(deleteError.message)

  if ((template ?? []).length > 0) {
    const rows = studentIds.flatMap(studentId =>
      (template ?? []).map(t => ({ student_id: studentId, day: t.day, slot: t.slot, subject: t.subject }))
    )
    const { error: insertError } = await timetableTable.insert(rows)
    if (insertError) throw new Error(insertError.message)
  }

  revalidatePath('/stundenplan')
  return { studentCount: studentIds.length }
}
