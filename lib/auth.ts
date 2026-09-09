import { cache } from 'react'
import { isAuthApiError, isAuthSessionMissingError } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import type { Profile, Class } from '@/lib/types'

/**
 * Die Auth-Abfrage kam nicht durch — Netzwerkaussetzer, Timeout, Supabase 5xx.
 * Ausdrücklich NICHT dasselbe wie „nicht angemeldet": die Session im Cookie
 * ist in diesem Fall unberührt und weiterhin gültig.
 */
export class AuthUnavailableError extends Error {
  constructor(cause: string) {
    super(`Anmeldung konnte nicht geprüft werden: ${cause}`)
    this.name = 'AuthUnavailableError'
  }
}

/**
 * Heißt dieser Fehler wirklich „nicht angemeldet"?
 *
 * `auth.getUser()` liefert bei JEDEM Fehlschlag `user: null` — auch bei einem
 * Netzwerkfehler oder einem 5xx von Supabase. Nur zwei Fälle sind ein echtes
 * Abgemeldetsein: gar keine Session vorhanden (AuthSessionMissingError) oder
 * ein vom Auth-Server abgelehntes Token (401/403). Alles andere ist eine
 * Störung, nach der die Session weiterlebt — supabase-js wirft sie dabei
 * ausdrücklich nicht weg.
 */
function meansSignedOut(error: unknown): boolean {
  if (isAuthSessionMissingError(error)) return true
  return isAuthApiError(error) && (error.status === 401 || error.status === 403)
}

/**
 * Holt User + Profil einmal pro Request (dedupliziert via React cache),
 * sodass Layout und Seite nicht jeweils erneut die DB abfragen.
 *
 * `{ user: null }` bedeutet ausschließlich „nicht angemeldet" — Aufrufer
 * dürfen daraufhin gefahrlos auf /login umleiten. Eine bloße Störung wirft
 * stattdessen AuthUnavailableError und landet in app/error.tsx, damit ein
 * einzelner Aussetzer niemand aus einer gültigen Session wirft.
 */
export const getAuth = cache(async (): Promise<{ user: { id: string; email?: string } | null; profile: Profile | null }> => {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error && !meansSignedOut(error)) throw new AuthUnavailableError(error.message)
  if (!user) return { user: null, profile: null }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // PGRST116 = kein Treffer. Das ist ein echter Datenstand (Konto ohne Profil)
  // und keine Störung; das Profil bleibt dann null. Jeder andere Fehler ist
  // eine Störung und darf nicht als „kein Profil" durchgereicht werden.
  if (profileError && profileError.code !== 'PGRST116') {
    throw new AuthUnavailableError(profileError.message)
  }

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
