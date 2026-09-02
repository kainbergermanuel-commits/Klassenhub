'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveAuth } from '@/lib/previewAuth'
import { hasSubjectField, type EventCategory } from '@/lib/eventCategories'
import type { Database } from '@/lib/types'

async function getTeacherClassId(): Promise<{ userId: string; classId: string }> {
  const { user, profile, activeClassId } = await getEffectiveAuth()
  if (!user || !profile) throw new Error('Nicht angemeldet')
  if (profile.role !== 'teacher') throw new Error('Keine Berechtigung')
  if (!activeClassId) throw new Error('Keine Klasse aktiv')
  return { userId: user.id, classId: activeClassId }
}

async function getStudentClassId(): Promise<{ userId: string; classId: string }> {
  const { user, profile, activeClassId } = await getEffectiveAuth()
  if (!user || !profile) throw new Error('Nicht angemeldet')
  if (profile.role !== 'student') throw new Error('Keine Berechtigung')
  if (!activeClassId) throw new Error('Keine Klasse aktiv')
  return { userId: user.id, classId: activeClassId }
}

type EventInput = {
  title: string
  description: string
  startDate: string
  endDate: string
  allDay: boolean
  startTime: string | null
  endTime: string | null
  location: string
  category: EventCategory
  /** Fachkürzel, nur bei Schularbeit/Prüfung. */
  subjectShort?: string | null
}

/** Gemeinsame Eingabepruefung von Anlegen und Bearbeiten. Die Uhrzeit war
 *  bisher ungeprueft: "14:00 - 09:00" liess sich speichern, waehrend das
 *  Datum gleich doppelt abgesichert ist (Action und DB-Check-Constraint). */
/** Fach nur behalten, wenn die Kategorie überhaupt eines vorsieht. Sonst
 *  bliebe an einem Ausflug ein Fach hängen, das die Oberfläche nie zeigt —
 *  etwa wenn beim Bearbeiten die Kategorie gewechselt wird. */
function normalizedSubject(input: EventInput): string | null {
  if (!hasSubjectField(input.category)) return null
  const s = input.subjectShort?.trim()
  return s ? s : null
}

/** Existiert das Kürzel im Admin-Katalog? Ein frei erfundenes Fach würde in
 *  der Anzeige farblos bleiben, also hier abfangen statt dort ausblenden. */
async function assertKnownSubject(
  supabase: Awaited<ReturnType<typeof createClient>>,
  short: string | null,
) {
  if (!short) return
  const { data } = await supabase.from('subjects').select('short').eq('short', short).maybeSingle()
  if (!data) throw new Error('Unbekanntes Fach')
}

function validateEventInput(input: EventInput) {
  if (!input.title.trim()) throw new Error('Titel fehlt')
  if (input.endDate < input.startDate) throw new Error('Enddatum liegt vor dem Startdatum')
  if (!input.allDay && input.startTime && input.endTime && input.endTime <= input.startTime) {
    throw new Error('Endzeit liegt vor der Startzeit')
  }
}

export async function createEvent(input: EventInput & { targetStudentIds?: string[] | null }) {
  const { userId, classId } = await getTeacherClassId()
  validateEventInput(input)

  const supabase = await createClient()
  const subjectShort = normalizedSubject(input)
  await assertKnownSubject(supabase, subjectShort)
  const { error } = await supabase.from('events').insert({
    class_id: classId,
    created_by: userId,
    title: input.title.trim(),
    description: input.description.trim(),
    start_date: input.startDate,
    end_date: input.endDate,
    all_day: input.allDay,
    start_time: input.allDay ? null : input.startTime,
    end_time: input.allDay ? null : input.endTime,
    location: input.location.trim(),
    category: input.category,
    target_student_ids: input.targetStudentIds && input.targetStudentIds.length > 0 ? input.targetStudentIds : null,
    subject_short: subjectShort,
  })
  if (error) throw new Error(error.message)
  // Server-seitige Revalidierung, damit die Termine-Ansicht nach dem Anlegen
  // deterministisch frisch ist (nicht nur vom Client-router.refresh() abhängig).
  revalidatePath('/termine')
  revalidatePath('/')
}

