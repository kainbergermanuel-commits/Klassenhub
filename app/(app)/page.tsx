import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveAuth } from '@/lib/previewAuth'
import { matchChild, getClass } from '@/lib/auth'
import { todayISO, getRelevantMondayOfWeek, schoolYearStartISO, addDaysISO } from '@/lib/date'
import { computeStreak, currentMilestone, findBreakingHomework, groupFrozenByStudent } from '@/lib/streak'
import { countClassGoalDone } from '@/lib/classGoal'
import { resolveWeeklyTemplateKeys, computeQuestProgress, type QuestContext, type QuestResult } from '@/lib/quests'
import { findQuestTemplate } from '@/lib/questVault'
import { assignGuilds, findMyGuild, weeklyGuildQuestKey, findGuildQuestTemplate, computeGuildQuestProgress, type Guild, type GuildQuestResult } from '@/lib/guilds'
import type { GuildMember } from '@/lib/guilds'
import { collectAchievements, countAchievements, type AchievementCounts } from '@/lib/achievements'
import TeacherHome from '@/components/home/TeacherHome'
import StudentHome from '@/components/home/StudentHome'
import ParentHome from '@/components/home/ParentHome'
import type { HomeworkWithStatus, Reminder, Duty, AgendaEvent } from '@/lib/types'

