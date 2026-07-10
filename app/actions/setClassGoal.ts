'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveAuth } from '@/lib/previewAuth'

/** Setzt/aktualisiert das Klassenziel der laufenden Season (Lehrer only). */
export async function setClassGoal(season: string, target: number, reward: string | null): Promise<void> {
  const { profile, activeClassId } = await getEffectiveAuth()
  if (!profile || profile.role !== 'teacher') throw new Error('Unauthorized')
  if (!activeClassId) throw new Error('Keine aktive Klasse')
  if (!Number.isInteger(target) || target <= 0) throw new Error('Ungültiger Zielwert')

  const supabase = await createClient()
  const { error } = await supabase.from('class_goals').upsert(
    {
      class_id: activeClassId,
      season,
      target,
      reward: reward?.trim() || null,
      updated_by: profile.id,
      updated_at: new Date().toISOString(),
    } as never,
    { onConflict: 'class_id,season' },
  )
  if (error) throw new Error(error.message)

  revalidatePath('/streaks')
}
