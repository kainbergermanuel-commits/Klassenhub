'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveAuth } from '@/lib/previewAuth'
import type { EventCategory } from '@/lib/eventCategories'

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
}

export async function createEvent(input: EventInput & { targetStudentIds?: string[] | null }) {
  const { userId, classId } = await getTeacherClassId()
  if (!input.title.trim()) throw new Error('Titel fehlt')
  if (input.endDate < input.startDate) throw new Error('Enddatum liegt vor dem Startdatum')

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('events').insert({
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
  if (!input.title.trim()) throw new Error('Titel fehlt')
  if (input.endDate < input.startDate) throw new Error('Enddatum liegt vor dem Startdatum')

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('events').insert({
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
  })
  if (error) throw new Error(error.message)
  revalidatePath('/termine')
  revalidatePath('/')
}

export async function deleteEvent(id: string) {
  const { user, profile, activeClassId } = await getEffectiveAuth()
  if (!user || !profile) throw new Error('Nicht angemeldet')
  if (!activeClassId) throw new Error('Keine Klasse aktiv')
  if (profile.role !== 'teacher' && profile.role !== 'student') throw new Error('Keine Berechtigung')

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any).from('events').delete().eq('id', id).eq('class_id', activeClassId)
  if (profile.role === 'student') query = query.eq('created_by', user.id)
  const { error } = await query
  if (error) throw new Error(error.message)
  revalidatePath('/termine')
  revalidatePath('/')
}