export default async function HomePage() {
  const { user, profile, activeClassId } = await getEffectiveAuth()

  if (!user?.id) redirect('/login')

  if (!profile || !activeClassId) {
    return <div className="text-kh-muted text-center py-20">Dein Profil ist noch nicht vollständig konfiguriert.</div>
  }

  const supabase = await createClient()
  const klass = await getClass(activeClassId)

  const today = todayISO()
  const dutyWeekStart = getRelevantMondayOfWeek()
  const schoolYearStart = schoolYearStartISO()
  const currentSeason = today.slice(0, 7)

  const [
    { data: homeworkRaw },
    { data: remindersArr },
    { data: weekDuties },
    { data: eventsRaw },
    { data: classGoalRow },
  ] = await Promise.all([
    supabase.from('homework').select('*').eq('class_id', activeClassId).gt('due_date', today).order('due_date'),
    supabase.from('reminders').select('*').eq('class_id', activeClassId).gte('event_date', today).order('event_date').limit(8),
    supabase.from('duties').select('*').eq('class_id', activeClassId).eq('week_start', dutyWeekStart),
    supabase.from('events')
      .select('id,title,start_date,end_date,all_day,start_time,category,target_student_ids')
      .eq('class_id', activeClassId)
      .gte('end_date', today)
      .order('start_date', { ascending: true })
      .limit(6),
    supabase.from('class_goals').select('target,reward').eq('class_id', activeClassId).eq('season', currentSeason).maybeSingle(),
  ])

  const classGoal = classGoalRow ? { target: classGoalRow.target, reward: classGoalRow.reward } : null

  const homework = homeworkRaw ?? []
  const upcomingReminders: Reminder[] = remindersArr ?? []
  const duties: Duty[] = weekDuties ?? []

  // Terminliste für die Startseite (Minicard mit Datum-Pillen + kombiniertes
  // Agenda-Panel mit Umschalter Erinnerungen/Termine).
  const events = eventsRaw ?? []
  const upcomingEvents: AgendaEvent[] = events.map(e => ({
    id: e.id,
    title: e.title,
    category: e.category,
    start_date: e.start_date,
    end_date: e.end_date,
    all_day: e.all_day,
    start_time: e.start_time,
    target_student_ids: e.target_student_ids,
  }))

  // ─── TEACHER ────────────────────────────────────────────────────────────────
  if (profile.role === 'teacher') {
    const [
      { count: studentCount },
      { count: submittedCount },
      { data: allStudents },
      { data: allHwForStreaks },
      { data: recentHw },
    ] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('class_id', activeClassId).eq('role', 'student'),
      supabase.from('homework_completions').select('homework_id', { count: 'exact', head: true }).in('homework_id', homework.map(h => h.id)),
      supabase.from('profiles').select('id,full_name,avatar_color,avatar_seed,avatar_hair_color,avatar_skin_color').eq('class_id', activeClassId).eq('role', 'student'),
      supabase.from('homework').select('id,due_date').eq('class_id', activeClassId).gte('due_date', schoolYearStart).order('due_date', { ascending: false }),
      supabase.from('homework').select('id,title,subject,subject_short,subject_color,due_date').eq('class_id', activeClassId).lte('due_date', today).order('due_date', { ascending: false }).limit(3),
    ])

    const allHwIds = (allHwForStreaks ?? []).map(h => h.id)
    const { data: allCompletions } = allHwIds.length > 0
      ? await supabase.from('homework_completions').select('homework_id,student_id,confirmed_by_parent_at').in('homework_id', allHwIds)
      : { data: [] }

    const students = allStudents ?? []
    const studentMap = Object.fromEntries(students.map(s => [s.id, s.full_name.split(' ')[0]]))
    const dutyEntries = duties.map(d => ({
      name: d.duty_name,
      names: d.assignee_ids.map((id: string) => studentMap[id] ?? '?'),
    }))

    const doneByStudent = new Map<string, Set<string>>()
    for (const c of allCompletions ?? []) {
      if (!doneByStudent.has(c.student_id)) doneByStudent.set(c.student_id, new Set())
      doneByStudent.get(c.student_id)!.add(c.homework_id)
    }
    const completionCountByHw = new Map<string, number>()
    for (const c of allCompletions ?? []) {
      completionCountByHw.set(c.homework_id, (completionCountByHw.get(c.homework_id) ?? 0) + 1)
    }
    const homeworkWithCounts = homework.map(h => ({ ...h, done: false, completion_count: completionCountByHw.get(h.id) ?? 0 }))

    // Schüler mit mindestens einer offenen HÜ (für Avatar-Stack + Tooltip auf der HÜ-Card)
    const hwOpenStudents = students.filter(s =>
      homework.some(h => !(doneByStudent.get(s.id)?.has(h.id)))
    )

    return (
      <TeacherHome
        fullName={profile.full_name}
        userId={user.id}
        classId={activeClassId}
        klass={klass}
        homeworkList={homeworkWithCounts}
        hwSubmittedCount={submittedCount ?? 0}
        studentCount={studentCount ?? 0}
        hwOpenStudents={hwOpenStudents}
        reminders={upcomingReminders}
        dutyEntries={dutyEntries}
        upcomingEvents={upcomingEvents}
        recentHomework={(recentHw ?? []).map(h => ({ ...h, completion_count: completionCountByHw.get(h.id) ?? 0 }))}
        classGoal={classGoal}
        classGoalDone={countClassGoalDone(allHwForStreaks ?? [], allCompletions ?? [])}
        season={currentSeason}
      />
    )
  }

  // ─── STUDENT ────────────────────────────────────────────────────────────────
  if (profile.role === 'student') {
    const [
      { data: completions },
      { data: allHwForStreak },
      { data: allStudents },
    ] = await Promise.all([
      supabase.from('homework_completions').select('homework_id,completed_at').eq('student_id', user.id),
      supabase.from('homework').select('id,due_date').eq('class_id', activeClassId).gte('due_date', schoolYearStart).order('due_date', { ascending: false }),
      supabase.from('profiles').select('id,full_name,avatar_color,avatar_seed,avatar_hair_color,avatar_skin_color').eq('class_id', activeClassId).eq('role', 'student'),
    ])

    const doneIds = new Set((completions ?? []).map(c => c.homework_id))
    const homeworkWithStatus: HomeworkWithStatus[] = homework.map(h => ({ ...h, done: doneIds.has(h.id) }))

    const studentIdsS = (allStudents ?? []).map(s => s.id)
    const { data: freezesS } = studentIdsS.length > 0
      ? await supabase.from('streak_freezes').select('student_id,homework_id,created_at').in('student_id', studentIdsS)
      : { data: [] }
    const frozenByStudentS = groupFrozenByStudent(freezesS ?? [])
    const freezeUsedThisSeasonS = new Set((freezesS ?? []).filter(f => f.created_at.slice(0, 7) === currentSeason).map(f => f.student_id))

    const reminderIds = upcomingReminders.map(r => r.id)
    const myViewedIds: string[] = []
    if (reminderIds.length > 0) {
      const { data: myViews } = await supabase
        .from('reminder_views').select('reminder_id')
        .eq('student_id', user.id).in('reminder_id', reminderIds)
      myViewedIds.push(...(myViews ?? []).map(v => v.reminder_id))
    }
    const myDuty = duties.find(d => d.assignee_ids.includes(user.id)) ?? null

    // Eigener Streak: sofort sichtbar (auch unbestätigt)
    const streak = computeStreak(doneIds, allHwForStreak ?? [], today, frozenByStudentS.get(user.id))

    // Alle Erledigungen der Klasse (nur eltern-bestätigte) — Basis für eigenen
    // Streak, Gilden-Aggregation und Social-Proof-Nudge weiter unten.
    const allHwIds = (allHwForStreak ?? []).map(h => h.id)
    const { data: allCompletionsStudent } = allHwIds.length > 0
      ? await supabase.from('homework_completions').select('homework_id,student_id,confirmed_by_parent_at').in('homework_id', allHwIds)
      : { data: [] }
    const confirmedByStudentS = new Map<string, Set<string>>()
    for (const c of allCompletionsStudent ?? []) {
      if ((c as any).confirmed_by_parent_at) {
        if (!confirmedByStudentS.has(c.student_id)) confirmedByStudentS.set(c.student_id, new Set())
        confirmedByStudentS.get(c.student_id)!.add(c.homework_id)
      }
    }
    // Eigener bestätigter Streak → verdient die Flammen. Pending = eigener (actual)
    // Meilenstein liegt über dem bereits bestätigten ⇒ "warte auf Eltern".
    const confirmedStreak = computeStreak(confirmedByStudentS.get(user.id) ?? new Set(), allHwForStreak ?? [], today, frozenByStudentS.get(user.id))
    const actualMs = currentMilestone(streak)
    const pendingMilestone = streak >= 5 && actualMs > currentMilestone(confirmedStreak) ? actualMs : null

    const broken = findBreakingHomework(confirmedByStudentS.get(user.id) ?? new Set(), allHwForStreak ?? [], today, frozenByStudentS.get(user.id)) !== null
    const jokerUsedThisSeason = freezeUsedThisSeasonS.has(user.id)
    const jokerAvailable = broken && !jokerUsedThisSeason

    // ─── QUESTS (Wochen-Vorrat, siehe lib/quests.ts) ─────────────────────────
    const weekStart = dutyWeekStart
    const weekEnd = addDaysISO(6, new Date(`${weekStart}T00:00:00`))

    const [{ data: questOverrides }, { data: myChoices }] = await Promise.all([
      supabase.from('quests').select('template_key').eq('class_id', activeClassId).eq('week_start', weekStart),
      supabase.from('quest_choices').select('template_key,choice_key').eq('student_id', user.id).eq('week_start', weekStart),
    ])
    const activeQuestKeys = resolveWeeklyTemplateKeys(activeClassId, weekStart, (questOverrides ?? []).map(q => q.template_key))
    const choiceByTemplate = new Map((myChoices ?? []).map(c => [c.template_key, c.choice_key]))

    const weekHw = (allHwForStreak ?? []).filter(h => h.due_date >= weekStart && h.due_date <= weekEnd)
    const dueByHwId = new Map((allHwForStreak ?? []).map(h => [h.id, h.due_date]))
    const earlyHomeworkIds = new Set(
      (completions ?? [])
        .filter(c => {
          const due = dueByHwId.get(c.homework_id)
          return due && c.completed_at && c.completed_at.slice(0, 10) < due
        })
        .map(c => c.homework_id)
    )
    const weekReminderIds = upcomingReminders
      .filter(r => r.event_date >= weekStart && r.event_date <= weekEnd)
      .filter(r => !r.target_student_ids || r.target_student_ids.includes(user.id))
      .map(r => r.id)
    const weekEventIds = upcomingEvents
      .filter(e => e.start_date >= weekStart && e.start_date <= weekEnd)
      .filter(e => !e.target_student_ids || e.target_student_ids.includes(user.id))
      .map(e => e.id)
    const myFrozenIds = frozenByStudentS.get(user.id) ?? new Set<string>()
    const streakHeldThisWeek = weekHw.every(h => doneIds.has(h.id) || myFrozenIds.has(h.id))

    const questCtx: QuestContext = {
      weekStart,
      weekEnd,
      weekHomeworkIds: weekHw.map(h => h.id),
      doneHomeworkIds: doneIds,
      earlyHomeworkIds,
      confirmedHomeworkIds: confirmedByStudentS.get(user.id) ?? new Set(),
      weekReminderIds,
      viewedReminderIds: new Set(myViewedIds),
      weekEventIds,
      dutyAssignedThisWeek: !!myDuty,
      streakHeldThisWeek,
    }
    const quests: QuestResult[] = activeQuestKeys
      .map(key => findQuestTemplate(key))
      .filter((t): t is NonNullable<typeof t> => !!t)
      .map(t => computeQuestProgress(t, questCtx, choiceByTemplate.get(t.key)))

    // ─── SOCIAL-PROOF-NUDGE (anonym, keine Namen) ────────────────────────────
    // Ab 3 Schüler:innen, damit der Prozentwert niemanden einzeln erkennbar macht.
    const weekHwIdSet = new Set(weekHw.map(h => h.id))
    const studentsActiveThisWeek = new Set(
      (allCompletionsStudent ?? []).filter(c => weekHwIdSet.has(c.homework_id)).map(c => c.student_id)
    )
    const classSize = (allStudents ?? []).length
    const socialProofPct = classSize >= 3 ? Math.round((studentsActiveThisWeek.size / classSize) * 100) : null

    // ─── HELDENBUCH (eigene Meilensteine, keine Klasse-Ansicht) ──────────────
    const { data: myMilestones } = await supabase
      .from('streak_confirmations').select('milestone,confirmed_at')
      .eq('student_id', user.id).order('confirmed_at', { ascending: false })

    // ─── GILDEN (Phase 3): kooperative Wochen-Quest in Kleingruppe ──────────
    // Komplett aus bereits geladenen Daten berechnet, keine neue Query.
    const allStudentIds = (allStudents ?? []).map(s => s.id)
    const guilds = assignGuilds(activeClassId, currentSeason, allStudentIds)
    const myGuild = findMyGuild(guilds, user.id)

    let guildSection: { guild: Guild; members: GuildMember[]; quest: GuildQuestResult } | null = null
    if (myGuild) {
      const doneByStudentAll = new Map<string, Set<string>>()
      const confirmedByStudentAll = new Map<string, Set<string>>()
      for (const c of allCompletionsStudent ?? []) {
        if (!doneByStudentAll.has(c.student_id)) doneByStudentAll.set(c.student_id, new Set())
        doneByStudentAll.get(c.student_id)!.add(c.homework_id)
        if ((c as any).confirmed_by_parent_at) {
          if (!confirmedByStudentAll.has(c.student_id)) confirmedByStudentAll.set(c.student_id, new Set())
          confirmedByStudentAll.get(c.student_id)!.add(c.homework_id)
        }
      }
      const dutyAssignedByStudent = new Set(duties.flatMap(d => d.assignee_ids))
      const guildTemplate = findGuildQuestTemplate(weeklyGuildQuestKey(activeClassId, weekStart))
      if (guildTemplate) {
        const guildQuest = computeGuildQuestProgress(guildTemplate, myGuild, {
          weekHomeworkIds: weekHw.map(h => h.id),
          doneByStudent: doneByStudentAll,
          confirmedByStudent: confirmedByStudentAll,
          dutyAssignedByStudent,
        })
        const members: GuildMember[] = (allStudents ?? [])
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

    // ─── ERFOLGE (Heldenbuch-Statistik) ───────────────────────────────────────
    const classGoalDoneValue = countClassGoalDone(allHwForStreak ?? [], allCompletionsStudent ?? [])
    const classGoalReached = !!classGoal && classGoalDoneValue >= classGoal.target
    const newAchievements = collectAchievements({
      studentId: user.id,
      weekStart,
      season: currentSeason,
      quests,
      guildQuest: guildSection?.quest ?? null,
      classGoalReached,
    })
    if (newAchievements.length > 0) {
      // Fehlertolerant: schlägt z.B. in der Lehrer-Vorschau-als-Schüler-Funktion
      // fehl (RLS prüft den echten auth.uid(), nicht das vorgeschaute Profil,
      // Supabase gibt dann {error} zurück statt zu werfen) — reine Bonus-
      // Statistik, das Ergebnis wird bewusst nicht geprüft/geworfen.
      await supabase.from('achievements').upsert(newAchievements as never, { onConflict: 'student_id,kind,key,period', ignoreDuplicates: true })
    }
    const { data: allMyAchievements } = await supabase.from('achievements').select('kind').eq('student_id', user.id)
    const achievementCounts = countAchievements(allMyAchievements ?? [])

    return (
      <StudentHome
        fullName={profile.full_name}
        userId={user.id}
        classId={activeClassId}
        allHomework={homeworkWithStatus}
        reminders={upcomingReminders}
        myViewedIds={myViewedIds}
        upcomingEvents={upcomingEvents}
        streak={streak}
        confirmedStreak={confirmedStreak}
        broken={broken}
        jokerAvailable={jokerAvailable}
        jokerUsedThisSeason={jokerUsedThisSeason}
        pendingMilestone={pendingMilestone}
        classGoal={classGoal}
        classGoalDone={classGoalDoneValue}
        season={currentSeason}
        quests={quests}
        questWeekStart={weekStart}
        socialProofPct={socialProofPct}
        myMilestones={myMilestones ?? []}
        guildSection={guildSection}
        achievementCounts={achievementCounts}
      />
    )
  }

  // ─── PARENT ─────────────────────────────────────────────────────────────────
  if (profile.role === 'parent') {
    const { data: allStudents } = await supabase
      .from('profiles').select('id,full_name,avatar_color,avatar_seed,avatar_hair_color,avatar_skin_color').eq('class_id', activeClassId).eq('role', 'student')
    const child = matchChild(profile, allStudents ?? [])
      ?? allStudents?.[0] // preview fallback: use first student

    let childDoneIds = new Set<string>()
    let childStreak = 0 // actual – eigener Streak des Kindes (auch unbestätigt)
    let allHwForStreak: { id: string; due_date: string }[] = []
    if (child) {
      const [{ data: childCompletions }, { data: hwForStreak }] = await Promise.all([
        supabase.from('homework_completions').select('homework_id').eq('student_id', child.id),
        supabase.from('homework').select('id,due_date').eq('class_id', activeClassId).gte('due_date', schoolYearStart).order('due_date', { ascending: false }),
      ])
      allHwForStreak = hwForStreak ?? []
      childDoneIds = new Set((childCompletions ?? []).map(c => c.homework_id))
    }

    const studentIdsP = (allStudents ?? []).map(s => s.id)
    const { data: freezesP } = studentIdsP.length > 0
      ? await supabase.from('streak_freezes').select('student_id,homework_id').in('student_id', studentIdsP)
      : { data: [] }
    const frozenByStudentP = groupFrozenByStudent(freezesP ?? [])

    if (child) {
      childStreak = computeStreak(childDoneIds, allHwForStreak, today, frozenByStudentP.get(child.id))
    }

    // Streak leaderboard (nur eltern-bestätigte Streaks) + offene HÜ-Bestätigungen
    const allHwIdsP = allHwForStreak.map(h => h.id)
    const [{ data: allCompletionsParent }, { data: pendingConfs }] = await Promise.all([
      allHwIdsP.length > 0
        ? supabase.from('homework_completions').select('homework_id,student_id,confirmed_by_parent_at').in('homework_id', allHwIdsP)
        : Promise.resolve({ data: [] }),
      child
        ? supabase.from('homework_completions')
            .select('homework_id,homework:homework_id(title,subject,subject_short,subject_color,due_date)')
            .eq('student_id', child.id)
            .is('confirmed_by_parent_at', null)
        : Promise.resolve({ data: [] }),
    ])
    const confirmedByStudentP = new Map<string, Set<string>>()
    for (const c of allCompletionsParent ?? []) {
      if ((c as any).confirmed_by_parent_at) {
        if (!confirmedByStudentP.has(c.student_id)) confirmedByStudentP.set(c.student_id, new Set())
        confirmedByStudentP.get(c.student_id)!.add(c.homework_id)
      }
    }
    // Eltern-bestätigter Streak des Kindes → verdient die Flammen (Live-Spiegel)
    const childConfirmedStreak = child
      ? computeStreak(confirmedByStudentP.get(child.id) ?? new Set(), allHwForStreak, today, frozenByStudentP.get(child.id))
      : 0

    const pendingConfirmations = (pendingConfs ?? []).map((c: any) => ({
      homework_id: c.homework_id,
      student_id: child!.id,
      title: c.homework?.title ?? '',
      subject: c.homework?.subject ?? '',
      subject_short: c.homework?.subject_short ?? '',
      subject_color: c.homework?.subject_color ?? '#0F8A82',
      due_date: c.homework?.due_date ?? '',
    }))

    const childHwWithStatus: HomeworkWithStatus[] = homework.map(h => ({ ...h, done: childDoneIds.has(h.id) }))

    return (
      <ParentHome
        fullName={profile.full_name}
        childName={child?.full_name ?? 'Kind'}
        childColor={child?.avatar_color ?? '#0F8A82'}
        childSeed={child?.avatar_seed ?? null}
        childHairColor={child?.avatar_hair_color ?? null}
        childSkinColor={child?.avatar_skin_color ?? null}
        className={klass?.name ?? ''}
        childHomework={childHwWithStatus}
        reminders={upcomingReminders}
        upcomingEvents={upcomingEvents}
        childStreak={childStreak}
        childConfirmedStreak={childConfirmedStreak}
        pendingConfirmations={pendingConfirmations}
        classGoal={classGoal}
        classGoalDone={countClassGoalDone(allHwForStreak, allCompletionsParent ?? [])}
      />
    )
  }

  redirect('/login')
}
