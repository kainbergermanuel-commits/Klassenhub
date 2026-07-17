import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveAuth } from '@/lib/previewAuth'
import { todayISO, lastDayOfMonthISO } from '@/lib/date'
import { countClassGoalDone } from '@/lib/classGoal'
import ReiseOverview from '@/components/streaks/ReiseOverview'

/** "Die Reise": alle Kapitel der aktuellen Klassenreise durchblätterbar,
 *  nicht nur die aktuelle Etappe wie in der kompakten SeasonJourney-Leiste
 *  auf /streaks. Cluster A aus dem Prinzipien-Refresh — Kompetenzerleben
 *  durch Rückschau, keine neue Mechanik, rein lesend. */
export default async function ReisePage() {
  const { user, profile, activeClassId } = await getEffectiveAuth()
  if (!user) redirect('/login')
  if (!activeClassId) redirect('/')

  const supabase = await createClient()
  const today = todayISO()
  // ⚠️ TEST-HACK: identisch zu streaks/page.tsx & lib/classGoal.ts.
  const monthEnd = lastDayOfMonthISO(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1))
  const currentSeason = today.slice(0, 7)

  const [{ data: classGoal }, { data: allHw }] = await Promise.all([
    supabase.from('class_goals').select('target,reward').eq('class_id', activeClassId).eq('season', currentSeason).maybeSingle(),
    supabase.from('homework').select('id,due_date').eq('class_id', activeClassId).lte('due_date', monthEnd).order('due_date', { ascending: false }),
  ])

  const hwIds = (allHw ?? []).map(h => h.id)
  const { data: completions } = hwIds.length > 0
    ? await supabase.from('homework_completions').select('homework_id,confirmed_by_parent_at').in('homework_id', hwIds)
    : { data: [] }

  const done = countClassGoalDone(allHw ?? [], completions ?? [])
  const pct = classGoal ? Math.min(100, Math.round((done / classGoal.target) * 100)) : 0

  return <ReiseOverview season={currentSeason} pct={pct} target={classGoal?.target ?? null} role={profile.role} isAdmin={!!profile.is_admin} />
}
