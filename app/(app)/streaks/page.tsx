import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveAuth } from '@/lib/previewAuth'
import { todayISO, lastDayOfMonthISO, lastDayOfPrevMonthISO, firstDayOfPrevMonthISO, firstDayOfMonthISO, daysUntil, getRelevantMondayOfWeek, addDaysISO } from '@/lib/date'
import { computeStreak, currentMilestone, findBreakingHomework } from '@/lib/streak'
import { resolveWeeklyTemplateKeys, computeQuestProgress, type QuestContext, type QuestResult } from '@/lib/quests'
import { findQuestTemplate } from '@/lib/questVault'
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
    ? await supabase.from('homework_completions').select('homework_id,student_id,confirmed_by_parent_at,completed_at').in('homework_id', allHwIds)
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

  // ─── QUESTS (nur für eingeloggten Schüler, siehe lib/quests.ts) ──────────────
  const weekStart = getRelevantMondayOfWeek()
  let questsForMe: QuestResult[] = []
  if (profile.role === 'student') {
    const weekEnd = addDaysISO(6, new Date(`${weekStart}T00:00:00`))

    const [
      { data: weekReminders },
      { data: weekEvents },
      { data: weekDuty },
      { data: questOverrides },
      { data: myChoices },
    ] = await Promise.all([
      supabase.from('reminders').select('id,event_date,target_student_ids').eq('class_id', activeClassId).gte('event_date', weekStart).lte('event_date', weekEnd),
      supabase.from('events').select('id,start_date,target_student_ids').eq('class_id', activeClassId).gte('start_date', weekStart).lte('start_date', weekEnd),
      supabase.from('duties').select('assignee_ids').eq('class_id', activeClassId).eq('week_start', weekStart),
      supabase.from('quests').select('template_key').eq('class_id', activeClassId).eq('week_start', weekStart),
      supabase.from('quest_choices').select('template_key,choice_key').eq('student_id', profile.id).eq('week_start', weekStart),
    ])

    const weekReminderIds = (weekReminders ?? [])
      .filter(r => !r.target_student_ids || r.target_student_ids.includes(profile.id))
      .map(r => r.id)
    const { data: myViews } = weekReminderIds.length > 0
      ? await supabase.from('reminder_views').select('reminder_id').eq('student_id', profile.id).in('reminder_id', weekReminderIds)
      : { data: [] }
    const weekEventIds = (weekEvents ?? [])
      .filter(e => !e.target_student_ids || e.target_student_ids.includes(profile.id))
      .map(e => e.id)
    const dutyAssignedThisWeek = (weekDuty ?? []).some(d => d.assignee_ids.includes(profile.id))

    const weekHw = (allHwDesc ?? []).filter(h => h.due_date >= weekStart && h.due_date <= weekEnd)
    const dueByHwId = new Map((allHwDesc ?? []).map(h => [h.id, h.due_date]))
    const myDoneIds = doneByStudent.get(profile.id) ?? new Set<string>()
    const myConfirmedIds = confirmedDoneByStudent.get(profile.id) ?? new Set<string>()
    const myFrozenIds = frozenByStudent.get(profile.id) ?? new Set<string>()
    const streakHeldThisWeek = weekHw.every(h => myDoneIds.has(h.id) || myFrozenIds.has(h.id))
    const earlyHomeworkIds = new Set(
      (allCompletions ?? [])
        .filter(c => c.student_id === profile.id)
        .filter(c => {
          const due = dueByHwId.get(c.homework_id)
          return due && (c as any).completed_at && (c as any).completed_at.slice(0, 10) < due
        })
        .map(c => c.homework_id)
    )

    const activeQuestKeys = resolveWeeklyTemplateKeys(activeClassId, weekStart, (questOverrides ?? []).map(q => q.template_key))
    const choiceByTemplate = new Map((myChoices ?? []).map(c => [c.template_key, c.choice_key]))

    const questCtx: QuestContext = {
      weekStart,
      weekEnd,
      weekHomeworkIds: weekHw.map(h => h.id),
      doneHomeworkIds: myDoneIds,
      earlyHomeworkIds,
      confirmedHomeworkIds: myConfirmedIds,
      weekReminderIds,
      viewedReminderIds: new Set((myViews ?? []).map(v => v.reminder_id)),
      weekEventIds,
      dutyAssignedThisWeek,
      streakHeldThisWeek,
    }

    questsForMe = activeQuestKeys
      .map(key => findQuestTemplate(key))
      .filter((t): t is NonNullable<typeof t> => !!t)
      .map(t => computeQuestProgress(t, questCtx, choiceByTemplate.get(t.key)))
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
      quests={questsForMe}
      questWeekStart={weekStart}
    />
  )
}
