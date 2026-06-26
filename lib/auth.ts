import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/lib/types'

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
 * Interim-Zuordnung Elternteil → Kind über den Nachnamen
 * (z. B. „Fam. Hofer" → Schüler:in, deren Name auf „Hofer" endet).
 * TODO: durch echtes Beziehungsmodell ersetzen (Teil 3).
 */
export function matchChild<T extends { full_name: string }>(parentName: string, students: T[]): T | null {
  if (students.length === 0) return null
  const lastName = parentName.trim().split(/\s+/).slice(-1)[0]?.toLowerCase() ?? ''
  if (!lastName) return students[0]
  const match = students.find(s => s.full_name.toLowerCase().endsWith(lastName))
  return match ?? students[0]
}
