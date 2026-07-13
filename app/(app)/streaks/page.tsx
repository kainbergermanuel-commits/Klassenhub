import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveAuth } from '@/lib/previewAuth'
import { todayISO, lastDayOfMonthISO, firstDayOfMonthISO, getRelevantMondayOfWeek, addDaysISO } from '@/lib/date'
import { computeStreak, currentMilestone, findBreakingHomework } from '@/lib/streak'
import { resolveWeeklyTemplateKeys, computeQuestProgress, defaultWeeklyTemplateKeys, type QuestContext, type QuestResult } from '@/lib/quests'
import { findQuestTemplate, QUEST_VAULT } from '@/lib/questVault'
import { assignGuilds, findMyGuild, weeklyGuildQuestKey, findGuildQuestTemplate, computeGuildQuestProgress, type Guild, type GuildQuestResult, type GuildMember } from '@/lib/guilds'
import { buildDutyDone } from '@/lib/duty'
import { collectAchievements, countAchievements, type AchievementCounts } from '@/lib/achievements'
import StreakOverview from '@/components/streaks/StreakOverview'
import type { RegieQuest } from '@/components/streaks/TeacherQuestRegie'

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

  const currentSeason = today.slice(0, 7) // 'YYYY-MM', unabhängig vom Test-Hack

  const [
    { data: students },
    { data: allHwDesc },
    { data: classGoal },
  ] = await Promise.all([
    supabase.from('profiles').select('id,full_name,avatar_color,avatar_seed,avatar_hair_color,avatar_skin_color').eq('class_id', activeClassId).eq('role', 'student').order('full_name'),
    supabase.from('homework').select('id,due_date').eq('class_id', activeClassId).order('due_date', { ascending: false }),
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
  let myActualStreak = 0
  let myPendingMilestone: number | null = null
  if (profile.role === 'student') {
    const myOwnDoneIds = doneByStudent.get(profile.id) ?? new Set<string>()
    const myConfirmedIds = confirmedDoneByStudent.get(profile.id) ?? new Set<string>()
    const myFrozenIds = frozenByStudent.get(profile.id)
    myActualStreak = computeStreak(myOwnDoneIds, allHwDesc ?? [], today, myFrozenIds)
    const myDisplayStreak = computeStreak(myConfirmedIds, allHwDesc ?? [], today, myFrozenIds)
    const actualMs = currentMilestone(myActualStreak)
    myPendingMilestone = myActualStreak >= 5 && actualMs > currentMilestone(myDisplayStreak) ? actualMs : null
    const broken = findBreakingHomework(myConfirmedIds, allHwDesc ?? [], today, myFrozenIds) !== null
    const jokerUsedThisSeason = freezeUsedThisSeasonByStudent.has(profile.id)
    const jokerAvailable = broken && !jokerUsedThisSeason
    myStreak = { streak: myDisplayStreak, broken, jokerAvailable, jokerUsedThisSeason }
  }

  // ─── QUESTS (nur für eingeloggten Schüler, siehe lib/quests.ts) ──────────────
  const weekStart = getRelevantMondayOfWeek()
  let questsForMe: QuestResult[] = []
  let guildSection: { guild: Guild; members: GuildMember[]; quest: GuildQuestResult } | null = null
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
      supabase.from('duties').select('id,assignee_ids').eq('class_id', activeClassId).eq('week_start', weekStart),
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

    // ─── DIENST-SELBSTBESTÄTIGUNG (SDT: Kind kontrolliert sich selbst) ───────
    const weekDutyIds = (weekDuty ?? []).map(d => d.id)
    const { data: dutyCompletionsRaw } = weekDutyIds.length > 0
      ? await supabase.from('duty_completions').select('duty_id,student_id,weekday').in('duty_id', weekDutyIds)
      : { data: [] }
    const { keptUpStudents } = buildDutyDone(weekDuty ?? [], dutyCompletionsRaw ?? [])
    const dutyDoneThisWeek = keptUpStudents.has(profile.id)

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
      dutyDoneThisWeek,
      streakHeldThisWeek,
    }

    questsForMe = activeQuestKeys
      .map(key => findQuestTemplate(key))
      .filter((t): t is NonNullable<typeof t> => !!t)
      .map(t => computeQuestProgress(t, questCtx, choiceByTemplate.get(t.key)))

    // ─── GILDEN (Phase 3): kooperative Wochen-Quest in Kleingruppe ────────────
    const allStudentIds = (students ?? []).map(s => s.id)
    const guilds = assignGuilds(activeClassId, currentSeason, allStudentIds)
    const myGuild = findMyGuild(guilds, profile.id)
    if (myGuild) {
      const guildTemplate = findGuildQuestTemplate(weeklyGuildQuestKey(activeClassId, weekStart))
      if (guildTemplate) {
        const guildQuest = computeGuildQuestProgress(guildTemplate, myGuild, {
          weekHomeworkIds: weekHw.map(h => h.id),
          doneByStudent,
          confirmedByStudent: confirmedDoneByStudent,
          dutyDoneByStudent: keptUpStudents,
        })
        const members: GuildMember[] = (students ?? [])
          .filter(s => myGuild.memberIds.includes(s.id))
          .map(s => ({
            id: s.id,
            full_name: s.full_name,
            avatar_color: s.avatar_color ?? '#0F8A82',
            avatar_seed: s.avatar_seed ?? null,
            avatar_hair_color: s.avatar_hair_color ?? null,
            avatar_skin_color: s.avatar_skin_color ?? null,
          }))
        guildSection = { guild: myGuild, members, quest: guildQuest }
      }
    }

    // ─── ERFOLGE (Heldenbuch-Statistik) ────────────────────────────────────────
    // Gleiche Protokollierung wie auf der Startseite — ein Schüler könnte auch
    // direkt hier eine Quest abschließen, ohne vorher die Startseite zu laden.
    const classGoalReached = !!classGoal && classGoalConfirmedDone >= classGoal.target
    const newAchievements = collectAchievements({
      studentId: profile.id,
      weekStart,
      season: currentSeason,
      quests: questsForMe,
      guildQuest: guildSection?.quest ?? null,
      classGoalReached,
    })
    if (newAchievements.length > 0) {
      await supabase.from('achievements').upsert(newAchievements as never, { onConflict: 'student_id,kind,key,period', ignoreDuplicates: true })
    }
  }

  // ─── HELDENBUCH (eigene Meilensteine + Erfolge, keine Klasse-Ansicht) ────────
  let myHeldenbuch: {
    streak: number
    confirmedStreak: number
    broken: boolean
    jokerAvailable: boolean
    jokerUsedThisSeason: boolean
    pendingMilestone: number | null
    milestones: { milestone: number; confirmed_at: string }[]
    achievementCounts: AchievementCounts
  } | null = null
  if (profile.role === 'student' && myStreak) {
    const [{ data: myMilestones }, { data: myAchievements }] = await Promise.all([
      supabase.from('streak_confirmations').select('milestone,confirmed_at').eq('student_id', profile.id).order('confirmed_at', { ascending: false }),
      supabase.from('achievements').select('kind').eq('student_id', profile.id),
    ])
    myHeldenbuch = {
      streak: myActualStreak,
      confirmedStreak: myStreak.streak,
      broken: myStreak.broken,
      jokerAvailable: myStreak.jokerAvailable,
      jokerUsedThisSeason: myStreak.jokerUsedThisSeason,
      pendingMilestone: myPendingMilestone,
      milestones: myMilestones ?? [],
      achievementCounts: countAchievements(myAchievements ?? []),
    }
  }

  // ─── SPIELLEITER-REGIE (nur Lehrer): Wochen-Quests sehen & tauschen ──────────
  let teacherRegie: { activeQuests: RegieQuest[]; allTemplates: { key: string; title: string }[]; isOverride: boolean } | null = null
  if (profile.role === 'teacher') {
    const { data: questOverridesT } = await supabase
      .from('quests').select('template_key').eq('class_id', activeClassId).eq('week_start', weekStart)
    const overrideKeysT = (questOverridesT ?? []).map(q => q.template_key)
    const isOverride = overrideKeysT.length > 0
    const activeKeysT = isOverride ? overrideKeysT : defaultWeeklyTemplateKeys(activeClassId, weekStart)

    teacherRegie = {
      activeQuests: activeKeysT
        .map(key => findQuestTemplate(key))
        .filter((t): t is NonNullable<typeof t> => !!t)
        .map(t => ({ key: t.key, title: t.title, narrative: t.narrative, focusTag: t.focusTag })),
      allTemplates: QUEST_VAULT.map(t => ({ key: t.key, title: t.title })),
      isOverride,
    }
  }

  const withStreak = studentData.filter(s => s.streak > 0)
  const noStreak = studentData.filter(s => s.streak === 0)

  return (
    <StreakOverview
      role={profile.role}
      withStreak={withStreak}
      noStreak={noStreak}
      classGoal={classGoal ? { target: classGoal.target, reward: classGoal.reward } : null}
      classGoalDone={classGoalConfirmedDone}
      currentSeason={currentSeason}
      myHeldenbuch={myHeldenbuch}
      quests={questsForMe}
      questWeekStart={weekStart}
      teacherRegie={teacherRegie}
      guildSection={guildSection}
    />
  )
}
