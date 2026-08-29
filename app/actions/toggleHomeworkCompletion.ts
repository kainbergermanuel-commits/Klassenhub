'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getAuth } from '@/lib/auth'
import { VETERAN_MILESTONE } from '@/lib/streak'

/** Prüft, ob ein Schüler den Veteran-Meilenstein je erreicht hat. */
export async function isHomeworkVeteran(studentId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('streak_confirmations')
    .select('milestone')
    .eq('student_id', studentId)
    .gte('milestone', VETERAN_MILESTONE)
    .limit(1)
    .maybeSingle()
  return !!data
}

/** Markiert eine HÜ als erledigt/offen für den eingeloggten Schüler.
 *  Veteranen (≥15 HÜ in Folge je erreicht) werden dabei automatisch
 *  mitbestätigt statt auf die Eltern-Bestätigung zu warten.
 *
 *  Gibt zurück, ob die Erledigung sofort mitbestätigt wurde. Die Karte zeigt
 *  sonst kurz „Wartet auf Bestätigung" an, bis der Refresh durch ist —
 *  ausgerechnet bei den Kindern, die sich das Gegenteil verdient haben. */
export async function toggleHomeworkCompletion(homeworkId: string, done: boolean): Promise<{ autoConfirmed: boolean }> {
  const { profile } = await getAuth()
  if (!profile || profile.role !== 'student') throw new Error('Unauthorized')

  const supabase = await createClient()

  if (!done) {
    const { error } = await supabase
      .from('homework_completions')
      .delete()
      .match({ homework_id: homeworkId, student_id: profile.id })
    if (error) throw new Error(error.message)
    revalidatePath('/')
    revalidatePath('/hausaufgaben')
    return { autoConfirmed: false }
  }

  const veteran = await isHomeworkVeteran(profile.id)

  // ignoreDuplicates ist hier PFLICHT, nicht Geschmackssache: der Standard-
  // Upsert erzeugt `ON CONFLICT DO UPDATE` und braucht damit UPDATE-Rechte auf
  // homework_completions. Genau die haben Schüler:innen seit
  // supabase/fix-completions-no-self-confirm.sql nicht mehr, damit sie
  // confirmed_by_parent_at nicht selbst setzen können. Mit ignoreDuplicates
  // wird daraus `ON CONFLICT DO NOTHING` — INSERT genügt, und existiert die
  // Zeile schon, ist ohnehin nichts zu tun.
  const { error } = await supabase
    .from('homework_completions')
    .upsert({ homework_id: homeworkId, student_id: profile.id } as never, { ignoreDuplicates: true })
  if (error) throw new Error(error.message)

  // Auto-Bestätigung für Veteranen braucht erhöhte Rechte (RLS verbietet
  // Schülern explizit, confirmed_by_parent_at selbst zu setzen).
  if (veteran) {
    const admin = createServiceClient()
    const { error: confirmError } = await admin
      .from('homework_completions')
      .update({ confirmed_by_parent_at: new Date().toISOString() } as never)
      .match({ homework_id: homeworkId, student_id: profile.id })
    if (confirmError) throw new Error(confirmError.message)
  }

  revalidatePath('/')
  revalidatePath('/hausaufgaben')
  return { autoConfirmed: veteran }
}
