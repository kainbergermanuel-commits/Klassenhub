import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveAuth } from '@/lib/previewAuth'
import { matchChild, getClass } from '@/lib/auth'
import { todayISO, getRelevantMondayOfWeek, getMondayOfWeek, schoolYearStartISO, addDaysISO, localDateOf, todayLocal, getWeekNumber } from '@/lib/date'
import { computeStreak, currentMilestone, findBreakingHomework, freezeWouldHelp, crystalWouldHelp, groupFrozenByStudent, VETERAN_MILESTONE, MILESTONES } from '@/lib/streak'
import { countClassGoalDone, suggestGoalTarget } from '@/lib/classGoal'
import { defaultWeeklyTemplateKeys, computeQuestProgress, type QuestResult } from '@/lib/quests'
import { buildQuestContext, buildFeasibility } from '@/lib/questContext'
import { findQuestTemplate } from '@/lib/questVault'
import { assignGuilds, findMyGuild, weeklyGuildQuestKey, findGuildQuestTemplate, computeGuildQuestProgress, type Guild, type GuildQuestResult } from '@/lib/guilds'
import type { GuildMember } from '@/lib/guilds'
import { buildDutyDone, dutyDoneWeekdays } from '@/lib/duty'
import { collectAchievements, countAchievements, type AchievementCounts } from '@/lib/achievements'
import { buildGuideNote, buildChronicle } from '@/lib/heldenbuch'
import { getSeasonTheme, isArcUnlocked, splitterFound, awakenedSignCount } from '@/lib/seasonTheme'
import { activeRiddles } from '@/lib/riddles'
import { loadSubjectsCatalog } from '@/lib/subjectsCatalog'
import TeacherHome from '@/components/home/TeacherHome'
import StudentHome from '@/components/home/StudentHome'
import ParentHome from '@/components/home/ParentHome'
import type { HomeworkWithStatus, Reminder, Duty, AgendaEvent } from '@/lib/types'

/**
 * Label des nächsten Termins fürs Statistik-Panel ("Elternabend · morgen").
 * Eine bloße Anzahl beantwortet nicht die eigentliche Frage — nämlich wann.
 */
