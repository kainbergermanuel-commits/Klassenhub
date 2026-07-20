'use server'

import { createClient } from '@/lib/supabase/server'
import { getEffectiveAuth } from '@/lib/previewAuth'
import type { AttendanceStatus } from '@/lib/types'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

async function getTeacherCtx(): Promise<{ userId: string; classId: string }> {
  const { user, profile, activeClassId } = await getEffectiveAuth()
  if (!user || !profile) throw new Error('Nicht angemeldet')
  if (profile.role !== 'teacher') throw new Error('Keine Berechtigung')
  if (!activeClassId) throw new Error('Keine Klasse aktiv')
  return { userId: user.id, classId: activeClassId }
}

/** Lehrperson: Status für (Schüler:in, Tag) setzen. Bestehende Einträge
 *  (auch Elternmeldungen) werden aktualisiert und gelten damit als bestätigt —
 *  die Eltern-Notiz bleibt dabei erhalten. */
export async function setAttendanceStatus(studentId: string, date: string, status: AttendanceStatus) {
  const { userId, classId } = await getTeacherCtx()
  if (!ISO_DATE.test(date)) throw new Error('Ungültiges Datum')
  if (status !== 'entschuldigt' && status !== 'unentschuldigt') throw new Error('Ungültiger Status')

  const supabase = await createClient()
  const { data: student } = await supabase
    .from('profiles').select('id,role,class_id').eq('id', studentId).maybeSingle()
  if (!student || student.role !== 'student' || student.class_id !== classId) {
    throw new Error('Schüler:in gehört nicht zur aktiven Klasse')
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { data: existing } = await sb
    .from('attendance').select('id').eq('student_id', studentId).eq('date', date).maybeSingle()

  const confirmed = { confirmed_by: userId, confirmed_at: new Date().toISOString() }
  const { error } = existing
    ? await sb.from('attendance').update({ status, ...confirmed }).eq('id', existing.id)
    : await sb.from('attendance').insert({
        class_id: classId, student_id: studentId, date, status,
        source: 'teacher', reported_by: userId, ...confirmed,
      })
  if (error) throw new Error(error.message)
}

/** Lehrperson: Eintrag entfernen (= wieder anwesend). */
export async function clearAttendance(studentId: string, date: string) {
  const { classId } = await getTeacherCtx()
  if (!ISO_DATE.test(date)) throw new Error('Ungültiges Datum')
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('attendance').delete()
    .eq('student_id', studentId).eq('date', date).eq('class_id', classId)
  if (error) throw new Error(error.message)
}

/** Lehrperson: offene Elternmeldung mit einem Tap bestätigen. */
export async function confirmReport(id: string) {
  const { userId, classId } = await getTeacherCtx()
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('attendance')
    .update({ confirmed_by: userId, confirmed_at: new Date().toISOString() })
    .eq('id', id).eq('class_id', classId).is('confirmed_at', null)
  if (error) throw new Error(error.message)
}

/** Lehrperson: offene Elternmeldung ablehnen (Eintrag entfernen = anwesend). */
export async function rejectReport(id: string) {
  const { classId } = await getTeacherCtx()
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('attendance').delete()
    .eq('id', id).eq('class_id', classId).eq('source', 'parent').is('confirmed_at', null)
  if (error) throw new Error(error.message)
}

/** Lehrperson: mehrere Kinder für einen Zeitraum als entschuldigt eintragen
 *  (Skikurs, Wettbewerb, längere Krankheit).
 *
 *  Zwei Schritte statt eines Upserts mit Overwrite: Erst die fehlenden Tage
 *  einfügen, dann alle betroffenen Zeilen auf "entschuldigt + bestätigt"
 *  setzen. Ein überschreibender Upsert würde die Eltern-Notiz einer bereits
 *  vorhandenen Meldung mitlöschen — so bleibt sie erhalten, und offene
 *  Elternmeldungen im Zeitraum gelten nebenbei als bestätigt.
 *
 *  Wochenenden werden übersprungen. Max. 30 Tage (großzügiger als bei Eltern,
 *  weil hier auch längere Kuraufenthalte eingetragen werden). */
export async function setBulkAbsence(
  studentIds: string[],
  startDate: string,
  endDate: string,
  note: string,
): Promise<{ students: number; days: number }> {
  const { userId, classId } = await getTeacherCtx()
  if (studentIds.length === 0) throw new Error('Bitte mindestens ein Kind auswählen')
  if (!ISO_DATE.test(startDate) || !ISO_DATE.test(endDate)) throw new Error('Ungültiges Datum')
  if (endDate < startDate) throw new Error('Enddatum liegt vor dem Startdatum')

  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)
  const spanDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1
  if (spanDays > 30) throw new Error('Bitte maximal 30 Tage pro Eintrag')

  const supabase = await createClient()

  // Alle gewählten Kinder müssen zur aktiven Klasse gehören — sonst könnte über
  // manipulierte IDs in fremde Klassen geschrieben werden.
  const { data: valid } = await supabase
    .from('profiles').select('id').eq('class_id', classId).eq('role', 'student').in('id', studentIds)
  const validIds = (valid ?? []).map(s => s.id)
  if (validIds.length !== studentIds.length) {
    throw new Error('Mindestens ein Kind gehört nicht zur aktiven Klasse')
  }

  const dates: string[] = []
  for (let i = 0; i < spanDays; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const weekday = d.getDay()
    if (weekday === 0 || weekday === 6) continue
    dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
  }
  if (dates.length === 0) throw new Error('Der Zeitraum enthält nur Wochenendtage')

  const trimmedNote = note.trim().slice(0, 300)
  const rows = validIds.flatMap(studentId =>
    dates.map(date => ({
      class_id: classId,
      student_id: studentId,
      date,
      status: 'entschuldigt' as const,
      note: trimmedNote,
      source: 'teacher' as const,
      reported_by: userId,
      confirmed_by: userId,
      confirmed_at: new Date().toISOString(),
    }))
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { error: insertError } = await sb
    .from('attendance').upsert(rows, { onConflict: 'student_id,date', ignoreDuplicates: true })
  if (insertError) throw new Error(insertError.message)

  const { error: updateError } = await sb
    .from('attendance')
    .update({ status: 'entschuldigt', confirmed_by: userId, confirmed_at: new Date().toISOString() })
    .eq('class_id', classId).in('student_id', validIds).in('date', dates)
  if (updateError) throw new Error(updateError.message)

  return { students: validIds.length, days: dates.length }
}

/** Elternteil: eigenes Kind für einen Tag oder Zeitraum abmelden.
 *  Wochenenden werden übersprungen; bereits vorhandene Einträge bleiben
 *  unangetastet (ON CONFLICT DO NOTHING). Max. 14 Tage pro Meldung. */
export async function reportAbsence(startDate: string, endDate: string, note: string) {
  const { user, profile } = await getEffectiveAuth()
  if (!user || !profile) throw new Error('Nicht angemeldet')
  if (profile.role !== 'parent') throw new Error('Keine Berechtigung')
  if (!profile.child_id) throw new Error('Kein Kind verknüpft')
  if (!ISO_DATE.test(startDate) || !ISO_DATE.test(endDate)) throw new Error('Ungültiges Datum')
  if (endDate < startDate) throw new Error('Enddatum liegt vor dem Startdatum')

  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)
  const spanDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1
  if (spanDays > 14) throw new Error('Bitte maximal 14 Tage pro Meldung')

  const supabase = await createClient()
  const { data: child } = await supabase
    .from('profiles').select('id,class_id').eq('id', profile.child_id).maybeSingle()
  if (!child?.class_id) throw new Error('Kind ist keiner Klasse zugeordnet')

  const rows = []
  for (let i = 0; i < spanDays; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const weekday = d.getDay()
    if (weekday === 0 || weekday === 6) continue // Wochenende überspringen
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    rows.push({
      class_id: child.class_id,
      student_id: child.id,
      date: iso,
      status: 'entschuldigt',
      note: note.trim().slice(0, 300),
      source: 'parent',
      reported_by: user.id,
    })
  }
  if (rows.length === 0) throw new Error('Der Zeitraum enthält nur Wochenendtage')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('attendance')
    .upsert(rows, { onConflict: 'student_id,date', ignoreDuplicates: true })
  if (error) throw new Error(error.message)
}

/** Elternteil: eigene, noch unbestätigte Meldung zurückziehen. */
export async function withdrawReport(id: string) {
  const { user, profile } = await getEffectiveAuth()
  if (!user || !profile) throw new Error('Nicht angemeldet')
  if (profile.role !== 'parent') throw new Error('Keine Berechtigung')
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('attendance').delete()
    .eq('id', id).eq('reported_by', user.id).is('confirmed_at', null)
  if (error) throw new Error(error.message)
}
