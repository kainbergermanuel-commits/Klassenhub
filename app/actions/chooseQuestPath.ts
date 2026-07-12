'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getAuth } from '@/lib/auth'
import { findQuestTemplate } from '@/lib/questVault'

/** Wählt einen Wahlpfad für eine aktive Wahlpfad-Quest der aktuellen Woche.
 *  Bewusst über (class_id, template_key, week_start) statt einer quests.id
 *  identifiziert — automatisch gewählte Quests (der Normalfall) erzeugen
 *  keine Zeile in `quests`, siehe lib/quests.ts / fix-quest-choices-key.sql. */
export async function chooseQuestPath(weekStart: string, templateKey: string, choiceKey: string): Promise<void> {
  const { user, profile } = await getAuth()
  if (!user || !profile || profile.role !== 'student') throw new Error('Unauthorized')
  if (!profile.class_id) throw new Error('Keine Klasse')

  const template = findQuestTemplate(templateKey)
  const choice = template?.choices?.find(c => c.key === choiceKey)
  if (!choice) throw new Error('Ungültiger Wahlpfad')

  const supabase = await createClient()
  const { error } = await supabase.from('quest_choices').upsert({
    class_id: profile.class_id,
    template_key: templateKey,
    week_start: weekStart,
    student_id: profile.id,
    choice_key: choiceKey,
  } as never)
  if (error) throw new Error(error.message)

  revalidatePath('/')
  revalidatePath('/streaks')
}
