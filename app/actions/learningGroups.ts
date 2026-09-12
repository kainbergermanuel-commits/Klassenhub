'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getAuth } from '@/lib/auth'
import { getEffectiveAuth } from '@/lib/previewAuth'

/**
 * Lerngruppen — klassenübergreifende Unterrichtsgruppen.
 * Siehe supabase/feature-lerngruppen.sql für das Datenmodell und die
 * Begründung, warum eine Gruppe KEINE Klasse ist.
 *
 * Verwaltet wird ausschliesslich von der Administration: eine Gruppe greift
 * über Klassengrenzen, und wer sie zusammenstellt, sieht dabei Kinder aus
 * fremden Klassen. Die führende Lehrperson arbeitet danach mit der fertigen
 * Gruppe, ohne Zugriff auf die beteiligten Klassen zu bekommen.
 *
 * Gegen die ECHTE Rolle geprüft (getAuth), nicht gegen die Rollenvorschau:
 * die Vorschau tauscht nur das Profil, die Datenbanksitzung bleibt die der
 * Lehrperson.
 */

export interface LearningGroupInput {
  name: string
  subject: string
  subjectShort: string
  subjectColor: string
  teacherId: string | null
}

async function requireAdmin(): Promise<string> {
  const { user, profile } = await getAuth()
  if (!user || !profile) throw new Error('Nicht angemeldet')
  if (!profile.is_admin) throw new Error('Nur die Administration darf Lerngruppen verwalten')
  return user.id
}

export async function createLearningGroup(input: LearningGroupInput): Promise<string> {
  const userId = await requireAdmin()
  if (!input.name.trim()) throw new Error('Name fehlt')
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('learning_groups')
    .insert({
      name: input.name.trim(),
      subject: input.subject,
      subject_short: input.subjectShort,
      subject_color: input.subjectColor,
      teacher_id: input.teacherId,
      created_by: userId,
    })
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  revalidatePath('/admin/gruppen')
  return data.id as string
}

export async function updateLearningGroup(groupId: string, input: LearningGroupInput) {
  await requireAdmin()
  if (!input.name.trim()) throw new Error('Name fehlt')
  const supabase = await createClient()
  // Der Name läuft über die Funktion, weil er auch in bereits ausgespielten
  // Hausübungen steht (homework.group_label) und dort mitgezogen werden muss.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: renameError } = await (supabase as any)
    .rpc('rename_learning_group', { p_group: groupId, p_name: input.name.trim() })
  if (renameError) throw new Error(renameError.message)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('learning_groups')
    .update({
      subject: input.subject,
      subject_short: input.subjectShort,
      subject_color: input.subjectColor,
      teacher_id: input.teacherId,
    })
    .eq('id', groupId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/gruppen')
  revalidatePath('/gruppen')
}

export async function setLearningGroupArchived(groupId: string, archived: boolean) {
  await requireAdmin()
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('learning_groups').update({ archived }).eq('id', groupId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/gruppen')
  revalidatePath('/gruppen')
}

/**
 * Löscht eine Gruppe. Bereits ausgespielte Hausübungen bleiben als ganz
 * normale Klassen-HÜ stehen (group_id wird zu null) — die Kinder sollen
 * ihre Aufgaben nicht dadurch verlieren, dass jemand eine Gruppe aufräumt.
 */
export async function deleteLearningGroup(groupId: string) {
  await requireAdmin()
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('learning_groups').delete().eq('id', groupId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/gruppen')
  revalidatePath('/gruppen')
}

/**
 * Setzt die Mitgliederliste einer Gruppe.
 *
 * Bewusst als DIFFERENZ und mit dem Einfügen zuerst, nicht als „erst alles
 * löschen, dann neu schreiben": Scheiterte dort der zweite Schritt — Netzfehler,
 * ein zwischenzeitlich gelöschtes Kind —, stand die Gruppe leer da statt
 * unverändert. Eine Transaktion gibt es über die REST-Schnittstelle nicht, also
 * wird die Reihenfolge so gewählt, dass ein Teilfehler nichts vernichtet:
 * schlägt das Einfügen fehl, ist die alte Liste noch vollständig vorhanden.
 */
export async function setLearningGroupMembers(groupId: string, studentIds: string[]) {
  await requireAdmin()
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const table = () => (supabase as any).from('learning_group_members')

  const { data: current, error: readError } = await table()
    .select('student_id').eq('group_id', groupId)
  if (readError) throw new Error(readError.message)

  const before = new Set(((current ?? []) as { student_id: string }[]).map(r => r.student_id))
  const after = new Set(studentIds)
  const toAdd = studentIds.filter(id => !before.has(id))
  const toRemove = [...before].filter(id => !after.has(id))

  if (toAdd.length > 0) {
    const { error } = await table().insert(toAdd.map(id => ({ group_id: groupId, student_id: id })))
    if (error) throw new Error(error.message)
  }
  if (toRemove.length > 0) {
    const { error } = await table().delete().eq('group_id', groupId).in('student_id', toRemove)
    if (error) throw new Error(error.message)
  }
  revalidatePath('/admin/gruppen')
  revalidatePath('/gruppen')
}

/**
 * Hausübung für eine Lerngruppe. Die Aufteilung auf die beteiligten Klassen
 * passiert in der Datenbank (create_group_homework), nicht hier — sie muss
 * geprüft und in einem Zug geschehen, auch wenn die Lehrperson gar keinen
 * Zugriff auf die beteiligten Klassen hat.
 */
export async function createGroupHomework(
  groupId: string, title: string, dueDate: string, details: string | null,
  /** Mitglieder, die diese eine Hausübung ausnahmsweise NICHT bekommen. */
  excludedIds: string[] = [],
) {
  const { user, profile } = await getAuth()
  if (!user || !profile) throw new Error('Nicht angemeldet')
  if (profile.role !== 'teacher') throw new Error('Keine Berechtigung')
  if (!title.trim()) throw new Error('Aufgabe fehlt')

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).rpc('create_group_homework', {
    p_group: groupId,
    p_title: title.trim(),
    p_due: dueDate,
    p_details: details?.trim() || null,
    p_excluded: excludedIds,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/gruppen')
  revalidatePath('/hausaufgaben')
}

export async function updateGroupHomework(
  batchId: string, title: string, dueDate: string, details: string | null,
) {
  const { user, profile } = await getEffectiveAuth()
  if (!user || !profile) throw new Error('Nicht angemeldet')
  if (profile.role !== 'teacher') throw new Error('Keine Berechtigung')

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).rpc('update_group_homework', {
    p_batch: batchId,
    p_title: title.trim(),
    p_due: dueDate,
    p_details: details?.trim() || null,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/gruppen')
  revalidatePath('/hausaufgaben')
}

export async function deleteGroupHomework(batchId: string) {
  const { user, profile } = await getEffectiveAuth()
  if (!user || !profile) throw new Error('Nicht angemeldet')
  if (profile.role !== 'teacher') throw new Error('Keine Berechtigung')

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).rpc('delete_group_homework', { p_batch: batchId })
  if (error) throw new Error(error.message)
  revalidatePath('/gruppen')
  revalidatePath('/hausaufgaben')
}
