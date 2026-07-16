import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveAuth } from '@/lib/previewAuth'
import { matchChild, getClass } from '@/lib/auth'
import { todayISO, getRelevantMondayOfWeek, schoolYearStartISO, addDaysISO } from '@/lib/date'
import { computeStreak, currentMilestone, findBreakingHomework, groupFrozenByStudent, VETERAN_MILESTONE } from '@/lib/streak'
import { countClassGoalDone } from '@/lib/classGoal'
import { resolveWeeklyTemplateKeys, computeQuestProgress, type QuestResult } from '@/lib/quests'
import { buildQuestContext, buildFeasibility } from '@/lib/questContext'
import { findQuestTemplate } from '@/lib/questVault'
import { assignGuilds, findMyGuild, weeklyGuildQuestKey, findGuildQuestTemplate, computeGuildQuestProgress, type Guild, type GuildQuestResult } from '@/lib/guilds'
import type { GuildMember } from '@/lib/guilds'
import { buildDutyDone, dutyDoneWeekdays } from '@/lib/duty'
import { collectAchievements, countAchievements, type AchievementCounts } from '@/lib/achievements'
import { buildGuideNote, buildChronicle } from '@/lib/heldenbuch'
import { getSeasonTheme, isArcUnlocked } from '@/lib/seasonTheme'
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
    // Ganzes Schuljahr statt nur "bevorstehend" — deckt alle drei Rollen-Zweige
    // ab, die sonst je eine eigene, überlappende Schuljahres-Abfrage gestellt
    // hätten (Streak-Berechnung, Klassenziel, Lehrer-"zuletzt erledigt").
    // Absteigend sortiert, weil computeStreak/findBreakingHomework das so
    // erwarten (Parametername `allHwDesc` in lib/streak.ts).
    // Zweites Sortierkriterium (id) macht die Reihenfolge bei gleichem
    // due_date deterministisch — sonst könnte die Ableitung von "bevorstehend"/
    // "zuletzt erledigt" (unten) bei einem Datums-Gleichstand anders sortiert
    // sein als die früheren separaten Abfragen (die selbst auch keinen
    // Tiebreaker hatten, also ohnehin nicht garantiert stabil waren).
    supabase.from('homework').select('*').eq('class_id', activeClassId).gte('due_date', schoolYearStart).order('due_date', { ascending: false }).order('id', { ascending: false }),
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

  // Ganzes Schuljahr (rollenübergreifend wiederverwendet für Streak-Berechnung/
  // Klassenziel) + die "bevorstehende" Teilmenge daraus abgeleitet statt separat
  // abgefragt — Fenster 2 (Schuljahr) enthält Fenster 1 (bevorstehend) ohnehin
  // komplett, da der Schuljahresbeginn immer vor heute liegt.
  const homeworkAll = homeworkRaw ?? []
  const homework = homeworkAll.filter(h => h.due_date > today).reverse() // aufsteigend für die Anzeige-Liste
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
      { data: attendanceRaw },
    ] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('class_id', activeClassId).eq('role', 'student'),
      supabase.from('homework_completions').select('homework_id', { count: 'exact', head: true }).in('homework_id', homework.map(h => h.id)),
      supabase.from('profiles').select('id,full_name,avatar_color,avatar_seed,avatar_hair_color,avatar_skin_color').eq('class_id', activeClassId).eq('role', 'student'),
      // Anwesenheit für die Startkarte: heutige Einträge + alle offenen
      // Elternmeldungen in einem Rutsch (statt zwei Abfragen).
      supabase.from('attendance' as never)
        .select('id,student_id,date,status,source,note,confirmed_at')
        .eq('class_id', activeClassId)
        .or(`date.eq.${today},confirmed_at.is.null`)
        .order('date') as unknown as Promise<{ data: { id: string; student_id: string; date: string; status: 'entschuldigt' | 'unentschuldigt'; source: 'teacher' | 'parent'; note: string; confirmed_at: string | null }[] | null }>,
    ])

    const attendanceEntries = attendanceRaw ?? []
    const attendancePendingReports = attendanceEntries
      .filter(a => !a.confirmed_at)
      .map(a => ({ id: a.id, student_id: a.student_id, date: a.date, note: a.note }))
    const absentToday = attendanceEntries
      .filter(a => a.date === today)
      .map(a => ({ student_id: a.student_id, status: a.status, pending: !a.confirmed_at }))

    // allHwForStreaks/recentHw waren eigene Abfragen desselben Schuljahres-
    // Fensters, das oben (homeworkAll) schon geladen ist — hier nur noch
    // gefiltert/geschnitten statt neu abgefragt.
    const allHwForStreaks = homeworkAll
    const recentHw = homeworkAll.filter(h => h.due_date <= today).slice(0, 3)

    const allHwIds = allHwForStreaks.map(h => h.id)
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
        recentHomework={recentHw.map(h => ({ ...h, completion_count: completionCountByHw.get(h.id) ?? 0 }))}
        attendancePendingReports={attendancePendingReports}
        absentToday={absentToday}
        students={students}
        classGoal={classGoal}
        classGoalDone={countClassGoalDone(allHwForStreaks, allCompletions ?? [])}
        season={currentSeason}
      />
    )
  }

  // ─── STUDENT ────────────────────────────────────────────────────────────────
  if (profile.role === 'student') {
    const [
      { data: completions },
      { data: allStudents },
    ] = await Promise.all([
      supabase.from('homework_completions').select('homework_id,completed_at').eq('student_id', user.id),
      supabase.from('profiles').select('id,full_name,avatar_color,avatar_seed,avatar_hair_color,avatar_skin_color').eq('class_id', activeClassId).eq('role', 'student'),
    ])

    // Ganzes Schuljahr kommt bereits aus dem rollenübergreifenden Batch oben
    // (homeworkAll) — keine eigene Abfrage mehr nötig.
    const allHwForStreak = homeworkAll

    const doneIds = new Set((completions ?? []).map(c => c.homework_id))
    const homeworkWithStatus: HomeworkWithStatus[] = homework.map(h => ({ ...h, done: doneIds.has(h.id) }))

    const studentIdsS = (allStudents ?? []).map(s => s.id)
    const dutyIds = duties.map(d => d.id)
    const reminderIds = upcomingReminders.map(r => r.id)
    const allHwIds = allHwForStreak.map(h => h.id)
    const weekStart = dutyWeekStart
    const weekEnd = addDaysISO(6, new Date(`${weekStart}T00:00:00`))

    // ─── Alle voneinander unabhängigen Folge-Queries gebündelt (vorher 6
    // sequenzielle Round-Trips) — jede hängt nur von IDs/Daten ab, die durch
    // den ersten Batch oben schon vorliegen, nicht voneinander. ─────────────
    const [
      { data: freezesS },
      { data: extensionsS },
      { data: myViews },
      { data: dutyCompletionsRaw },
      { data: allCompletionsStudent },
      { data: questOverrides },
      { data: myChoices },
      { data: myMilestones },
      { data: recentNudges },
    ] = await Promise.all([
      studentIdsS.length > 0
        ? supabase.from('streak_freezes').select('student_id,homework_id,created_at').in('student_id', studentIdsS)
        : Promise.resolve({ data: [] }),
      studentIdsS.length > 0
        ? supabase.from('homework_extensions').select('student_id,homework_id,extra_days,created_at').in('student_id', studentIdsS)
        : Promise.resolve({ data: [] }),
      reminderIds.length > 0
        ? supabase.from('reminder_views').select('reminder_id').eq('student_id', user.id).in('reminder_id', reminderIds)
        : Promise.resolve({ data: [] }),
      dutyIds.length > 0
        ? supabase.from('duty_completions').select('duty_id,student_id,weekday').in('duty_id', dutyIds)
        : Promise.resolve({ data: [] }),
      allHwIds.length > 0
        ? supabase.from('homework_completions').select('homework_id,student_id,confirmed_by_parent_at').in('homework_id', allHwIds)
        : Promise.resolve({ data: [] }),
      supabase.from('quests').select('template_key').eq('class_id', activeClassId).eq('week_start', weekStart),
      supabase.from('quest_choices').select('template_key,choice_key').eq('student_id', user.id).eq('week_start', weekStart),
      supabase.from('streak_confirmations').select('milestone,confirmed_at').eq('student_id', user.id).order('confirmed_at', { ascending: false }),
      // Botenfeder (Balance-Fahrplan Phase 3) — hier schon mitgeladen statt erst
      // bei den Erfolgen weiter unten, da nur von user.id abhängig.
      supabase.from('parent_nudges').select('created_at').eq('student_id', user.id).order('created_at', { ascending: false }).limit(5),
    ])

    const frozenByStudentS = groupFrozenByStudent(freezesS ?? [])
    const freezeUsedThisSeasonS = new Set((freezesS ?? []).filter(f => f.created_at.slice(0, 7) === currentSeason).map(f => f.student_id))

    // ─── ZEITKRISTALL (HÜ-Fristverlängerung, siehe lib/streak.ts effectiveDueDate) ──
    const extensionsByStudentS = new Map<string, Map<string, number>>()
    const crystalUsedThisSeasonS = new Set<string>()
    for (const e of extensionsS ?? []) {
      if (!extensionsByStudentS.has(e.student_id)) extensionsByStudentS.set(e.student_id, new Map())
      extensionsByStudentS.get(e.student_id)!.set(e.homework_id, e.extra_days)
      if (e.created_at.slice(0, 7) === currentSeason) crystalUsedThisSeasonS.add(e.student_id)
    }

    const myViewedIds: string[] = (myViews ?? []).map(v => v.reminder_id)
    const myDuty = duties.find(d => d.assignee_ids.includes(user.id)) ?? null

    // ─── DIENST-SELBSTBESTÄTIGUNG (SDT: Kind kontrolliert sich selbst) ───────
    const { doneByDutyStudent, keptUpStudents } = buildDutyDone(duties, dutyCompletionsRaw ?? [])
    const myDutyDoneWeekdays = myDuty ? dutyDoneWeekdays(doneByDutyStudent, myDuty.id, user.id) : []
    const dutyDoneCount = myDutyDoneWeekdays.length

    // Dienst-Partner (übrige zugeteilte Kinder) für das Dienst-Modul — aus den
    // bereits geladenen Klassen-Profilen, keine neue Query.
    const myDutyPartnerIds = myDuty ? myDuty.assignee_ids.filter((id: string) => id !== user.id) : []
    const myDutyPartners = (allStudents ?? [])
      .filter(s => myDutyPartnerIds.includes(s.id))
      .map(s => ({
        full_name: s.full_name,
        avatar_color: s.avatar_color ?? '#0F8A82',
        avatar_seed: s.avatar_seed ?? null,
        avatar_hair_color: s.avatar_hair_color ?? null,
        avatar_skin_color: s.avatar_skin_color ?? null,
      }))

    // Eigener Streak: sofort sichtbar (auch unbestätigt)
    const streak = computeStreak(doneIds, allHwForStreak, today, frozenByStudentS.get(user.id), extensionsByStudentS.get(user.id))

    // Alle Erledigungen der Klasse (nur eltern-bestätigte) — Basis für eigenen
    // Streak, Gilden-Aggregation und Social-Proof-Nudge weiter unten.
    const confirmedByStudentS = new Map<string, Set<string>>()
    for (const c of allCompletionsStudent ?? []) {
      if ((c as any).confirmed_by_parent_at) {
        if (!confirmedByStudentS.has(c.student_id)) confirmedByStudentS.set(c.student_id, new Set())
        confirmedByStudentS.get(c.student_id)!.add(c.homework_id)
      }
    }
    // Eigener bestätigter Streak → verdient die Flammen. Pending = eigener (actual)
    // Meilenstein liegt über dem bereits bestätigten ⇒ "warte auf Eltern".
    const confirmedStreak = computeStreak(confirmedByStudentS.get(user.id) ?? new Set(), allHwForStreak, today, frozenByStudentS.get(user.id), extensionsByStudentS.get(user.id))
    const actualMs = currentMilestone(streak)
    const pendingMilestone = streak >= 5 && actualMs > currentMilestone(confirmedStreak) ? actualMs : null

    const broken = findBreakingHomework(confirmedByStudentS.get(user.id) ?? new Set(), allHwForStreak, today, frozenByStudentS.get(user.id), extensionsByStudentS.get(user.id)) !== null
    const jokerUsedThisSeason = freezeUsedThisSeasonS.has(user.id)
    const jokerAvailable = broken && !jokerUsedThisSeason
    const crystalUsedThisSeason = crystalUsedThisSeasonS.has(user.id)
    const crystalAvailable = broken && !crystalUsedThisSeason

    // ─── QUESTS (Wochen-Vorrat, siehe lib/quests.ts) ─────────────────────────
    const choiceByTemplate = new Map((myChoices ?? []).map(c => [c.template_key, c.choice_key]))

    const weekHw = allHwForStreak.filter(h => h.due_date >= weekStart && h.due_date <= weekEnd)
    const questCtx = buildQuestContext({
      weekStart,
      weekEnd,
      studentId: user.id,
      allHomework: allHwForStreak,
      ownCompletions: completions ?? [],
      confirmedHomeworkIds: confirmedByStudentS.get(user.id) ?? new Set(),
      reminders: upcomingReminders,
      viewedReminderIds: new Set(myViewedIds),
      events: upcomingEvents,
      dutyDoneCount,
      currentStreakLength: streak,
    })
    const feasibility = buildFeasibility(questCtx, !!myDuty)
    const activeQuestKeys = resolveWeeklyTemplateKeys(activeClassId, weekStart, (questOverrides ?? []).map(q => q.template_key), 3, feasibility)
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
    // myMilestones kommt bereits aus dem gebündelten Batch weiter oben.

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
      const guildFeasibility = { hasWeekHomework: weekHw.length > 0, hasWeekDuty: duties.length > 0 }
      const guildTemplate = findGuildQuestTemplate(weeklyGuildQuestKey(activeClassId, weekStart, guildFeasibility))
      if (guildTemplate) {
        const guildQuest = computeGuildQuestProgress(guildTemplate, myGuild, {
          weekHomeworkIds: weekHw.map(h => h.id),
          doneByStudent: doneByStudentAll,
          confirmedByStudent: confirmedByStudentAll,
          dutyDoneByStudent: keptUpStudents,
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
    const classGoalDoneValue = countClassGoalDone(allHwForStreak, allCompletionsStudent ?? [])
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
    // Frischer Read nach dem Upsert, damit gerade neu vergebene Erfolge sofort
    // mitgezählt werden. recentNudges (Botenfeder) kommt bereits aus dem
    // gebündelten Batch weiter oben — lokales Datum per String-Slice statt
    // DB-seitigem gte-Zeitbereich verglichen (created_at ist UTC, ein naiver
    // "heute 00:00"-String wäre nahe Mitternacht in Europe/Vienna falsch) —
    // siehe sendParentNudge.ts.
    const { data: allMyAchievements } = await supabase.from('achievements').select('kind,key,achieved_at').eq('student_id', user.id)
    const achievementCounts = countAchievements(allMyAchievements ?? [])
    const myConfirmedIdsForNudge = confirmedByStudentS.get(user.id) ?? new Set<string>()
    const pendingConfirmationCount = [...doneIds].filter(id => !myConfirmedIdsForNudge.has(id)).length
    const nudgeSentToday = (recentNudges ?? []).some(n => n.created_at.slice(0, 10) === today)

    const rucksack = {
      broken,
      jokerAvailable,
      jokerUsedThisSeason,
      crystalAvailable,
      crystalUsedThisSeason,
      pendingConfirmationCount,
      nudgeSentToday,
      veteranEarned: (myMilestones ?? []).some(m => m.milestone >= VETERAN_MILESTONE),
      confirmedStreak,
      totalAchievements: achievementCounts.quest + achievementCounts.guild_quest + achievementCounts.class_goal,
      guildName: guildSection?.guild.name ?? null,
      parentConfirmStreak: confirmedStreak,
      nextStepHint: quests.find(q => !q.done)?.template.title ?? null,
    }

    // ─── HELDENBUCH: stille Anerkennung + Chronik (siehe lib/heldenbuch.ts) ───
    // Mein Guide: persönliche Wahl (falls freigeschaltet) statt Guide der
    // aktuellen Klassenwelt — siehe app/actions/saveGuidePreference.ts.
    const currentThemeName = getSeasonTheme(currentSeason).name
    const preferredGuideIcon = (profile as { preferred_guide_icon?: string | null }).preferred_guide_icon ?? null
    const effectiveGuideIcon = preferredGuideIcon && isArcUnlocked(preferredGuideIcon, currentThemeName)
      ? preferredGuideIcon
      : getSeasonTheme(currentSeason).icon
    const guideNote = buildGuideNote({
      openHomeworkCount: homeworkWithStatus.filter(h => !h.done).length,
      dutyName: myDuty?.duty_name ?? null,
      dutyKeptUp: keptUpStudents.has(user.id),
      confirmedStreak,
      broken,
      questsDone: quests.filter(q => q.done).length,
      questsTotal: quests.length,
    }, effectiveGuideIcon)
    const chronicle = buildChronicle({
      milestones: myMilestones ?? [],
      shieldUses: (freezesS ?? []).filter(f => f.student_id === user.id).map(f => ({ created_at: f.created_at })),
      crystalUses: (extensionsS ?? []).filter(e => e.student_id === user.id).map(e => ({ created_at: e.created_at })),
      achievements: allMyAchievements ?? [],
      brokenNow: broken,
      today,
    })

    return (
      <StudentHome
        fullName={profile.full_name}
        userId={user.id}
        classId={activeClassId}
        allHomework={homeworkWithStatus}
        reminders={upcomingReminders}
        myViewedIds={myViewedIds}
        upcomingEvents={upcomingEvents}
        myDuty={myDuty ? { id: myDuty.id, name: myDuty.duty_name, partners: myDutyPartners, doneWeekdays: myDutyDoneWeekdays } : null}
        streak={streak}
        confirmedStreak={confirmedStreak}
        broken={broken}
        pendingMilestone={pendingMilestone}
        classGoal={classGoal}
        classGoalDone={classGoalDoneValue}
        season={currentSeason}
        quests={quests}
        questWeekStart={weekStart}
        socialProofPct={socialProofPct}
        guideNote={guideNote}
        noteGuideIcon={effectiveGuideIcon}
        preferredGuideIcon={preferredGuideIcon}
        chronicle={chronicle}
        guildSection={guildSection}
        achievementCounts={achievementCounts}
        rucksack={rucksack}
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
    // Ganzes Schuljahr kommt bereits aus dem rollenübergreifenden Batch oben
    // (homeworkAll) — keine eigene Abfrage mehr nötig. Nur befüllt, wenn ein
    // Kind zugeordnet ist (identisches Verhalten wie zuvor).
    let allHwForStreak: { id: string; due_date: string }[] = []
    if (child) {
      const { data: childCompletions } = await supabase.from('homework_completions').select('homework_id').eq('student_id', child.id)
      allHwForStreak = homeworkAll
      childDoneIds = new Set((childCompletions ?? []).map(c => c.homework_id))
    }

    const studentIdsP = (allStudents ?? []).map(s => s.id)
    const [{ data: freezesP }, { data: extensionsP }] = studentIdsP.length > 0
      ? await Promise.all([
          supabase.from('streak_freezes').select('student_id,homework_id').in('student_id', studentIdsP),
          supabase.from('homework_extensions').select('student_id,homework_id,extra_days').in('student_id', studentIdsP),
        ])
      : [{ data: [] }, { data: [] }]
    const frozenByStudentP = groupFrozenByStudent(freezesP ?? [])
    const extensionsByStudentP = new Map<string, Map<string, number>>()
    for (const e of extensionsP ?? []) {
      if (!extensionsByStudentP.has(e.student_id)) extensionsByStudentP.set(e.student_id, new Map())
      extensionsByStudentP.get(e.student_id)!.set(e.homework_id, e.extra_days)
    }

    if (child) {
      childStreak = computeStreak(childDoneIds, allHwForStreak, today, frozenByStudentP.get(child.id), extensionsByStudentP.get(child.id))
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
      ? computeStreak(confirmedByStudentP.get(child.id) ?? new Set(), allHwForStreak, today, frozenByStudentP.get(child.id), extensionsByStudentP.get(child.id))
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

    // Botenfeder (Balance-Fahrplan Phase 3): welche offenen Bestätigungen hat
    // das Kind aktiv angestupst? Bisher gab es nur die Sende-Seite — hier die
    // fehlende Konsumseite fürs Eltern-Dashboard. Parallel dazu: heutige +
    // kommende Abwesenheiten des Kindes für die Anwesenheits-Startkarte.
    const [{ data: childNudges }, { data: childAbsencesRaw }] = child
      ? await Promise.all([
          supabase.from('parent_nudges').select('homework_id').eq('student_id', child.id),
          supabase.from('attendance' as never)
            .select('id,date,status,source,confirmed_at')
            .eq('student_id', child.id)
            .gte('date', today)
            .order('date')
            .limit(5) as unknown as Promise<{ data: { id: string; date: string; status: 'entschuldigt' | 'unentschuldigt'; source: 'teacher' | 'parent'; confirmed_at: string | null }[] | null }>,
        ])
      : [{ data: [] }, { data: [] }]
    const childUpcomingAbsences = childAbsencesRaw ?? []
    const nudgedHomeworkIds = new Set((childNudges ?? []).map(n => n.homework_id))

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
        nudgedHomeworkIds={nudgedHomeworkIds}
        childUpcomingAbsences={childUpcomingAbsences}
        today={today}
        classGoal={classGoal}
        classGoalDone={countClassGoalDone(allHwForStreak, allCompletionsParent ?? [])}
      />
    )
  }

  redirect('/login')
}
