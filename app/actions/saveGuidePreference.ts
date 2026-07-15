'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveAuth } from '@/lib/previewAuth'
import { todayISO } from '@/lib/date'
import { getSeasonTheme, isArcUnlocked } from '@/lib/seasonTheme'

/** Speichert "Mein Guide" — persönliche Wahl fürs Heldenbuch. `icon` muss ein
 *  bereits freigeschalteter Theme-Icon-Key sein (serverseitig geprüft, dem
 *  Client wird hier nicht vertraut); `null` setzt zurück auf den Guide der
 *  aktuellen Klassenwelt. */
export async function saveGuidePreference(icon: string | null): Promise<void> {
  const { user, profile } = await getEffectiveAuth()
  if (!user?.id || !profile || profile.role !== 'student') throw new Error('Unauthorized')

  if (icon !== null) {
    const currentSeason = todayISO().slice(0, 7)
    const currentThemeName = getSeasonTheme(currentSeason).name
    if (!isArcUnlocked(icon, currentThemeName)) throw new Error('Guide noch nicht freigeschaltet')
  }

  const supabase = await createClient()
  const { error } = await supabase.from('profiles').update({ preferred_guide_icon: icon }).eq('id', profile.id)
  if (error) throw new Error(error.message)

  revalidatePath('/', 'layout')
}
