'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getAuth } from '@/lib/auth'

async function requireAdmin() {
  const { profile } = await getAuth()
  if (!profile?.is_admin) throw new Error('Unauthorized')
}

export interface SubjectInput {
  label: string
  short: string
  color: string
}

/** Fächer-Katalog (Admin-Feature, siehe supabase/add-subjects-catalog.sql):
 *  Quelle für die Fächerauswahl im neuen Stundenplan-Baustein. Bewusst nicht
 *  mit der bestehenden Hausübungs-Fächerliste (lib/subjects.ts) verknüpft —
 *  separater, enger Scope. */
export async function createSubject(input: SubjectInput): Promise<void> {
  await requireAdmin()
  if (!input.label.trim() || !input.short.trim()) throw new Error('Name und Kürzel sind Pflicht')

  const supabase = await createClient()
  const { data: existing } = await supabase.from('subjects' as never).select('sort_order').order('sort_order', { ascending: false }).limit(1) as unknown as { data: { sort_order: number }[] | null }
  const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1

  const { error } = await (supabase.from('subjects' as never).insert({
    label: input.label.trim(),
    short: input.short.trim(),
    color: input.color,
    sort_order: nextOrder,
  } as never) as unknown as Promise<{ error: { message: string } | null }>)
  if (error) throw new Error(error.message)

  revalidatePath('/admin/faecher')
  revalidatePath('/stundenplan')
}

export async function updateSubject(id: string, input: SubjectInput): Promise<void> {
  await requireAdmin()
  if (!input.label.trim() || !input.short.trim()) throw new Error('Name und Kürzel sind Pflicht')

  const supabase = await createClient()
  const { error } = await (supabase.from('subjects' as never)
    .update({ label: input.label.trim(), short: input.short.trim(), color: input.color } as never)
    .eq('id', id) as unknown as Promise<{ error: { message: string } | null }>)
  if (error) throw new Error(error.message)

  revalidatePath('/admin/faecher')
  revalidatePath('/stundenplan')
}

export async function deleteSubject(id: string): Promise<void> {
  await requireAdmin()
  const supabase = await createClient()
  const { error } = await (supabase.from('subjects' as never).delete().eq('id', id) as unknown as Promise<{ error: { message: string } | null }>)
  if (error) throw new Error(error.message)

  revalidatePath('/admin/faecher')
  revalidatePath('/stundenplan')
}
