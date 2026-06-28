import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { Profile, Class } from '@/lib/types'

/**
 * Holt User + Profil einmal pro Request (dedupliziert via React cache),
 * sodass Layout und Seite nicht jeweils erneut die DB abfragen.
 */
export const getAuth = cache(async (): Promise<{ user: { id: string; email?: string } | null; profile: Profile | null }> => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, profile: null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return { user, profile: (profile as Profile | null) ?? null }
})

/**
 * Lädt eine Klasse einmal pro Request (dedupliziert via React cache nach classId),
 * sodass Layout und Seite sich denselben Fetch teilen.
 */
export const getClass = cache(async (classId: string | null): Promise<Class | null> => {
  if (!classId) return null
  const supabase = await createClient()
  const { data } = await supabase.from('classes').select('id,name,school').eq('id', classId).single()
  return (data as Class | null) ?? null
})

export const getTeacherClasses = cache(async (teacherId: string): Promise<Class[]> => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('teacher_classes')
    .select('is_primary, classes(id,name,school)')
    .eq('teacher_id', teacherId)
    .order('is_primary', { ascending: false })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => r.classes).filter(Boolean) as Class[]
})

export function matchChild<T extends { id: string; full_name: string }>(
  parent: { full_name: string; child_id?: string | null },
  students: T[],
): T | null {
  if (students.length === 0) return null
  if (parent.child_id) return students.find(s => s.id === parent.child_id) ?? null
  return null
}