function nextEventLabel(events: AgendaEvent[], today: string): string | null {
  const next = events[0]
  if (!next) return null
  const days = Math.round(
    (new Date(`${next.start_date}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / 86_400_000,
  )
  const when =
    days <= 0 ? 'heute'
    : days === 1 ? 'morgen'
    : days <= 13 ? `in ${days} Tagen`
    : new Date(`${next.start_date}T00:00:00`).toLocaleDateString('de-AT', { day: 'numeric', month: 'short' })
  // Zeit zuerst: in der schmalen Nav wird hinten gekürzt, und das "wann" ist
  // wichtiger als der vollständige Titel.
  return `${when} · ${next.title}`
}

/** Prozent-Anteil, gerundet, 0 bei Nenner 0 (Server-Pendant zu pctOf im Panel). */
const pctOfNum = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0)

/** Anonyme Längenverteilung der Reisen — zeigt Streuung statt Rangliste. */
function streakBuckets(streaks: number[]) {
  const ranges: { label: string; min: number; max: number }[] = [
    { label: '0', min: 0, max: 0 },
    { label: '1–3', min: 1, max: 3 },
    { label: '4–7', min: 4, max: 7 },
    { label: '8–14', min: 8, max: 14 },
    { label: '15+', min: 15, max: Infinity },
  ]
  return ranges.map(r => ({
    label: r.label,
    count: streaks.filter(s => s >= r.min && s <= r.max).length,
  }))
}

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
    supabase.from('duties').select('*').eq('class_id', activeClassId).eq('week_start', dutyWeekStart).order('id'),
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
      subjects,
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
      // Fächer-Katalog fürs "Neue Hausübung"-Modal (siehe lib/subjectsCatalog.ts).
      loadSubjectsCatalog(supabase),
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

    // ─── WOCHENRÜCKBLICK (letzte Woche, kollektiv, kein Ranking) ─────────────
    // Fenster: der Montag der letzten Woche bis Sonntag. Bewusst kollektive
    // Summen (Prinzip 1/5: Klarheit für Lehrpersonen, keine Gamifizierung).
    const lastWeekStart = addDaysISO(-7, new Date(`${dutyWeekStart}T00:00:00`))
    const lastWeekEnd = addDaysISO(-1, new Date(`${dutyWeekStart}T00:00:00`))
    const inLastWeek = (iso: string) => {
      const d = localDateOf(iso)
      return d >= lastWeekStart && d <= lastWeekEnd
    }
    const lastWeekConfirmations = (allCompletions ?? []).filter(c => {
      const at = (c as { confirmed_by_parent_at?: string | null }).confirmed_by_parent_at
      return at ? inLastWeek(at) : false
    })
    const { data: lastWeekRiddles } = await supabase
      .from('quest_riddle_solutions').select('solved_at').eq('class_id', activeClassId)
    const recapHwConfirmed = lastWeekConfirmations.length
    const recapActiveKids = new Set(lastWeekConfirmations.map(c => c.student_id)).size
    const recapRiddles = ((lastWeekRiddles ?? []) as { solved_at: string }[]).filter(r => inLastWeek(r.solved_at)).length
    const weeklyRecap = (recapHwConfirmed > 0 || recapRiddles > 0)
      ? { hwConfirmed: recapHwConfirmed, activeKids: recapActiveKids, riddlesSolved: recapRiddles }
      : null

    const students = allStudents ?? []

    const completionCountByHw = new Map<string, number>()
    for (const c of allCompletions ?? []) {
      completionCountByHw.set(c.homework_id, (completionCountByHw.get(c.homework_id) ?? 0) + 1)
    }
    const homeworkWithCounts = homework.map(h => ({ ...h, done: false, completion_count: completionCountByHw.get(h.id) ?? 0 }))

    // ─── STATISTIK-PANEL (rechte Nav der Lehrer-Startseite) ─────────────────
    // Fünf Kennzahlen "auf einen Blick" — bewusst kollektive Anteile, kein
    // Ranking (Prinzip 1/5): Reise (aktive Streaks), HÜ-Abgabequote, gesehene
    // Erinnerungen, bevorstehende Termine, Dienst-Erfüllung dieser Woche.
    const studentIds = students.map(s => s.id)
    const statsReminderIds = upcomingReminders.map(r => r.id)
    const statsDutyIds = duties.map(d => d.id)
    const [
      { data: statsFreezes },
      { data: statsExtensions },
      { data: statsReminderViews },
      { data: statsDutyCompletions },
    ] = await Promise.all([
      studentIds.length > 0
        ? supabase.from('streak_freezes').select('student_id,homework_id,created_at').in('student_id', studentIds)
        : Promise.resolve({ data: [] }),
      studentIds.length > 0
        ? supabase.from('homework_extensions').select('student_id,homework_id,extra_days,created_at').in('student_id', studentIds)
        : Promise.resolve({ data: [] }),
      statsReminderIds.length > 0
        ? supabase.from('reminder_views').select('reminder_id,student_id').in('reminder_id', statsReminderIds)
        : Promise.resolve({ data: [] }),
      statsDutyIds.length > 0
        ? supabase.from('duty_completions').select('duty_id,student_id,weekday').in('duty_id', statsDutyIds)
        : Promise.resolve({ data: [] }),
    ])

    // Reise: Anzahl Kinder mit aktivem (eltern-bestätigtem) Streak ≥ 1
    const statsFrozenByStudent = groupFrozenByStudent(statsFreezes ?? [])
    const statsExtByStudent = new Map<string, Map<string, number>>()
    for (const e of statsExtensions ?? []) {
      if (!statsExtByStudent.has(e.student_id)) statsExtByStudent.set(e.student_id, new Map())
      statsExtByStudent.get(e.student_id)!.set(e.homework_id, e.extra_days)
    }
    const statsConfirmedByStudent = new Map<string, Set<string>>()
    for (const c of allCompletions ?? []) {
      if ((c as { confirmed_by_parent_at?: string | null }).confirmed_by_parent_at) {
        if (!statsConfirmedByStudent.has(c.student_id)) statsConfirmedByStudent.set(c.student_id, new Set())
        statsConfirmedByStudent.get(c.student_id)!.add(c.homework_id)
      }
    }
    // Die einzelnen Streaks behalten wir (statt nur zu zählen) — daraus fällt
    // die anonyme Längenverteilung fürs Panel ohne weitere Abfrage ab.
    const statsStreaks = students.map(s => computeStreak(
      statsConfirmedByStudent.get(s.id) ?? new Set(),
      allHwForStreaks, today,
      statsFrozenByStudent.get(s.id), statsExtByStudent.get(s.id),
    ))
    const reiseActive = statsStreaks.filter(st => st >= 1).length
    const reiseLongest = statsStreaks.length > 0 ? Math.max(...statsStreaks) : 0

    // Erinnerungen: von allen möglichen (Kinder × bevorstehende Erinnerungen)
    // wie viele wurden gesehen. Views von Kindern zählen, die evtl. nicht mehr
    // in der Klasse sind, filtern wir gegen die aktuelle Schülerliste.
    const studentIdSet = new Set(studentIds)
    const reminderSeen = (statsReminderViews ?? []).filter(v => studentIdSet.has(v.student_id)).length
    const reminderTotal = statsReminderIds.length * studentIds.length

    // Dienste: wer diese Woche seinen Dienst durchgehend erledigt hat
    const { keptUpStudents, assignedStudents } = buildDutyDone(duties, statsDutyCompletions ?? [])

    // Verlauf: Abgabequote der letzten sechs bereits fälligen Hausübungen
    // (ältest → neuest). Beantwortet "wird es besser oder schlechter?", was
    // eine einzelne Momentaufnahme nicht kann. homeworkAll ist absteigend
    // sortiert, deshalb slice-dann-reverse.
    const pastHw = homeworkAll.filter(h => h.due_date <= today)
    const hwHistory = pastHw.slice(0, 6).reverse()
      .map(h => pctOfNum(completionCountByHw.get(h.id) ?? 0, studentCount ?? 0))
    const hwTrend = hwHistory.length >= 2
      ? hwHistory[hwHistory.length - 1] - hwHistory[hwHistory.length - 2]
      : 0

    // Offene Eltern-Bestätigungen zu bereits fälligen HÜ: abgegeben, aber die
    // Reise wächst nicht weiter, bis ein Elternteil bestätigt.
    const pastHwIds = new Set(pastHw.map(h => h.id))
    const statsUnconfirmed = (allCompletions ?? []).filter(c =>
      pastHwIds.has(c.homework_id)
      && studentIdSet.has(c.student_id)
      && !(c as { confirmed_by_parent_at?: string | null }).confirmed_by_parent_at
    ).length

    const statsHwSlots = (studentCount ?? 0) * homework.length
    const teacherStats = {
      reise: {
        active: reiseActive, total: studentCount ?? 0,
        buckets: streakBuckets(statsStreaks), longest: reiseLongest,
      },
      homework: {
        submitted: submittedCount ?? 0, slots: statsHwSlots, active: homework.length,
        history: hwHistory, trend: hwTrend,
      },
      unconfirmed: statsUnconfirmed,
      reminders: statsReminderIds.length > 0 ? { seen: reminderSeen, total: reminderTotal } : null,
      termine: { count: upcomingEvents.length, nextLabel: nextEventLabel(upcomingEvents, today) },
      dienste: statsDutyIds.length > 0 ? { done: keptUpStudents.size, assigned: assignedStudents.size } : null,
      recap: weeklyRecap,
    }

    // ─── HEUTIGE AGENDA (Header-Card über "Demnächst fällig") ────────────────
    // Eigener Unterricht + Planungs-Notizen der relevanten Woche, umschaltbar
    // Tag/Woche. Bewusst getrennt vom Statistik-Panel (keine Doppelung).
    const agendaWeekStart = getRelevantMondayOfWeek()
    const jsDay = new Date(`${today}T00:00:00`).getDay() // 0=So … 6=Sa
    const todayWeekday = jsDay === 0 ? 7 : jsDay // 1=Mo … 7=So
    const [{ data: timetableEntries }, { data: planningNotes }, { data: supervisionRows }] = await Promise.all([
      // Der EIGENE Plan der Lehrperson (quer über alle Klassen, mit Klassen-
      // Label), nicht der Klassenplan — die häufigste Frage im Alltag ist
      // "wann bin ich in welcher Klasse?". Siehe supabase/add-teacher-timetable.sql.
      supabase.from('teacher_timetable_entries' as never)
        .select('day,slot,subject,class_label').eq('teacher_id', user.id)
        .order('day').order('slot') as unknown as Promise<{ data: { day: number; slot: number; subject: string; class_label: string }[] | null }>,
      supabase.from('planning_notes' as never)
        .select('day,subject,content').eq('class_id', activeClassId)
        .eq('week_start', agendaWeekStart) as unknown as Promise<{ data: { day: number; subject: string; content: string }[] | null }>,
      // Gangaufsichten der Lehrperson (siehe supabase/add-teacher-supervisions.sql).
      // Fehlt die Tabelle noch, liefert Supabase data=null → keine Aufsichten.
      supabase.from('teacher_supervisions' as never)
        .select('day,break_slot,location').eq('teacher_id', user.id) as unknown as Promise<{ data: { day: number; break_slot: number; location: string }[] | null }>,
    ])
    const agenda = {
      title: 'Heutige Agenda',
      icon: 'today',
      entries: (timetableEntries ?? []).map(e => ({
        day: e.day, slot: e.slot, subject: e.subject, classLabel: e.class_label ?? '',
      })),
      notes: planningNotes ?? [],
      notesClassName: klass?.name ?? null,
      emptyMessage: 'Du hast noch keinen eigenen Stundenplan angelegt.',
      subjects,
      focusWeekday: todayWeekday,
      focusTabLabel: 'Heute',
      focusDateLabel: new Date(`${today}T00:00:00`).toLocaleDateString('de-AT', { weekday: 'long', day: 'numeric', month: 'long' }),
      weekStart: agendaWeekStart,
      weekLabel: `KW ${getWeekNumber(agendaWeekStart)}`,
      showPlanningLinks: true,
      supervisions: (supervisionRows ?? []).map(s => ({ day: s.day, breakSlot: s.break_slot, location: s.location ?? '' })),
    }

    return (
      <TeacherHome
        fullName={profile.full_name}
        userId={user.id}
        classId={activeClassId}
        klass={klass}
        homeworkList={homeworkWithCounts}
        reminders={upcomingReminders}
        upcomingEvents={upcomingEvents}
        recentHomework={recentHw.map(h => ({ ...h, completion_count: completionCountByHw.get(h.id) ?? 0 }))}
        attendancePendingReports={attendancePendingReports}
        absentToday={absentToday}
        students={students}
        teacherStats={teacherStats}
        agenda={agenda}
        subjects={subjects}
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
        ? supabase.from('homework_completions').select('homework_id,student_id,confirmed_by_parent_at,completed_at').in('homework_id', allHwIds)
        : Promise.resolve({ data: [] }),
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
    const { doneByDutyStudent, keptUpStudents, assignedStudents: dutyAssignedStudents } = buildDutyDone(duties, dutyCompletionsRaw ?? [])
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

    const myConfirmedForStreak = confirmedByStudentS.get(user.id) ?? new Set<string>()
    const myFrozenForStreak = frozenByStudentS.get(user.id)
    const myExtForStreak = extensionsByStudentS.get(user.id)
    const broken = findBreakingHomework(myConfirmedForStreak, allHwForStreak, today, myFrozenForStreak, myExtForStreak) !== null
    const jokerUsedThisSeason = freezeUsedThisSeasonS.has(user.id)
    // Verfügbar nur, wenn das Item die Streak hier auch wirklich rettet
    // (deckt sich mit dem Wirkungs-Guard in useStreakFreeze/useTimeCrystal).
    const jokerAvailable = freezeWouldHelp(myConfirmedForStreak, allHwForStreak, today, myFrozenForStreak, myExtForStreak) && !jokerUsedThisSeason
    const crystalUsedThisSeason = crystalUsedThisSeasonS.has(user.id)
    const crystalAvailable = crystalWouldHelp(myConfirmedForStreak, allHwForStreak, today, myFrozenForStreak, myExtForStreak) && !crystalUsedThisSeason

    // ─── RÄTSEL-QUEST (Arc-Item, siehe lib/riddles.ts) ───────────────────────
    // Eine kleine eigene Query (nur student_id, indexiert) — bewusst NICHT in
    // den großen Batch gequetscht, um den Destructure dort nicht fragil zu
    // machen. Der Gelöst-Zustand ist dauerhaft (scope=''), das Rätsel-Item
    // zeigt sich nur, solange seine Welt die aktive Klassenwelt ist.
    const { data: riddleSolves } = await supabase
      .from('quest_riddle_solutions')
      .select('riddle_key')
      .eq('student_id', user.id)
    // as-Cast, weil die neue Tabelle noch nicht in den generierten Supabase-
    // Typen steht (gleiches Muster wie andere frische Tabellen im Projekt).
    const solvedRiddleKeys = new Set((riddleSolves ?? []).map(r => (r as { riddle_key: string }).riddle_key))
    // Splitter-Rätsel (welten-übergreifend, zweistufig) erst zeigen, wenn der
    // Splitter in der Story aufgetaucht ist (ab Schatzsuche); Stufe 2 erst nach
    // Stufe 1 (siehe activeRiddles/requires in lib/riddles.ts).
    const riddleProp = activeRiddles(getSeasonTheme(currentSeason).icon, splitterFound(getSeasonTheme(currentSeason).name), solvedRiddleKeys)
      .map(r => ({ riddle: r, solved: solvedRiddleKeys.has(r.key) }))

    // ─── QUESTS (Wochen-Vorrat, siehe lib/quests.ts) ─────────────────────────
    const choiceByTemplate = new Map((myChoices ?? []).map(c => [c.template_key, c.choice_key]))

    const weekHw = allHwForStreak.filter(h => h.due_date >= weekStart && h.due_date <= weekEnd)
    const questCtx = buildQuestContext({
      weekStart,
      weekEnd,
      today,
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
    const activeQuestKeys = defaultWeeklyTemplateKeys(activeClassId, weekStart, 3, feasibility)
    const quests: QuestResult[] = activeQuestKeys
      .map(key => findQuestTemplate(key))
      .filter((t): t is NonNullable<typeof t> => !!t)
      .map(t => computeQuestProgress(t, questCtx, choiceByTemplate.get(t.key)))

    // ─── WOCHEN-PULS (kollektive + dynamische Norm statt statischer %-Norm) ───
    // Neugestaltung des früheren Social-Proof-Banners: statt eines statischen
    // deskriptiven Prozentwerts ("X % deiner Klasse …"), der bei niedrigem Stand
    // laut Norm-Forschung ins Gegenteil kippt (Bumerang-Effekt, Schultz et al.
    // 2007; Cialdini et al. 2006), zwei nicht-vergleichende Signale:
    //  • total = diese Woche GEMEINSAM erledigte HÜ (monotoner Sammel-Wert ohne
    //    Nenner → kann nie "keiner macht mit" sagen, kollektiv statt Einzel-
    //    vergleich, deckt sich mit Hebel 1/Prinzip 1).
    //  • today = heute davon dazugekommen → Momentum/dynamische Norm (Sparkman &
    //    Walton 2017: wirkt gerade dann, wenn der statische Stand niedrig ist).
    // Kleinstklassen-Riegel (>=3) bleibt vorsichtshalber, obwohl ein reiner
    // Output-Zähler ohnehin keine Einzelperson verrät.
    const weekHwIdSet = new Set(weekHw.map(h => h.id))
    const weekCompletions = (allCompletionsStudent ?? []).filter(c => weekHwIdSet.has(c.homework_id))
    const classSize = (allStudents ?? []).length
    const weekPulse = classSize >= 3
      ? {
          total: weekCompletions.length,
          today: weekCompletions.filter(c => {
            const at = (c as { completed_at?: string | null }).completed_at
            return at ? localDateOf(at) === todayLocal() : false
          }).length,
        }
      : null

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
          dutyAssignedStudents,
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
    // Ohne gesetztes Monatsziel greift ein berechneter Vorschlag, damit die
    // Erzählebene nie ausfällt (siehe lib/classGoal.ts suggestGoalTarget).
    const suggestedTarget = classGoal ? null : suggestGoalTarget(allHwForStreak, (allStudents ?? []).length, currentSeason)
    const effectiveGoal: { target: number; reward: string | null; isSuggested: boolean } | null =
      classGoal
        ? { target: classGoal.target, reward: classGoal.reward, isSuggested: false }
        : suggestedTarget !== null
          ? { target: suggestedTarget, reward: null, isSuggested: true }
          : null
    // Bewusst gegen das ECHTE Ziel, nicht gegen den Vorschlag: ein Erfolg, den
    // niemand gesetzt hat, wäre kein Erfolg.
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
    const { data: allMyAchievements } = await supabase.from('achievements').select('kind,key,period,achieved_at').eq('student_id', user.id)
    const achievementCounts = countAchievements(allMyAchievements ?? [])
    const myConfirmedIdsForNudge = confirmedByStudentS.get(user.id) ?? new Set<string>()
    const pendingConfirmationCount = [...doneIds].filter(id => !myConfirmedIdsForNudge.has(id)).length
    const nudgeSentToday = (recentNudges ?? []).some(n => localDateOf(n.created_at) === todayLocal())

    // currentThemeName wird schon hier gebraucht (Splitter-Zeichen im
    // Rucksack) und weiter unten nochmal fürs Heldenbuch/Mein Guide — eine
    // Berechnung statt zwei.
    const currentThemeName = getSeasonTheme(currentSeason).name

    // Schon gezeigte Erwerbs-Momente (siehe NewItemAnnounce) — eigene kleine
    // Query auf den Primärschlüssel, gleiches Muster wie quest_riddle_solutions
    // oben statt den großen Batch-Destructure fragiler zu machen.
    const { data: seenItems, error: seenItemsError } = await supabase
      .from('rucksack_item_seen')
      .select('item_key')
      .eq('student_id', user.id)

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
      classGoalTarget: effectiveGoal?.target ?? null,
      classGoalDone: classGoalDoneValue,
      splitterFound: splitterFound(currentThemeName),
      awakenedSignCount: awakenedSignCount(currentThemeName),
      // as-Cast, weil die neue Tabelle noch nicht in den generierten Supabase-
      // Typen steht (gleiches Muster wie andere frische Tabellen im Projekt).
      seenItemKeys: seenItemsError ? null : (seenItems ?? []).map(r => (r as { item_key: string }).item_key),
    }

    // ─── HELDENBUCH: stille Anerkennung + Chronik (siehe lib/heldenbuch.ts) ───
    // Mein Guide: persönliche Wahl (falls freigeschaltet) statt Guide der
    // aktuellen Klassenwelt — siehe app/actions/saveGuidePreference.ts.
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
        classGoal={effectiveGoal}
        classGoalDone={classGoalDoneValue}
        season={currentSeason}
        quests={quests}
        questWeekStart={weekStart}
        riddles={riddleProp}
        weekPulse={weekPulse}
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
        // completed_at kommt für die Pünktlichkeits-Kennzahl mit (gleiche Abfrage,
        // nur eine Spalte mehr).
        ? supabase.from('homework_completions').select('homework_id,student_id,confirmed_by_parent_at,completed_at').in('homework_id', allHwIdsP)
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

    // ─── AGENDA (Stundenplan des Kindes) + KIND-STATISTIK ─────────────────────
    // Eltern lesen den gepushten timetable_entries des Kindes (nicht die
    // Lehrer-Vorlage class_timetable_entries — RLS teacher-only). Fokus =
    // morgen. Zusätzlich fünf Kind-Kennzahlen + Wochenrückblick fürs Panel.
    const parentReminderIds = upcomingReminders.map(r => r.id)
    const parentDutyIds = duties.map(d => d.id)
    const [
      parentSubjects,
      { data: childTimetable },
      { data: childReminderViews },
      { data: parentDutyCompletions },
      { data: childRiddleSolves },
    ] = await Promise.all([
      loadSubjectsCatalog(supabase),
      child
        ? supabase.from('timetable_entries' as never)
            .select('day,slot,subject').eq('student_id', child.id)
            .order('day').order('slot') as unknown as Promise<{ data: { day: number; slot: number; subject: string }[] | null }>
        : Promise.resolve({ data: [] }),
      child && parentReminderIds.length > 0
        ? supabase.from('reminder_views').select('reminder_id').eq('student_id', child.id).in('reminder_id', parentReminderIds)
        : Promise.resolve({ data: [] }),
      child && parentDutyIds.length > 0
        ? supabase.from('duty_completions').select('duty_id,student_id,weekday').in('duty_id', parentDutyIds)
        : Promise.resolve({ data: [] }),
      child
        ? supabase.from('quest_riddle_solutions').select('solved_at').eq('student_id', child.id)
        : Promise.resolve({ data: [] }),
    ])

    const tomorrowDate = new Date(`${today}T00:00:00`)
    tomorrowDate.setDate(tomorrowDate.getDate() + 1)
    const tomorrowJsDay = tomorrowDate.getDay()
    const tomorrowWeekday = tomorrowJsDay === 0 ? 7 : tomorrowJsDay
    const parentWeekStart = getMondayOfWeek(tomorrowDate)
    const parentAgenda = {
      title: 'Stundenplan',
      icon: 'calendar_view_week',
      entries: childTimetable ?? [],
      notes: [] as { day: number; subject: string; content: string }[],
      subjects: parentSubjects,
      focusWeekday: tomorrowWeekday,
      focusTabLabel: 'Morgen',
      focusDateLabel: tomorrowDate.toLocaleDateString('de-AT', { weekday: 'long', day: 'numeric', month: 'long' }),
      weekStart: parentWeekStart,
      weekLabel: `KW ${getWeekNumber(parentWeekStart)}`,
      showPlanningLinks: false,
    }

    const nextMilestone = MILESTONES.find(m => m > childConfirmedStreak) ?? MILESTONES[MILESTONES.length - 1]
    const { keptUpStudents: parentKeptUp, assignedStudents: parentAssigned } = buildDutyDone(duties, parentDutyCompletions ?? [])
    const childHasDuty = child ? parentAssigned.has(child.id) : false

    const lastWeekStartP = addDaysISO(-7, new Date(`${dutyWeekStart}T00:00:00`))
    const lastWeekEndP = addDaysISO(-1, new Date(`${dutyWeekStart}T00:00:00`))
    const inLastWeekP = (iso: string) => { const d = localDateOf(iso); return d >= lastWeekStartP && d <= lastWeekEndP }
    const childLastWeekConfirmed = (allCompletionsParent ?? []).filter(c =>
      c.student_id === child?.id && (c as { confirmed_by_parent_at?: string | null }).confirmed_by_parent_at
      && inLastWeekP((c as { confirmed_by_parent_at: string }).confirmed_by_parent_at)
    ).length
    const childLastWeekRiddles = ((childRiddleSolves ?? []) as { solved_at: string }[]).filter(r => inLastWeekP(r.solved_at)).length
    const childRecap = (childLastWeekConfirmed > 0 || childLastWeekRiddles > 0)
      ? { hwConfirmed: childLastWeekConfirmed, riddlesSolved: childLastWeekRiddles }
      : null

    // Pünktlichkeit: wie oft war die HÜ schon vor dem Abgabetag erledigt.
    // Bewusst ein Vergleich des Kindes mit sich selbst, nicht mit der Klasse.
    const dueDateByHw = new Map(allHwForStreak.map(h => [h.id, h.due_date]))
    const childCompletions = (allCompletionsParent ?? []).filter(c => c.student_id === child?.id)
    const childOnTime = childCompletions.filter(c => {
      const due = dueDateByHw.get(c.homework_id)
      const at = (c as { completed_at?: string | null }).completed_at
      return due && at ? localDateOf(at) <= due : false
    }).length

    const childStats = {
      reise: { streak: childConfirmedStreak, nextMilestone, milestones: [...MILESTONES] },
      homework: { done: childHwWithStatus.filter(h => h.done).length, total: childHwWithStatus.length },
      pending: pendingConfirmations.length,
      punctual: childCompletions.length > 0
        ? { onTime: childOnTime, total: childCompletions.length }
        : null,
      reminders: parentReminderIds.length > 0 ? { seen: (childReminderViews ?? []).length, total: parentReminderIds.length } : null,
      termine: { count: upcomingEvents.length, nextLabel: nextEventLabel(upcomingEvents, today) },
      dienst: childHasDuty ? { keptUp: parentKeptUp.has(child!.id) } : null,
      recap: childRecap,
    }

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
        agenda={parentAgenda}
        childStats={childStats}
      />
    )
  }

  redirect('/login')
}
