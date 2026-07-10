import { createClient } from '@/lib/supabase/server'
import { todayISO, firstDayOfMonthISO, lastDayOfMonthISO } from '@/lib/date'

export interface ClassGoalProgress {
  goal: { target: number; reward: string | null } | null
  done: number
  season: string
}

/**
 * Lädt Klassenziel + bestätigten Season-Fortschritt für eine Klasse.
 * Gemeinsame Quelle für Streaks-Seite und Startseite, damit beide immer
 * dieselbe Zahl zeigen.
 * ⚠️ TEST-HACK: monthEnd bis Ende des NÄCHSTEN Monats verlängert (wie in
 * streaks/page.tsx) — beide Stellen vor Go-Live gemeinsam zurücksetzen.
 */
export async function getClassGoalProgress(
  supabase: Awaited<ReturnType<typeof createClient>>,
  classId: string,
): Promise<ClassGoalProgress> {
  const today = todayISO()
  const season = today.slice(0, 7)
  const seasonStart = firstDayOfMonthISO()
  const monthEnd = lastDayOfMonthISO(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1))

  const [{ data: goalRow }, { data: seasonHw }] = await Promise.all([
    supabase.from('class_goals').select('target,reward').eq('class_id', classId).eq('season', season).maybeSingle(),
    supabase.from('homework').select('id').eq('class_id', classId).gte('due_date', seasonStart).lte('due_date', monthEnd),
  ])

  const seasonHwIds = (seasonHw ?? []).map(h => h.id)
  let done = 0
  if (seasonHwIds.length > 0) {
    const { data: completions } = await supabase
      .from('homework_completions')
      .select('confirmed_by_parent_at')
      .in('homework_id', seasonHwIds)
      .not('confirmed_by_parent_at', 'is', null)
    done = completions?.length ?? 0
  }

  return {
    goal: goalRow ? { target: goalRow.target, reward: goalRow.reward } : null,
    done,
    season,
  }
}
