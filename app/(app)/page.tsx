import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveAuth } from '@/lib/previewAuth'
import { matchChild, getClass } from '@/lib/auth'
import { todayISO, getRelevantMondayOfWeek, schoolYearStartISO } from '@/lib/date'
import { computeStreak, currentMilestone } from '@/lib/streak'
import TeacherHome from '@/components/home/TeacherHome'
import StudentHome from '@/components/home/StudentHome'
import ParentHome from '@/components/home/ParentHome'
import type { HomeworkWithStatus, Reminder, Duty } from '@/lib/types'

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

  const [
    { data: homeworkRaw },
    { data: remindersArr },
    { data: weekDuties },
  ] = await Promise.all([
    supabase.from('homework').select('*').eq('class_id', activeClassId).gt('due_date', today).order('due_date'),
    supabase.from('reminders').select('*').eq('class_id', activeClassId).gte('event_date', today).order('event_date').limit(8),
    supabase.from('duties').select('*').eq('class_id', activeClassId).eq('week_start', dutyWeekStart),
  ])

  const homework = homeworkRaw ?? []
  const upcomingReminders: Reminder[] = remindersArr ?? []
  const duties: Duty[] = weekDuties ?? []

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
    const confirmedByStudent = new Map<string, Set<string>>()
    for (const c of allCompletions ?? []) {
      if (!doneByStudent.has(c.student_id)) doneByStudent.set(c.student_id, new Set())
      doneByStudent.get(c.student_id)!.add(c.homework_id)
      if ((c as any).confirmed_by_parent_at) {
        if (!confirmedByStudent.has(c.student_id)) confirmedByStudent.set(c.student_id, new Set())
        confirmedByStudent.get(c.student_id)!.add(c.homework_id)
      }
    }
    // Leaderboard zeigt ausschließlich eltern-bestätigte Streaks; Flammen leiten
    // sich direkt aus dieser Zahl ab (Live-Spiegel).
    const streakEntries = students
      .map(s => ({
        id: s.id,
        full_name: s.full_name,
        avatar_color: s.avatar_color ?? '#0F8A82',
        avatar_seed: s.avatar_seed ?? null,
        avatar_hair_color: s.avatar_hair_color ?? null,
        avatar_skin_color: s.avatar_skin_color ?? null,
        streak: computeStreak(confirmedByStudent.get(s.id) ?? new Set(), allHwForStreaks ?? [], today),
      }))
      .filter(e => e.streak > 0)
      .sort((a, b) => b.streak - a.streak)

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
        streakEntries={streakEntries}
        recentHomework={(recentHw ?? []).map(h => ({ ...h, completion_count: completionCountByHw.get(h.id) ?? 0 }))}
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
      supabase.from('homework_completions').select('homework_id').eq('student_id', user.id),
      supabase.from('homework').select('id,due_date').eq('class_id', activeClassId).gte('due_date', schoolYearStart).order('due_date', { ascending: false }),
      supabase.from('profiles').select('id,full_name,avatar_color,avatar_seed,avatar_hair_color,avatar_skin_color').eq('class_id', activeClassId).eq('role', 'student'),
    ])

    const doneIds = new Set((completions ?? []).map(c => c.homework_id))
    const homeworkWithStatus: HomeworkWithStatus[] = homework.map(h => ({ ...h, done: doneIds.has(h.id) }))
    const hwOpenCount = homeworkWithStatus.filter(h => !h.done).length

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
    const streak = computeStreak(doneIds, allHwForStreak ?? [], today)

    let myDutyPartners: { full_name: string; avatar_color: string; avatar_seed: string | null; avatar_hair_color: string | null; avatar_skin_color: string | null }[] = []
    if (myDuty) {
      const { data: partners } = await supabase
        .from('profiles').select('id,full_name,avatar_color,avatar_seed,avatar_hair_color,avatar_skin_color')
        .in('id', myDuty.assignee_ids.filter((id: string) => id !== user.id))
      myDutyPartners = (partners ?? []).map(p => ({
        full_name: p.full_name,
        avatar_color: p.avatar_color ?? '#0F8A82',
        avatar_seed: p.avatar_seed ?? null,
        avatar_hair_color: p.avatar_hair_color ?? null,
        avatar_skin_color: p.avatar_skin_color ?? null,
      }))
    }

    // Streak leaderboard for all students (nur eltern-bestätigte Streaks)
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
    const streakEntries = (allStudents ?? [])
      .map(s => ({
        id: s.id, full_name: s.full_name, avatar_color: s.avatar_color ?? '#0F8A82', avatar_seed: s.avatar_seed ?? null,
        avatar_hair_color: s.avatar_hair_color ?? null, avatar_skin_color: s.avatar_skin_color ?? null,
        streak: computeStreak(confirmedByStudentS.get(s.id) ?? new Set(), allHwForStreak ?? [], today),
      }))
      .filter(e => e.streak > 0)
      .sort((a, b) => b.streak - a.streak)

    // Eigener bestätigter Streak → verdient die Flammen. Pending = eigener (actual)
    // Meilenstein liegt über dem bereits bestätigten ⇒ "warte auf Eltern".
    const confirmedStreak = computeStreak(confirmedByStudentS.get(user.id) ?? new Set(), allHwForStreak ?? [], today)
    const actualMs = currentMilestone(streak)
    const pendingMilestone = streak >= 5 && actualMs > currentMilestone(confirmedStreak) ? actualMs : null

    return (
      <StudentHome
        fullName={profile.full_name}
        userId={user.id}
        allHomework={homeworkWithStatus}
        hwOpenCount={hwOpenCount}
        hwTotal={homeworkWithStatus.length}
        reminders={upcomingReminders}
        myViewedIds={myViewedIds}
        myDuty={myDuty ? { name: myDuty.duty_name, partners: myDutyPartners } : null}
        streak={streak}
        confirmedStreak={confirmedStreak}
        pendingMilestone={pendingMilestone}
        streakEntries={streakEntries}
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
      childStreak = computeStreak(childDoneIds, allHwForStreak, today)
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
    const parentStreakEntries = (allStudents ?? [])
      .map(s => ({
        id: s.id, full_name: s.full_name, avatar_color: s.avatar_color ?? '#0F8A82', avatar_seed: s.avatar_seed ?? null,
        avatar_hair_color: s.avatar_hair_color ?? null, avatar_skin_color: s.avatar_skin_color ?? null,
        streak: computeStreak(confirmedByStudentP.get(s.id) ?? new Set(), allHwForStreak, today),
      }))
      .filter(e => e.streak > 0)
      .sort((a, b) => b.streak - a.streak)

    // Eltern-bestätigter Streak des Kindes → verdient die Flammen (Live-Spiegel)
    const childConfirmedStreak = child
      ? computeStreak(confirmedByStudentP.get(child.id) ?? new Set(), allHwForStreak, today)
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
        childStreak={childStreak}
        childConfirmedStreak={childConfirmedStreak}
        pendingConfirmations={pendingConfirmations}
        streakEntries={parentStreakEntries}
      />
    )
  }

  redirect('/login')
}
