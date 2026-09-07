import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveAuth } from '@/lib/previewAuth'
import { todayISO, lastDayOfMonthISO } from '@/lib/date'
import { countClassGoalDone, suggestGoalTarget } from '@/lib/classGoal'
import ReiseOverview from '@/components/streaks/ReiseOverview'
import AnimateIn from '@/components/ui/AnimateIn'
import { adventureUnlocked } from '@/lib/adventureStart'
import AdventureTeaser from '@/components/streaks/AdventureTeaser'

/** "Die Reise": alle Kapitel der aktuellen Klassenreise durchblätterbar,
 *  nicht nur die aktuelle Etappe wie in der kompakten SeasonJourney-Leiste
 *  auf /streaks. Cluster A aus dem Prinzipien-Refresh — Kompetenzerleben
 *  durch Rückschau, keine neue Mechanik, rein lesend. */
export default async function ReisePage() {
  const { user, profile, activeClassId } = await getEffectiveAuth()
  if (!user) redirect('/login')
  if (!activeClassId) redirect('/')

  // Gleiche Sperre wie auf /streaks (siehe lib/adventureStart.ts).
  if (!adventureUnlocked()) {
    return (
      <AnimateIn delay={0}>
        <AdventureTeaser />
      </AnimateIn>
    )
  }

  const supabase = await createClient()
  const today = todayISO()
  // Eine Season = ein Kalendermonat (identisch zu streaks/page.tsx & lib/classGoal.ts).
  const monthEnd = lastDayOfMonthISO()
  const currentSeason = today.slice(0, 7)

  const [{ data: classGoal }, { data: allHw }, { data: studentRows }] = await Promise.all([
    supabase.from('class_goals').select('target,reward').eq('class_id', activeClassId).eq('season', currentSeason).maybeSingle(),
    supabase.from('homework').select('id,due_date,excluded_student_ids').eq('class_id', activeClassId).eq('status', 'published').lte('due_date', monthEnd).order('due_date', { ascending: false }),
    // Die IDs, nicht nur die Anzahl: das Vorschlagsziel zählt je Hausübung,
    // für wie viele Kinder sie gilt (Ausnahmen, siehe lib/homeworkScope.ts).
    // Dieselbe Abfrage, nur ohne head — bei einer Schulklasse sind das ein
    // paar Dutzend UUIDs.
    supabase.from('profiles').select('id').eq('class_id', activeClassId).eq('role', 'student'),
  ])

  const hwIds = (allHw ?? []).map(h => h.id)
  const { data: completions } = hwIds.length > 0
    ? await supabase.from('homework_completions').select('homework_id,confirmed_by_parent_at').in('homework_id', hwIds)
    : { data: [] }

  const done = countClassGoalDone(allHw ?? [], completions ?? [])
  // Ohne gesetztes Ziel greift derselbe Vorschlag wie auf /streaks — sonst
  // stünden hier ALLE Etappen auf „gesperrt" und die Reise wäre leer.
  const effectiveTarget = classGoal?.target ?? suggestGoalTarget(allHw ?? [], (studentRows ?? []).map(r => r.id), currentSeason)
  const pct = effectiveTarget ? Math.min(100, Math.round((done / effectiveTarget) * 100)) : 0

  return (
    <AnimateIn delay={0}>
      <ReiseOverview season={currentSeason} pct={pct} target={effectiveTarget} role={profile.role} isAdmin={!!profile.is_admin} />
    </AnimateIn>
  )
}
