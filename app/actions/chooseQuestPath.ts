'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveAuth } from '@/lib/previewAuth'
import { findQuestTemplate } from '@/lib/questVault'

/** Wählt einen Wahlpfad für eine aktive Wahlpfad-Quest der aktuellen Woche.
 *  Bewusst über (class_id, template_key, week_start) statt einer quests.id
 *  identifiziert — automatisch gewählte Quests (der Normalfall) erzeugen
 *  keine Zeile in `quests`, siehe lib/quests.ts / fix-quest-choices-key.sql.
 *
 *  getEffectiveAuth() statt getAuth(): berücksichtigt die "Vorschau als
 *  Schüler:in"-Funktion für Lehrpersonen — mit getAuth() bekäme man immer
 *  das echte (Lehrer-)Profil und die Aktion würde in der Vorschau immer mit
 *  "Unauthorized" fehlschlagen. */
export async function chooseQuestPath(weekStart: string, templateKey: string, choiceKey: string): Promise<void> {
  const { user, profile, activeClassId, isPreview } = await getEffectiveAuth()
  if (!user || !profile || profile.role !== 'student') throw new Error('Unauthorized')
  if (!activeClassId) throw new Error('Keine Klasse')

  const template = findQuestTemplate(templateKey)
  const choice = template?.choices?.find(c => c.key === choiceKey)
  if (!choice) throw new Error('Ungültiger Wahlpfad')

  const supabase = await createClient()
  const { error } = await supabase.from('quest_choices').upsert({
    class_id: activeClassId,
    template_key: templateKey,
    week_start: weekStart,
    student_id: profile.id,
    choice_key: choiceKey,
  } as never)
  // Gleiche Ausnahme wie in solveQuestRiddle: in der Lehrer-Vorschau schlägt
  // der Schreibvorgang an der RLS fehl, das darf den Testlauf nicht abbrechen.
  if (error && !isPreview) throw new Error(error.message)

  revalidatePath('/')
  revalidatePath('/streaks')
}
