'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveAuth } from '@/lib/previewAuth'
import { RUCKSACK_LORE, type RucksackItemKey } from '@/lib/rucksack'

/** Hakt die Erwerbs-Momente ab, die eine Schüler:in gerade weggeklickt hat
 *  (siehe components/streaks/NewItemAnnounce). Fehlertolerant beim Upsert:
 *  scheitert z.B. in der Lehrer-Vorschau-als-Schüler-Funktion an der RLS
 *  (auth.uid() ist dort der Lehrer, nicht das vorgeschaute Profil) — der
 *  Dialog soll deswegen nicht in einen Fehlerzustand kippen, es geht um reine
 *  UI-Buchhaltung. */
export async function markRucksackItemsSeen(keys: string[]): Promise<void> {
  const { user, profile } = await getEffectiveAuth()
  if (!user?.id || !profile || profile.role !== 'student') return

  // Nur bekannte Schlüssel durchlassen — die Liste lebt bewusst im Code, die
  // Spalte ist ein freies text-Feld ohne DB-seitige Prüfung.
  const valid = keys.filter((k): k is RucksackItemKey => k in RUCKSACK_LORE)
  if (valid.length === 0) return

  const supabase = await createClient()
  await supabase.from('rucksack_item_seen').upsert(
    valid.map(item_key => ({ student_id: profile.id, item_key })) as never,
    { onConflict: 'student_id,item_key', ignoreDuplicates: true },
  )

  revalidatePath('/')
  revalidatePath('/streaks')
}
