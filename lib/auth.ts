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

export function matchChild<T extends { id: string; full_name: string }>(
  parent: { full_name: string; child_id?: string | null },
  students: T[],
): T | null {
  if (students.length === 0) return null
  if (parent.child_id) return students.find(s => s.id === parent.child_id) ?? null
  return null
}
