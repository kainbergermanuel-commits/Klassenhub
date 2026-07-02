'use server'

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

export async function createEvent(input: {
  title: string
  description: string
  startDate: string
  endDate: string
  allDay: boolean
  startTime: string | null
  endTime: string | null
  location: string
  category: EventCategory
}) {
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
  })
  if (error) throw new Error(error.message)
}

export async function deleteEvent(id: string) {
  const { classId } = await getTeacherClassId()
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('events').delete().eq('id', id).eq('class_id', classId)
  if (error) throw new Error(error.message)
}
