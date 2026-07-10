import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveAuth } from '@/lib/previewAuth'
import { todayISO, lastDayOfMonthISO, lastDayOfPrevMonthISO, firstDayOfPrevMonthISO, firstDayOfMonthISO, daysUntil } from '@/lib/date'
import { computeStreak, currentMilestone, findBreakingHomework } from '@/lib/streak'
import StreakOverview from '@/components/streaks/StreakOverview'

export default async function StreaksPage() {
  const { user, profile, activeClassId } = await getEffectiveAuth()
  if (!user) redirect('/login')
  if (!activeClassId) redirect('/')

  const supabase = await createClient()
  const today = todayISO()
  // ⚠️ TEST-HACK: Season bis Ende des NÄCHSTEN Monats verlängert, damit Testdaten
  // länger erhalten bleiben. TODO(live): vor Go-Live wieder auf lastDayOfMonthISO()
  // (= aktueller Monat) zurücksetzen.
  const monthEnd = lastDayOfMonthISO(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1))
  const prevMonthEnd = lastDayOfPrevMonthISO()
  const prevMonthStart = firstDayOfPrevMonthISO()
  const daysLeft = daysUntil(monthEnd) + 1 // +1: endet zu Mitternacht des letzten Tags

  const currentSeason = today.slice(0, 7) // 'YYYY-MM', unabhängig vom Test-Hack

  const [
    { data: students },
    { data: allHwDesc },
    { data: confirmations },
    { data: classGoal },
  ] = await Promise.all([
    supabase.from('profiles').select('id,full_name,avatar_color,avatar_seed,avatar_hair_color,avatar_skin_color').eq('class_id', activeClassId).eq('role', 'student').order('full_name'),
    supabase.from('homework').select('id,due_date').eq('class_id', activeClassId).order('due_date', { ascending: false }),
    supabase.from('streak_confirmations').select('student_id,milestone,confirmed_by,confirmed_at').in(
      'student_id',
      (await supabase.from('profiles').select('id').eq('class_id', activeClassId).eq('role', 'student')).data?.map(s => s.id) ?? []
    ),
    supabase.from('class_goals').select('target,reward').eq('class_id', activeClassId).eq('season', currentSeason).maybeSingle(),
  ])

  const studentIds = (students ?? []).map(s => s.id)
  const { data: allFreezes } = studentIds.length > 0
    ? await supabase.from('streak_freezes').select('student_id,homework_id,created_at').in('student_id', studentIds)
    : { data: [] }

  const frozenByStudent = new Map<string, Set<string>>()
  const freezeUsedThisSeasonByStudent = new Set<string>()
  for (const f of allFreezes ?? []) {
    if (!frozenByStudent.has(f.student_id)) frozenByStudent.set(f.student_id, new Set())
    frozenByStudent.get(f.student_id)!.add(f.homework_id)
    if (f.created_at.slice(0, 7) === currentSeason) freezeUsedThisSeasonByStudent.add(f.student_id)
  }

  const allHwIds = (allHwDesc ?? []).map(h => h.id)
  const { data: allCompletions } = allHwIds.length > 0
    ? await supabase.from('homework_completions').select('homework_id,student_id,confirmed_by_parent_at').in('homework_id', allHwIds)
    : { data: [] }

  // Build doneIds per student (alle für eigenen Streak) + nur bestätigte für Leaderboard
  const doneByStudent = new Map<string, Set<string>>()
  const confirmedDoneByStudent = new Map<string, Set<string>>()
  for (const c of allCompletions ?? []) {
    if (!doneByStudent.has(c.student_id)) doneByStudent.set(c.student_id, new Set())
    doneByStudent.get(c.student_id)!.add(c.homework_id)
    if ((c as any).confirmed_by_parent_at) {
      if (!confirmedDoneByStudent.has(c.student_id)) confirmedDoneByStudent.set(c.student_id, new Set())
      confirmedDoneByStudent.get(c.student_id)!.add(c.homework_id)
    }
  }

  // ─── KLASSENZIEL (aktueller Monat, nur eltern-bestätigte Erledigungen) ───────
  const seasonStart = firstDayOfMonthISO()
  const seasonHwIds = new Set((allHwDesc ?? []).filter(h => h.due_date >= seasonStart && h.due_date <= monthEnd).map(h => h.id))
  const classGoalConfirmedDone = (allCompletions ?? []).filter(
    c => seasonHwIds.has(c.homework_id) && (c as any).confirmed_by_parent_at
  ).length

  // Build per-student data
  const studentData = (students ?? []).map(s => {
    const doneIds = doneByStudent.get(s.id) ?? new Set<string>()
    const confirmedIds = confirmedDoneByStudent.get(s.id) ?? new Set<string>()
    const frozenIds = frozenByStudent.get(s.id)
    const actualStreak = computeStreak(doneIds, allHwDesc ?? [], today, frozenIds)
    const displayStreak = computeStreak(confirmedIds, allHwDesc ?? [], today, frozenIds)

    // Pending: erreichter (actual) Meilenstein liegt über dem eltern-bestätigten
    const actualMilestone = currentMilestone(actualStreak)
    const pendingMilestone = actualStreak >= 5 && actualMilestone > currentMilestone(displayStreak) ? actualMilestone : null

    return {
      id: s.id,
      full_name: s.full_name,
      avatar_color: s.avatar_color ?? '#0F8A82',
      avatar_seed: s.avatar_seed ?? null,
      avatar_hair_color: s.avatar_hair_color ?? null,
      avatar_skin_color: s.avatar_skin_color ?? null,
      streak: displayStreak,
      pendingMilestone,
    }
  })

  // ─── DEIN STREAK (nur für eingeloggten Schüler) ──────────────────────────────
  let myStreak: { streak: number; broken: boolean; jokerAvailable: boolean; jokerUsedThisSeason: boolean } | null = null
  if (profile.role === 'student') {
    const myConfirmedIds = confirmedDoneByStudent.get(profile.id) ?? new Set<string>()
    const myFrozenIds = frozenByStudent.get(profile.id)
    const myDisplayStreak = computeStreak(myConfirmedIds, allHwDesc ?? [], today, myFrozenIds)
    const broken = findBreakingHomework(myConfirmedIds, allHwDesc ?? [], today, myFrozenIds) !== null
    const jokerUsedThisSeason = freezeUsedThisSeasonByStudent.has(profile.id)
    const jokerAvailable = broken && !jokerUsedThisSeason
    myStreak = { streak: myDisplayStreak, broken, jokerAvailable, jokerUsedThisSeason }
  }

  // ─── VORMONAT-RANGLISTE ──────────────────────────────────────────────────────
  const prevMonthHw = (allHwDesc ?? []).filter(h => h.due_date >= prevMonthStart && h.due_date <= prevMonthEnd)
  const prevMonthHwIds = prevMonthHw.map(h => h.id)
  let prevRace: Array<{ id: string; full_name: string; avatar_color: string; avatar_seed: string | null; avatar_hair_color: string | null; avatar_skin_color: string | null; streak: number }> = []
  if (prevMonthHwIds.length > 0) {
    const { data: prevCompletions } = await supabase
      .from('homework_completions').select('homework_id,student_id').in('homework_id', prevMonthHwIds)
    const doneByStudentPrev = new Map<string, Set<string>>()
    for (const c of prevCompletions ?? []) {
      if (!doneByStudentPrev.has(c.student_id)) doneByStudentPrev.set(c.student_id, new Set())
      doneByStudentPrev.get(c.student_id)!.add(c.homework_id)
    }
    prevRace = (students ?? [])
      .map(s => ({
        id: s.id,
        full_name: s.full_name,
        avatar_color: s.avatar_color ?? '#0F8A82',
        avatar_seed: s.avatar_seed ?? null,
        avatar_hair_color: s.avatar_hair_color ?? null,
        avatar_skin_color: s.avatar_skin_color ?? null,
        streak: computeStreak(doneByStudentPrev.get(s.id) ?? new Set(), prevMonthHw, prevMonthEnd),
      }))
      .filter(s => s.streak > 0)
      .sort((a, b) => b.streak - a.streak)
  }

  // Sort: by streak desc
  const withStreak = studentData
    .filter(s => s.streak > 0)
    .sort((a, b) => b.streak - a.streak)
  const noStreak = studentData.filter(s => s.streak === 0)

  // Group confirmed milestones by month (for history section)
  const milestoneHistory: Record<string, Array<{ studentName: string; milestone: number; confirmed_at: string }>> = {}
  for (const c of confirmations ?? []) {
    const student = (students ?? []).find(s => s.id === c.student_id)
    if (!student) continue
    const month = c.confirmed_at.slice(0, 7) // "2026-06"
    if (!milestoneHistory[month]) milestoneHistory[month] = []
    milestoneHistory[month].push({
      studentName: student.full_name,
      milestone: c.milestone,
      confirmed_at: c.confirmed_at,
    })
  }

  return (
    <StreakOverview
      role={profile.role}
      withStreak={withStreak}
      noStreak={noStreak}
      milestoneHistory={milestoneHistory}
      daysLeft={daysLeft}
      prevRace={prevRace}
      prevMonthLabel={prevMonthEnd.slice(0, 7)}
      classGoal={classGoal ? { target: classGoal.target, reward: classGoal.reward } : null}
      classGoalDone={classGoalConfirmedDone}
      currentSeason={currentSeason}
      myStreak={myStreak}
    />
  )
}
