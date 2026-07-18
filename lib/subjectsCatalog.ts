import type { createClient as createServerClient } from '@/lib/supabase/server'

export interface SubjectOption {
  label: string
  short: string
  color: string
}

/** Lädt den Admin-verwalteten Fächer-Katalog (siehe supabase/add-subjects-
 *  catalog.sql, CRUD unter /admin/faecher) — die EINE Quelle für jede
 *  Fächer-Auswahl in der App (Hausübungen anlegen, Planung, Stundenplan,
 *  "Meine Fächer"). Ersetzt die früher mehrfach duplizierten hartkodierten
 *  Listen (lib/subjects.ts + eine identische Kopie in AddHomeworkModal.tsx).
 *
 *  Bewusst als einzelner, günstiger Query (13 Zeilen, kein Filter) statt
 *  gecacht — läuft in jeder aufrufenden Seite ohnehin parallel zu mehreren
 *  anderen Queries im selben Promise.all-Batch, kostet also keine zusätzliche
 *  wahrgenommene Ladezeit. */
export async function loadSubjectsCatalog(
  supabase: Awaited<ReturnType<typeof createServerClient>>
): Promise<SubjectOption[]> {
  const { data } = await (supabase
    .from('subjects' as never)
    .select('label,short,color')
    .order('sort_order') as unknown as Promise<{ data: SubjectOption[] | null }>)
  return data ?? []
}
