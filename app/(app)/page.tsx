import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveAuth } from '@/lib/previewAuth'
import { matchChild } from '@/lib/auth'
import { todayISO, getMondayOfWeek } from '@/lib/date'
import { computeStreak, currentMilestone } from '@/lib/streak'
import TeacherHome from '@/components/home/TeacherHome'
import StudentHome from '@/components/home/StudentHome'
import ParentHome from '@/components/home/ParentHome'
import type { HomeworkWithStatus, Reminder, Duty } from '@/lib/types'

export default async function HomePage() {
  const { user, profile } = await getEffectiveAuth()
  if (!user?.id) redirect('/login')

  if (!profile || !profile.class_id) {
    return <div className="text-kh-muted text-center py-20">Dein Profil ist noch nicht vollständig konfiguriert.</div>
  }

  const supabase = await createClient()
  const { data: klass } = await supabase.from('classes').select('*').eq('id', profile.class_id).single()

  const today = todayISO()
  const weekStart = getMondayOfWeek()

  const [
    { data: homeworkRaw },
    { data: remindersArr },
    { data: weekDuties },
    { data: weekTodos },
  ] = await Promise.all([
    supabase.from('homework').select('*').eq('class_id', profile.class_id).gte('due_date', today).order('due_date'),
    supabase.from('reminders').select('*').eq('class_id', profile.class_id).gte('event_date', today).order('event_date').limit(8),
    supabase.from('duties').select('*').eq('class_id', profile.class_id).eq('week_start', weekStart),
    supabase.from('todos').select('id').eq('class_id', profile.class_id).eq('week_start', weekStart),
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
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('class_id', profile.class_id).eq('role', 'student'),
      supabase.from('homework_completions').select('homework_id', { count: 'exact', head: true }).in('homework_id', homework.map(h => h.id)),
      supabase.from('profiles').select('id,full_name,avatar_color,avatar_seed,avatar_hair_color,avatar_skin_color').eq('class_id', profile.class_id).eq('role', 'student'),
      todoIds.length > 0
        ? supabase.from('todo_completions').select('todo_id').in('todo_id', todoIds)
        : Promise.resolve({ data: [] }),
      supabase.from('homework').select('id,due_date').eq('class_id', profile.class_id).order('due_date', { ascending: false }),
    ])

    const allHwIds = (allHwForStreaks ?? []).map(h => h.id)
    const studentIds = (allStudents ?? []).map(s => s.id)
    const [{ data: allCompletions }, { data: confirmations }] = await Promise.all([
      allHwIds.length > 0
        ? supabase.from('homework_completions').select('homework_id,student_id').in('homework_id', allHwIds)
        : Promise.resolve({ data: [] }),
      studentIds.length > 0
        ? supabase.from('streak_confirmations').select('student_id').in('student_id', studentIds)
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
    const todoDone = new Set((todoCounts ?? []).map((c: { todo_id: string }) => c.todo_id)).size

    const confirmedStudentIds = new Set((confirmations ?? []).map(c => c.student_id))
    const doneByStudent = new Map<string, Set<string>>()
    for (const c of allCompletions ?? []) {
      if (!doneByStudent.has(c.student_id)) doneByStudent.set(c.student_id, new Set())
      doneByStudent.get(c.student_id)!.add(c.homework_id)
    }
    const streakEntries = students
      .map(s => ({
        id: s.id,
        full_name: s.full_name,
        avatar_color: s.avatar_color ?? '#0F8A82',
        avatar_seed: s.avatar_seed ?? null,
        avatar_hair_color: s.avatar_hair_color ?? null,
        avatar_skin_color: s.avatar_skin_color ?? null,
        streak: computeStreak(doneByStudent.get(s.id) ?? new Set(), allHwForStreaks ?? [], today),
      }))
      .filter(e => e.streak > 0 && confirmedStudentIds.has(e.id))
      .sort((a, b) => b.streak - a.streak)

    return (
      <TeacherHome
        fullName={profile.full_name}
        userId={user.id}
        classId={profile.class_id}
        klass={klass}
        homeworkList={homework}
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
      supabase.from('homework').select('id,due_date').eq('class_id', profile.class_id).order('due_date', { ascending: false }),
      supabase.from('profiles').select('id,full_name,avatar_color,avatar_seed,avatar_hair_color,avatar_skin_color').eq('class_id', profile.class_id).eq('role', 'student'),
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

    let myDutyPartners: string[] = []
    if (myDuty) {
      const { data: partners } = await supabase
        .from('profiles').select('id,full_name').in('id', myDuty.assignee_ids.filter((id: string) => id !== user.id))
      myDutyPartners = (partners ?? []).map(p => p.full_name.split(' ')[0])
    }

    // Streak leaderboard for all students
    const allHwIds = (allHwForStreak ?? []).map(h => h.id)
    const studentIdsS = (allStudents ?? []).map(s => s.id)
    const [{ data: allCompletionsStudent }, { data: confirmationsS }] = await Promise.all([
      allHwIds.length > 0
        ? supabase.from('homework_completions').select('homework_id,student_id').in('homework_id', allHwIds)
        : Promise.resolve({ data: [] }),
      studentIdsS.length > 0
        ? supabase.from('streak_confirmations').select('student_id').in('student_id', studentIdsS)
        : Promise.resolve({ data: [] }),
    ])
    const confirmedStudentIdsS = new Set((confirmationsS ?? []).map(c => c.student_id))
    const doneByStudentS = new Map<string, Set<string>>()
    for (const c of allCompletionsStudent ?? []) {
      if (!doneByStudentS.has(c.student_id)) doneByStudentS.set(c.student_id, new Set())
      doneByStudentS.get(c.student_id)!.add(c.homework_id)
    }
    const streakEntries = (allStudents ?? [])
      .map(s => ({
        id: s.id, full_name: s.full_name, avatar_color: s.avatar_color ?? '#0F8A82', avatar_seed: s.avatar_seed ?? null,
        avatar_hair_color: s.avatar_hair_color ?? null, avatar_skin_color: s.avatar_skin_color ?? null,
        streak: computeStreak(doneByStudentS.get(s.id) ?? new Set(), allHwForStreak ?? [], today),
      }))
      .filter(e => e.streak > 0 && confirmedStudentIdsS.has(e.id))
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
      .from('profiles').select('*').eq('class_id', profile.class_id).eq('role', 'student')
    const child = matchChild(profile.full_name, allStudents ?? [])
      ?? allStudents?.[0] // preview fallback: use first student

    let childDoneIds = new Set<string>()
    let childStreak = 0
    let pendingMilestone: number | null = null
    let allHwForStreak: { id: string; due_date: string }[] = []
    if (child) {
      const [{ data: childCompletions }, { data: hwForStreak }] = await Promise.all([
        supabase.from('homework_completions').select('homework_id').eq('student_id', child.id),
        supabase.from('homework').select('id,due_date').eq('class_id', profile.class_id).order('due_date', { ascending: false }),
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
        ? supabase.from('streak_confirmations').select('student_id').in('student_id', studentIdsP)
        : Promise.resolve({ data: [] }),
    ])
    const confirmedStudentIdsP = new Set((confirmationsP ?? []).map(c => c.student_id))
    const doneByStudentP = new Map<string, Set<string>>()
    for (const c of allCompletionsParent ?? []) {
      if (!doneByStudentP.has(c.student_id)) doneByStudentP.set(c.student_id, new Set())
      doneByStudentP.get(c.student_id)!.add(c.homework_id)
    }
    const parentStreakEntries = (allStudents ?? [])
      .map(s => ({
        id: s.id, full_name: s.full_name, avatar_color: s.avatar_color ?? '#0F8A82', avatar_seed: s.avatar_seed ?? null,
        avatar_hair_color: s.avatar_hair_color ?? null, avatar_skin_color: s.avatar_skin_color ?? null,
        streak: computeStreak(doneByStudentP.get(s.id) ?? new Set(), allHwForStreak, today),
      }))
      .filter(e => e.streak > 0 && confirmedStudentIdsP.has(e.id))
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