// Schüler:innen dürfen nur persönliche Termine für sich selbst anlegen (nie klassenweit, nie für andere)
export async function createOwnEvent(input: EventInput) {
  const { userId, classId } = await getStudentClassId()
  validateEventInput(input)

  const supabase = await createClient()
  const subjectShort = normalizedSubject(input)
  await assertKnownSubject(supabase, subjectShort)
  const { error } = await supabase.from('events').insert({
    class_id: classId,
    created_by: userId,
    title: input.title.trim(),
    description: input.description.trim(),
    start_date: input.startDate,
    end_date: input.endDate,
    all_day: input.allDay,
    start_time: input.allDay ? null : input.startTime,
    end_time: input.allDay ? null : input.endTime,
    location: input.location.trim(),
    category: input.category,
    target_student_ids: [userId],
    subject_short: subjectShort,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/termine')
  revalidatePath('/')
}

/** Bestehenden Termin ändern. Lehrpersonen dürfen jeden Termin ihrer Klasse
 *  bearbeiten, Schüler:innen ausschliesslich ihre eigenen — dieselbe Regel wie
 *  beim Löschen, zusätzlich hart über die RLS-Policies abgesichert.
 *
 *  `targetStudentIds` ist bewusst optional: fehlt das Feld, bleibt die
 *  Zielgruppe unangetastet. Würde ein fehlendes Feld als `null` geschrieben,
 *  machte das Bearbeiten aus dem persönlichen Termin eines Kindes einen
 *  klassenweiten — der private Eintrag wäre plötzlich für alle sichtbar. */
export async function updateEvent(
  id: string,
  input: EventInput & { targetStudentIds?: string[] | null },
) {
  const { user, profile, activeClassId } = await getEffectiveAuth()
  if (!user || !profile) throw new Error('Nicht angemeldet')
  if (!activeClassId) throw new Error('Keine Klasse aktiv')
  if (profile.role !== 'teacher' && profile.role !== 'student') throw new Error('Keine Berechtigung')
  validateEventInput(input)

  const isStudent = profile.role === 'student'
  // Bewusst typisiert statt Record<string, unknown>: so faellt ein vertippter
  // Spaltenname beim Kompilieren auf und nicht erst zur Laufzeit.
  const patch: Database['public']['Tables']['events']['Update'] = {
    title: input.title.trim(),
    description: input.description.trim(),
    start_date: input.startDate,
    end_date: input.endDate,
    all_day: input.allDay,
    start_time: input.allDay ? null : input.startTime,
    end_time: input.allDay ? null : input.endTime,
    location: input.location.trim(),
    category: input.category,
    subject_short: normalizedSubject(input),
  }
  if (isStudent) {
    // Serverseitig erzwungen: ein Kind kann seinen Termin nie klassenweit oder
    // an andere richten, auch nicht durch einen manipulierten Aufruf.
    patch.target_student_ids = [user.id]
  } else if (input.targetStudentIds !== undefined) {
    patch.target_student_ids = input.targetStudentIds && input.targetStudentIds.length > 0
      ? input.targetStudentIds
      : null
  }

  const supabase = await createClient()
  await assertKnownSubject(supabase, patch.subject_short ?? null)
  let query = supabase.from('events').update(patch).eq('id', id).eq('class_id', activeClassId)
  if (isStudent) query = query.eq('created_by', user.id)

  // `.select()` macht sichtbar, ob wirklich eine Zeile getroffen wurde. Ohne
  // das liefert ein von RLS blockierter oder ins Leere laufender Update
  // keinen Fehler, sondern still null Treffer — das Formular schlösse sich
  // und nichts hätte sich geändert.
  const { data, error } = await query.select('id')
  if (error) throw new Error(error.message)
  if (!data || data.length === 0) throw new Error('Termin konnte nicht geändert werden.')

  revalidatePath('/termine')
  revalidatePath('/')
}

export async function deleteEvent(id: string) {
  const { user, profile, activeClassId } = await getEffectiveAuth()
  if (!user || !profile) throw new Error('Nicht angemeldet')
  if (!activeClassId) throw new Error('Keine Klasse aktiv')
  if (profile.role !== 'teacher' && profile.role !== 'student') throw new Error('Keine Berechtigung')

  const supabase = await createClient()
  let query = supabase.from('events').delete().eq('id', id).eq('class_id', activeClassId)
  if (profile.role === 'student') query = query.eq('created_by', user.id)
  const { error } = await query
  if (error) throw new Error(error.message)
  revalidatePath('/termine')
  revalidatePath('/')
}
