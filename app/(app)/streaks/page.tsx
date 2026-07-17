import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveAuth } from '@/lib/previewAuth'
import { todayISO, lastDayOfMonthISO, firstDayOfMonthISO, getRelevantMondayOfWeek, addDaysISO } from '@/lib/date'
import { computeStreak, currentMilestone, findBreakingHomework, freezeWouldHelp, crystalWouldHelp } from '@/lib/streak'
import { computeQuestProgress, defaultWeeklyTemplateKeys, type QuestResult } from '@/lib/quests'
import { buildQuestContext, buildFeasibility } from '@/lib/questContext'
import { findQuestTemplate } from '@/lib/questVault'
import { assignGuilds, findMyGuild, weeklyGuildQuestKey, findGuildQuestTemplate, computeGuildQuestProgress, type Guild, type GuildQuestResult, type GuildMember } from '@/lib/guilds'
import { buildDutyDone, dutyDoneWeekdays } from '@/lib/duty'
import { collectAchievements, countAchievements, type AchievementCounts } from '@/lib/achievements'
import { buildGuideNote, buildChronicle, type GuideNote, type ChronicleEntry } from '@/lib/heldenbuch'
import { getSeasonTheme, isArcUnlocked, splitterFound } from '@/lib/seasonTheme'
import { riddleForArc, SPLITTER_RIDDLE, type Riddle } from '@/lib/riddles'
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
  const [{ data: allFreezes }, { data: allExtensions }] = studentIds.length > 0
    ? await Promise.all([
        supabase.from('streak_freezes').select('student_id,homework_id,created_at').in('student_id', studentIds),
        supabase.from('homework_extensions').select('student_id,homework_id,extra_days,created_at').in('student_id', studentIds),
      ])
    : [{ data: [] }, { data: [] }]

  const frozenByStudent = new Map<string, Set<string>>()
  const freezeUsedThisSeasonByStudent = new Set<string>()
  for (const f of allFreezes ?? []) {
    if (!frozenByStudent.has(f.student_id)) frozenByStudent.set(f.student_id, new Set())
    frozenByStudent.get(f.student_id)!.add(f.homework_id)
    if (f.created_at.slice(0, 7) === currentSeason) freezeUsedThisSeasonByStudent.add(f.student_id)
  }

  // ─── ZEITKRISTALL (HÜ-Fristverlängerung, siehe lib/streak.ts effectiveDueDate) ──
  const extensionsByStudent = new Map<string, Map<string, number>>()
  const crystalUsedThisSeasonByStudent = new Set<string>()
  for (const e of allExtensions ?? []) {
    if (!extensionsByStudent.has(e.student_id)) extensionsByStudent.set(e.student_id, new Map())
    extensionsByStudent.get(e.student_id)!.set(e.homework_id, e.extra_days)
    if (e.created_at.slice(0, 7) === currentSeason) crystalUsedThisSeasonByStudent.add(e.student_id)
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
    const extensions = extensionsByStudent.get(s.id)
    const actualStreak = computeStreak(doneIds, allHwDesc ?? [], today, frozenIds, extensions)
    const displayStreak = computeStreak(confirmedIds, allHwDesc ?? [], today, frozenIds, extensions)

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
  let myStreak: { streak: number; broken: boolean; jokerAvailable: boolean; jokerUsedThisSeason: boolean; crystalAvailable: boolean; crystalUsedThisSeason: boolean } | null = null
  let myActualStreak = 0
  let myPendingMilestone: number | null = null
  if (profile.role === 'student') {
    const myOwnDoneIds = doneByStudent.get(profile.id) ?? new Set<string>()
    const myConfirmedIds = confirmedDoneByStudent.get(profile.id) ?? new Set<string>()
    const myFrozenIds = frozenByStudent.get(profile.id)
    const myExtensions = extensionsByStudent.get(profile.id)
    myActualStreak = computeStreak(myOwnDoneIds, allHwDesc ?? [], today, myFrozenIds, myExtensions)
    const myDisplayStreak = computeStreak(myConfirmedIds, allHwDesc ?? [], today, myFrozenIds, myExtensions)
    const actualMs = currentMilestone(myActualStreak)
    myPendingMilestone = myActualStreak >= 5 && actualMs > currentMilestone(myDisplayStreak) ? actualMs : null
    const broken = findBreakingHomework(myConfirmedIds, allHwDesc ?? [], today, myFrozenIds, myExtensions) !== null
    const jokerUsedThisSeason = freezeUsedThisSeasonByStudent.has(profile.id)
    // Verfügbar nur, wenn das Item die Streak hier auch wirklich rettet
    // (deckt sich mit dem Wirkungs-Guard in useStreakFreeze/useTimeCrystal).
    const jokerAvailable = freezeWouldHelp(myConfirmedIds, allHwDesc ?? [], today, myFrozenIds, myExtensions) && !jokerUsedThisSeason
    const crystalUsedThisSeason = crystalUsedThisSeasonByStudent.has(profile.id)
    const crystalAvailable = crystalWouldHelp(myConfirmedIds, allHwDesc ?? [], today, myFrozenIds, myExtensions) && !crystalUsedThisSeason
    myStreak = { streak: myDisplayStreak, broken, jokerAvailable, jokerUsedThisSeason, crystalAvailable, crystalUsedThisSeason }
  }

  // ─── QUESTS (nur für eingeloggten Schüler, siehe lib/quests.ts) ──────────────
  const weekStart = getRelevantMondayOfWeek()
  let questsForMe: QuestResult[] = []
  let guildSection: { guild: Guild; members: GuildMember[]; quest: GuildQuestResult } | null = null
  // Signale für die Heldenbuch-Guide-Notiz — im Quest-Block gesetzt (dort in
  // Scope), im Heldenbuch-Block weiter unten verwendet.
  let hbOpenHomework = 0
  let hbDutyName: string | null = null
  let hbDutyKeptUp = false
  let hbQuestsDone = 0
  let hbQuestsTotal = 0
  if (profile.role === 'student') {
    const weekEnd = addDaysISO(6, new Date(`${weekStart}T00:00:00`))

    const [
      { data: weekReminders },
      { data: weekEvents },
      { data: weekDuty },
      { data: myChoices },
    ] = await Promise.all([
      supabase.from('reminders').select('id,event_date,target_student_ids').eq('class_id', activeClassId).gte('event_date', weekStart).lte('event_date', weekEnd),
      supabase.from('events').select('id,start_date,target_student_ids').eq('class_id', activeClassId).gte('start_date', weekStart).lte('start_date', weekEnd),
      supabase.from('duties').select('id,assignee_ids,duty_name').eq('class_id', activeClassId).eq('week_start', weekStart).order('id'),
      supabase.from('quest_choices').select('template_key,choice_key').eq('student_id', profile.id).eq('week_start', weekStart),
    ])

    const weekReminderIds = (weekReminders ?? [])
      .filter(r => !r.target_student_ids || r.target_student_ids.includes(profile.id))
      .map(r => r.id)
    const { data: myViews } = weekReminderIds.length > 0
      ? await supabase.from('reminder_views').select('reminder_id').eq('student_id', profile.id).in('reminder_id', weekReminderIds)
      : { data: [] }

    // ─── DIENST-SELBSTBESTÄTIGUNG (SDT: Kind kontrolliert sich selbst) ───────
    const weekDutyIds = (weekDuty ?? []).map(d => d.id)
    const { data: dutyCompletionsRaw } = weekDutyIds.length > 0
      ? await supabase.from('duty_completions').select('duty_id,student_id,weekday').in('duty_id', weekDutyIds)
      : { data: [] }
    const { doneByDutyStudent, keptUpStudents, assignedStudents: dutyAssignedStudents } = buildDutyDone(weekDuty ?? [], dutyCompletionsRaw ?? [])
    // Genau EIN Dienst pro Kind (wie auf der Startseite, siehe page.tsx
    // myDuty) — vorher zählte hier das Maximum über ALLE zugeteilten Dienste,
    // während die Guide-Notiz weiter unten (hbDutyName) den ERSTEN nannte:
    // bei zwei Diensten konnte der genannte Name nicht zum gezeigten
    // Fortschritt passen, und der Fortschritt selbst wich von der Startseite ab.
    const myDuty = (weekDuty ?? []).find(d => d.assignee_ids.includes(profile.id)) ?? null
    const myDuties = myDuty ? [myDuty] : []
    const dutyDoneCount = myDuty ? dutyDoneWeekdays(doneByDutyStudent, myDuty.id, profile.id).length : 0

    const weekHw = (allHwDesc ?? []).filter(h => h.due_date >= weekStart && h.due_date <= weekEnd)
    const myOwnCompletions = (allCompletions ?? [])
      .filter(c => c.student_id === profile.id)
      .map(c => ({ homework_id: c.homework_id, completed_at: (c as any).completed_at ?? null }))

    const choiceByTemplate = new Map((myChoices ?? []).map(c => [c.template_key, c.choice_key]))

    const questCtx = buildQuestContext({
      weekStart,
      weekEnd,
      today,
      studentId: profile.id,
      allHomework: allHwDesc ?? [],
      ownCompletions: myOwnCompletions,
      confirmedHomeworkIds: confirmedDoneByStudent.get(profile.id) ?? new Set<string>(),
      reminders: weekReminders ?? [],
      viewedReminderIds: new Set((myViews ?? []).map(v => v.reminder_id)),
      events: weekEvents ?? [],
      dutyDoneCount,
      currentStreakLength: myActualStreak,
    })
    const feasibility = buildFeasibility(questCtx, myDuties.length > 0)
    const activeQuestKeys = defaultWeeklyTemplateKeys(activeClassId, weekStart, 3, feasibility)

    questsForMe = activeQuestKeys
      .map(key => findQuestTemplate(key))
      .filter((t): t is NonNullable<typeof t> => !!t)
      .map(t => computeQuestProgress(t, questCtx, choiceByTemplate.get(t.key)))

    // Heldenbuch-Guide-Notiz-Signale festhalten (Scope siehe oben)
    hbOpenHomework = (allHwDesc ?? []).filter(h => h.due_date > today && !(doneByStudent.get(profile.id)?.has(h.id))).length
    hbDutyName = myDuties[0]?.duty_name ?? null
    hbDutyKeptUp = keptUpStudents.has(profile.id)
    hbQuestsDone = questsForMe.filter(q => q.done).length
    hbQuestsTotal = questsForMe.length

    // ─── GILDEN (Phase 3): kooperative Wochen-Quest in Kleingruppe ────────────
    const allStudentIds = (students ?? []).map(s => s.id)
    const guilds = assignGuilds(activeClassId, currentSeason, allStudentIds)
    const myGuild = findMyGuild(guilds, profile.id)
    if (myGuild) {
      const guildFeasibility = { hasWeekHomework: weekHw.length > 0, hasWeekDuty: (weekDuty ?? []).length > 0 }
      const guildTemplate = findGuildQuestTemplate(weeklyGuildQuestKey(activeClassId, weekStart, guildFeasibility))
      if (guildTemplate) {
        const guildQuest = computeGuildQuestProgress(guildTemplate, myGuild, {
          weekHomeworkIds: weekHw.map(h => h.id),
          doneByStudent,
          confirmedByStudent: confirmedDoneByStudent,
          dutyDoneByStudent: keptUpStudents,
          dutyAssignedStudents,
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
    crystalAvailable: boolean
    crystalUsedThisSeason: boolean
    pendingConfirmationCount: number
    nudgeSentToday: boolean
    pendingMilestone: number | null
    milestones: { milestone: number; confirmed_at: string }[]
    achievementCounts: AchievementCounts
    guideNote: GuideNote
    noteGuideIcon: string
    preferredGuideIcon: string | null
    chronicle: ChronicleEntry[]
  } | null = null
  if (profile.role === 'student' && myStreak) {
    // ─── MEIN GUIDE: persönliche Wahl (falls freigeschaltet) statt Guide der
    // aktuellen Klassenwelt — siehe app/actions/saveGuidePreference.ts. ───────
    const currentThemeName = getSeasonTheme(currentSeason).name
    const preferredGuideIcon = (profile as { preferred_guide_icon?: string | null }).preferred_guide_icon ?? null
    const effectiveGuideIcon = preferredGuideIcon && isArcUnlocked(preferredGuideIcon, currentThemeName)
      ? preferredGuideIcon
      : getSeasonTheme(currentSeason).icon

    const [{ data: myMilestones }, { data: myAchievements }, { data: recentNudges }] = await Promise.all([
      supabase.from('streak_confirmations').select('milestone,confirmed_at').eq('student_id', profile.id).order('confirmed_at', { ascending: false }),
      supabase.from('achievements').select('kind,key,period,achieved_at').eq('student_id', profile.id),
      // Lokales Datum per String-Slice vergleichen statt DB-seitigem gte-
      // Zeitbereich (created_at ist UTC) — siehe sendParentNudge.ts.
      supabase.from('parent_nudges').select('created_at').eq('student_id', profile.id).order('created_at', { ascending: false }).limit(5),
    ])
    const myOwnDoneIdsForNudge = doneByStudent.get(profile.id) ?? new Set<string>()
    const myConfirmedIdsForNudge = confirmedDoneByStudent.get(profile.id) ?? new Set<string>()
    const pendingConfirmationCount = [...myOwnDoneIdsForNudge].filter(id => !myConfirmedIdsForNudge.has(id)).length
    const nudgeSentToday = (recentNudges ?? []).some(n => n.created_at.slice(0, 10) === today)
    const guideNote = buildGuideNote({
      openHomeworkCount: hbOpenHomework,
      dutyName: hbDutyName,
      dutyKeptUp: hbDutyKeptUp,
      confirmedStreak: myStreak.streak,
      broken: myStreak.broken,
      questsDone: hbQuestsDone,
      questsTotal: hbQuestsTotal,
    }, effectiveGuideIcon)
    const chronicle = buildChronicle({
      milestones: myMilestones ?? [],
      shieldUses: (allFreezes ?? []).filter(f => f.student_id === profile.id).map(f => ({ created_at: f.created_at })),
      crystalUses: (allExtensions ?? []).filter(e => e.student_id === profile.id).map(e => ({ created_at: e.created_at })),
      achievements: myAchievements ?? [],
      brokenNow: myStreak.broken,
      today,
    })
    myHeldenbuch = {
      streak: myActualStreak,
      confirmedStreak: myStreak.streak,
      broken: myStreak.broken,
      jokerAvailable: myStreak.jokerAvailable,
      jokerUsedThisSeason: myStreak.jokerUsedThisSeason,
      crystalAvailable: myStreak.crystalAvailable,
      crystalUsedThisSeason: myStreak.crystalUsedThisSeason,
      pendingConfirmationCount,
      nudgeSentToday,
      pendingMilestone: myPendingMilestone,
      milestones: myMilestones ?? [],
      achievementCounts: countAchievements(myAchievements ?? []),
      guideNote,
      noteGuideIcon: effectiveGuideIcon,
      preferredGuideIcon,
      chronicle,
    }
  }

  // ─── RÄTSEL-QUESTS (Arc-Item + Splitter, siehe lib/riddles.ts) — dieselbe
  // Liste wie auf der Startseite, damit /streaks konsistent ist. ───────────────
  let riddlesForMe: { riddle: Riddle; solved: boolean }[] = []
  if (profile.role === 'student') {
    const { data: riddleSolves } = await supabase
      .from('quest_riddle_solutions')
      .select('riddle_key')
      .eq('student_id', profile.id)
    const solvedRiddleKeys = new Set((riddleSolves ?? []).map(r => (r as { riddle_key: string }).riddle_key))
    const arcRiddle = riddleForArc(getSeasonTheme(currentSeason).icon)
    riddlesForMe = [
      arcRiddle,
      splitterFound(getSeasonTheme(currentSeason).name) ? SPLITTER_RIDDLE : undefined,
    ]
      .filter((r): r is NonNullable<typeof r> => !!r)
      .map(r => ({ riddle: r, solved: solvedRiddleKeys.has(r.key) }))
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
      riddles={riddlesForMe}
      guildSection={guildSection}
    />
  )
}
