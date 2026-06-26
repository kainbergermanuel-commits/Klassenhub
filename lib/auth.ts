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
 * Zuordnung Elternteil → Kind.
 * 1. Bevorzugt den echten DB-Link `child_id` (Spalte auf profiles).
 * 2. Fällt für (noch) unverknüpfte Eltern auf die Nachnamen-Heuristik
 *    zurück (z. B. „Fam. Hofer" → Schüler:in, deren Name auf „Hofer" endet).
 */
export function matchChild<T extends { id: string; full_name: string }>(
  parent: { full_name: string; child_id?: string | null },
  students: T[],
): T | null {
  if (students.length === 0) return null
  // 1. Echter Beziehungs-Link
  if (parent.child_id) {
    const linked = students.find(s => s.id === parent.child_id)
    if (linked) return linked
  }
  // 2. Fallback: Nachnamen-Heuristik
  const lastName = parent.full_name.trim().split(/\s+/).slice(-1)[0]?.toLowerCase() ?? ''
  if (!lastName) return students[0]
  const match = students.find(s => s.full_name.toLowerCase().endsWith(lastName))
  return match ?? students[0]
}
