import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveAuth } from '@/lib/previewAuth'
import { matchChild, getClass } from '@/lib/auth'
import { todayISO, getMondayOfWeek, getRelevantMondayOfWeek, schoolYearStartISO } from '@/lib/date'
import { computeStreak, currentMilestone, confirmedStreak } from '@/lib/streak'
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
  const weekStart = getMondayOfWeek()
  const dutyWeekStart = getRelevantMondayOfWeek()
  const schoolYearStart = schoolYearStartISO()

  const [
    { data: homeworkRaw },
    { data: remindersArr },
    { data: weekDuties },
    { data: weekTodos },
  ] = await Promise.all([
    supabase.from('homework').select('*').eq('class_id', activeClassId).gte('due_date', today).order('due_date'),
    supabase.from('reminders').select('*').eq('class_id', activeClassId).gte('event_date', today).order('event_date').limit(8),
    supabase.from('duties').select('*').eq('class_id', activeClassId).eq('week_start', dutyWeekStart),
    supabase.from('todos').select('id').eq('class_id', activeClassId).eq('week_start', weekStart),
  ])

  const homework = homeworkRaw ?? []
  const upcomingReminders: Reminder[] = remindersArr ?? []
  const duties: Duty[] = weekDuties ?? []
  const todoIds = (weekTodos ?? []).map(t => t.id)

  // ─── TEACHER ────────────────────────────────────────────────────────────────
  if (profile.role === 'teacher') {
    const [
      { count: studentCount },
      { count: submittedCount },
      { data: allStudents },
      { data: todoCounts },
      { data: allHwForStreaks },
    ] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('class_id', activeClassId).eq('role', 'student'),
      supabase.from('homework_completions').select('homework_id', { count: 'exact', head: true }).in('homework_id', homework.map(h => h.id)),
      supabase.from('profiles').select('id,full_name,avatar_color,avatar_seed,avatar_hair_color,avatar_skin_color').eq('class_id', activeClassId).eq('role', 'student'),
      todoIds.length > 0
        ? supabase.from('todo_completions').select('todo_id,student_id').in('todo_id', todoIds)
        : Promise.resolve({ data: [] }),
      supabase.from('homework').select('id,due_date').eq('class_id', activeClassId).gte('due_date', schoolYearStart).order('due_date', { ascending: false }),
    ])

    const allHwIds = (allHwForStreaks ?? []).map(h => h.id)
    const studentIds = (allStudents ?? []).map(s => s.id)
    const [{ data: allCompletions }, { data: confirmations }] = await Promise.all([
      allHwIds.length > 0
        ? supabase.from('homework_completions').select('homework_id,student_id').in('homework_id', allHwIds)
        : Promise.resolve({ data: [] }),
      studentIds.length > 0
        ? supabase.from('streak_confirmations').select('student_id,milestone').in('student_id', studentIds)
        : Promise.resolve({ data: [] }),
    ])

    const students = allStudents ?? []
    const studentById = Object.fromEntries(students.map(s => [s.id, s]))
    const studentMap = Object.fromEntries(students.map(s => [s.id, s.full_name.split(' ')[0]]))
    const dutyLines = duties.map(d => {
      const names = d.assignee_ids.map((id: string) => studentMap[id] ?? '?').join(', ')
      return `${d.duty_name}: ${names}`
    })
    const dutyStudentIds = [...new Set(duties.flatMap(d => d.assignee_ids))]
    const dutyStudents = dutyStudentIds.map(id => studentById[id]).filter(Boolean)
    const todoDone = (todoCounts ?? []).length // alle Completions (nicht nur unique todo_ids)

    const allConfirmations = (confirmations ?? []) as { student_id: string; milestone: number }[]
    const doneByStudent = new Map<string, Set<string>>()
    for (const c of allCompletions ?? []) {
      if (!doneByStudent.has(c.student_id)) doneByStudent.set(c.student_id, new Set())
      doneByStudent.get(c.student_id)!.add(c.homework_id)
    }
    const streakEntries = students
      .map(s => {
        const cs = confirmedStreak(s.id, allConfirmations)
        return {
          id: s.id,
          full_name: s.full_name,
          avatar_color: s.avatar_color ?? '#0F8A82',
          avatar_seed: s.avatar_seed ?? null,
          avatar_hair_color: s.avatar_hair_color ?? null,
          avatar_skin_color: s.avatar_skin_color ?? null,
          streak: cs,
        }
      })
      .filter(e => e.streak > 0)
      .sort((a, b) => b.streak - a.streak)

    const completionCountByHw = new Map<string, number>()
    for (const c of allCompletions ?? []) {
      completionCountByHw.set(c.homework_id, (completionCountByHw.get(c.homework_id) ?? 0) + 1)
    }
    const homeworkWithCounts = homework.map(h => ({ ...h, done: false, completion_count: completionCountByHw.get(h.id) ?? 0 }))

    return (
      <TeacherHome
        fullName={profile.full_name}
        userId={user.id}
        classId={activeClassId}
        klass={klass}
        homeworkList={homeworkWithCounts}
        hwSubmittedCount={submittedCount ?? 0}
        studentCount={studentCount ?? 0}
        students={students}
        reminders={upcomingReminders}
        dutyLines={dutyLines}
        dutyStudents={dutyStudents}
        todoTotal={todoIds.length}
        todoDone={todoDone}
        streakEntries={streakEntries}
      />
    )
  }

  // ─── STUDENT ────────────────────────────────────────────────────────────────
  if (profile.role === 'student') {
    const [
      { data: completions },
      { data: todoCompletions },
      { data: allHwForStreak },
      { data: allStudents },
    ] = await Promise.all([
      supabase.from('homework_completions').select('homework_id').eq('student_id', user.id),
      todoIds.length > 0
        ? supabase.from('todo_completions').select('todo_id').eq('student_id', user.id).in('todo_id', todoIds)
        : Promise.resolve({ data: [] }),
      supabase.from('homework').select('id,due_date').eq('class_id', activeClassId).gte('due_date', schoolYearStart).order('due_date', { ascending: false }),
      supabase.from('profiles').select('id,full_name,avatar_color,avatar_seed,avatar_hair_color,avatar_skin_color').eq('class_id', activeClassId).eq('role', 'student'),
    ])

    const doneIds = new Set((completions ?? []).map(c => c.homework_id))
    const homeworkWithStatus: HomeworkWithStatus[] = homework.map(h => ({ ...h, done: doneIds.has(h.id) }))
    const hwOpenCount = homeworkWithStatus.filter(h => !h.done).length
    const todoDoneCount = (todoCompletions ?? []).length

    const reminderIds = upcomingReminders.map(r => r.id)
    const myViewedIds: string[] = []
    if (reminderIds.length > 0) {
      const { data: myViews } = await supabase
        .from('reminder_views').select('reminder_id')
        .eq('student_id', user.id).in('reminder_id', reminderIds)
      myViewedIds.push(...(myViews ?? []).map(v => v.reminder_id))
    }
    const myDuty = duties.find(d => d.assignee_ids.includes(user.id)) ?? null

    const streak = computeStreak(doneIds, allHwForStreak ?? [], today)
    let pendingMilestone: number | null = null
    if (streak >= 5) {
      const ms = currentMilestone(streak)
      const { data: confirmation } = await supabase
        .from('streak_confirmations').select('milestone')
        .eq('student_id', user.id).eq('milestone', ms).maybeSingle()
      if (!confirmation) pendingMilestone = ms
    }

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

    // Streak leaderboard for all students
    const allHwIds = (allHwForStreak ?? []).map(h => h.id)
    const studentIdsS = (allStudents ?? []).map(s => s.id)
    const [{ data: allCompletionsStudent }, { data: confirmationsS }] = await Promise.all([
      allHwIds.length > 0
        ? supabase.from('homework_completions').select('homework_id,student_id').in('homework_id', allHwIds)
        : Promise.resolve({ data: [] }),
      studentIdsS.length > 0
        ? supabase.from('streak_confirmations').select('student_id,milestone').in('student_id', studentIdsS)
        : Promise.resolve({ data: [] }),
    ])
    const allConfirmationsS = (confirmationsS ?? []) as { student_id: string; milestone: number }[]
    const doneByStudentS = new Map<string, Set<string>>()
    for (const c of allCompletionsStudent ?? []) {
      if (!doneByStudentS.has(c.student_id)) doneByStudentS.set(c.student_id, new Set())
      doneByStudentS.get(c.student_id)!.add(c.homework_id)
    }
    const streakEntries = (allStudents ?? [])
      .map(s => ({
        id: s.id, full_name: s.full_name, avatar_color: s.avatar_color ?? '#0F8A82', avatar_seed: s.avatar_seed ?? null,
        avatar_hair_color: s.avatar_hair_color ?? null, avatar_skin_color: s.avatar_skin_color ?? null,
        streak: confirmedStreak(s.id, allConfirmationsS),
      }))
      .filter(e => e.streak > 0)
      .sort((a, b) => b.streak - a.streak)

    return (
      <StudentHome
        fullName={profile.full_name}
        userId={user.id}
        allHomework={homeworkWithStatus}
        hwOpenCount={hwOpenCount}
        hwTotal={homeworkWithStatus.length}
        reminders={upcomingReminders}
        myViewedIds={myViewedIds}
        todoTotal={todoIds.length}
        todoDone={todoDoneCount}
        myDuty={myDuty ? { name: myDuty.duty_name, partners: myDutyPartners } : null}
        streak={streak}
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
    let childStreak = 0
    let pendingMilestone: number | null = null
    let allHwForStreak: { id: string; due_date: string }[] = []
    if (child) {
      const [{ data: childCompletions }, { data: hwForStreak }] = await Promise.all([
        supabase.from('homework_completions').select('homework_id').eq('student_id', child.id),
        supabase.from('homework').select('id,due_date').eq('class_id', activeClassId).gte('due_date', schoolYearStart).order('due_date', { ascending: false }),
      ])
      allHwForStreak = hwForStreak ?? []
      childDoneIds = new Set((childCompletions ?? []).map(c => c.homework_id))
      childStreak = computeStreak(childDoneIds, allHwForStreak, today)
      if (childStreak >= 5) {
        const ms = currentMilestone(childStreak)
        const { data: confirmation } = await supabase
          .from('streak_confirmations').select('milestone')
          .eq('student_id', child.id).eq('milestone', ms).maybeSingle()
        if (!confirmation) pendingMilestone = ms
      }
    }

    // Streak leaderboard
    const allHwIdsP = allHwForStreak.map(h => h.id)
    const studentIdsP = (allStudents ?? []).map(s => s.id)
    const [{ data: allCompletionsParent }, { data: confirmationsP }] = await Promise.all([
      allHwIdsP.length > 0
        ? supabase.from('homework_completions').select('homework_id,student_id').in('homework_id', allHwIdsP)
        : Promise.resolve({ data: [] }),
      studentIdsP.length > 0
        ? supabase.from('streak_confirmations').select('student_id,milestone').in('student_id', studentIdsP)
        : Promise.resolve({ data: [] }),
    ])
    const allConfirmationsP = (confirmationsP ?? []) as { student_id: string; milestone: number }[]
    const doneByStudentP = new Map<string, Set<string>>()
    for (const c of allCompletionsParent ?? []) {
      if (!doneByStudentP.has(c.student_id)) doneByStudentP.set(c.student_id, new Set())
      doneByStudentP.get(c.student_id)!.add(c.homework_id)
    }
    const parentStreakEntries = (allStudents ?? [])
      .map(s => ({
        id: s.id, full_name: s.full_name, avatar_color: s.avatar_color ?? '#0F8A82', avatar_seed: s.avatar_seed ?? null,
        avatar_hair_color: s.avatar_hair_color ?? null, avatar_skin_color: s.avatar_skin_color ?? null,
        streak: confirmedStreak(s.id, allConfirmationsP),
      }))
      .filter(e => e.streak > 0)
      .sort((a, b) => b.streak - a.streak)
    const childHwWithStatus: HomeworkWithStatus[] = homework.map(h => ({ ...h, done: childDoneIds.has(h.id) }))
    const todoDoneCount = todoIds.length > 0 && child
      ? (await supabase.from('todo_completions').select('todo_id', { count: 'exact', head: true }).eq('student_id', child.id).in('todo_id', todoIds)).count ?? 0
      : 0

    return (
      <ParentHome
        fullName={profile.full_name}
        parentId={user.id}
        childId={child?.id ?? ''}
        childName={child?.full_name ?? 'Kind'}
        childColor={child?.avatar_color ?? '#0F8A82'}
        childSeed={child?.avatar_seed ?? null}
        childHairColor={child?.avatar_hair_color ?? null}
        childSkinColor={child?.avatar_skin_color ?? null}
        className={klass?.name ?? ''}
        childHomework={childHwWithStatus}
        reminders={upcomingReminders}
        todoTotal={todoIds.length}
        todoDone={todoDoneCount}
        childStreak={childStreak}
        pendingMilestone={pendingMilestone}
        streakEntries={parentStreakEntries}
      />
    )
  }

  redirect('/login')
}
