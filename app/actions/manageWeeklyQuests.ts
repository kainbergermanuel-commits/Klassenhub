'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveAuth } from '@/lib/previewAuth'
import { defaultWeeklyTemplateKeys } from '@/lib/quests'
import { findQuestTemplate } from '@/lib/questVault'

/** Tauscht eine aktive Wochen-Quest gegen eine andere. Beim ersten Tausch
 *  wird der komplette (bis dahin implizite) Standard-Satz explizit in
 *  `quests` persistiert — sonst würde resolveWeeklyTemplateKeys() beim
 *  nächsten Laden nur die eine getauschte Quest sehen und die übrigen
 *  automatischen Picks verlieren (Override hat immer Vorrang vor Default,
 *  nicht nur teilweise).
 *
 *  getEffectiveAuth() statt getAuth(): Lehrpersonen können mehrere Klassen
 *  haben (teacher_classes) und zwischen ihnen wechseln — profile.class_id
 *  wäre nur die primäre Klasse, activeClassId berücksichtigt den
 *  Klassen-Umschalter-Cookie und trifft immer die gerade angezeigte Klasse. */
export async function swapWeeklyQuest(weekStart: string, oldKey: string, newKey: string): Promise<void> {
  const { profile, activeClassId } = await getEffectiveAuth()
  if (!profile || profile.role !== 'teacher' || !activeClassId) throw new Error('Unauthorized')
  if (!findQuestTemplate(newKey)) throw new Error('Unbekannte Quest-Vorlage')

  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('quests').select('template_key').eq('class_id', activeClassId).eq('week_start', weekStart)
  const currentKeys = (existing ?? []).map(q => q.template_key)
  const baseKeys = currentKeys.length > 0 ? currentKeys : defaultWeeklyTemplateKeys(activeClassId, weekStart)
  const nextKeys = baseKeys.map(k => (k === oldKey ? newKey : k))

  await supabase.from('quests').delete().eq('class_id', activeClassId).eq('week_start', weekStart)
  if (nextKeys.length > 0) {
    const { error } = await supabase.from('quests').insert(
      nextKeys.map(k => ({ class_id: activeClassId, template_key: k, week_start: weekStart, created_by: profile.id })) as never
    )
    if (error) throw new Error(error.message)
  }

  revalidatePath('/')
  revalidatePath('/streaks')
}

/** Löscht die Lehrer-Auswahl für die Woche wieder — zurück zur
 *  automatischen (deterministischen) Standardauswahl. */
export async function resetWeeklyQuests(weekStart: string): Promise<void> {
  const { profile, activeClassId } = await getEffectiveAuth()
  if (!profile || profile.role !== 'teacher' || !activeClassId) throw new Error('Unauthorized')

  const supabase = await createClient()
  const { error } = await supabase.from('quests').delete().eq('class_id', activeClassId).eq('week_start', weekStart)
  if (error) throw new Error(error.message)

  revalidatePath('/')
  revalidatePath('/streaks')
}
