import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveAuth } from '@/lib/previewAuth'
import { matchChild } from '@/lib/auth'
import HomeworkList from '@/components/homework/HomeworkList'
import AnimateIn from '@/components/ui/AnimateIn'
import type { HomeworkWithStatus } from '@/lib/types'

export default async function HomeworkPage() {
  const { user, profile, activeClassId } = await getEffectiveAuth()
  if (!user) redirect('/login')
  if (!activeClassId) redirect('/')

  const supabase = await createClient()

  const { data: homeworkRaw } = await supabase
    .from('homework')
    .select('*')
    .eq('class_id', activeClassId)
    .order('due_date', { ascending: true })

  const homework = homeworkRaw ?? []

  let homeworkWithStatus: HomeworkWithStatus[]

  if (profile.role === 'student') {
    const { data: completions } = await supabase
      .from('homework_completions')
      .select('homework_id')
      .eq('student_id', user.id)

    const doneIds = new Set((completions ?? []).map(c => c.homework_id))
    homeworkWithStatus = homework.map(h => ({ ...h, done: doneIds.has(h.id) }))
  } else if (profile.role === 'teacher') {
    // Get completion counts per homework
    const { data: counts } = await supabase
      .from('homework_completions')
      .select('homework_id')
      .in('homework_id', homework.map(h => h.id))

    const countMap: Record<string, number> = {}
    for (const c of counts ?? []) {
      countMap[c.homework_id] = (countMap[c.homework_id] ?? 0) + 1
    }
    homeworkWithStatus = homework.map(h => ({ ...h, done: false, completion_count: countMap[h.id] ?? 0 }))
  } else {
    // parent: show child's completions
    const { data: allStudents } = await supabase
      .from('profiles').select('id,full_name').eq('class_id', activeClassId).eq('role', 'student')
    const child = matchChild(profile, allStudents ?? [])
    const childDoneIds = new Set<string>()
    if (child) {
      const { data: childCompletions } = await supabase
        .from('homework_completions').select('homework_id').eq('student_id', child.id)
      for (const c of childCompletions ?? []) childDoneIds.add(c.homework_id)
    }
    homeworkWithStatus = homework.map(h => ({ ...h, done: childDoneIds.has(h.id) }))
  }

  const today = new Date().toISOString().slice(0, 10)
  const doneCount = homeworkWithStatus.filter(h => h.done).length
  const openCount = homeworkWithStatus.filter(h => !h.done && h.due_date > today).length
  const missedCount = homeworkWithStatus.filter(h => !h.done && h.due_date <= today).length

  const { count: studentCount } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('class_id', activeClassId)
    .eq('role', 'student')

  const subtitle =
    profile.role === 'teacher'
      ? `${homework.length} Aufgaben · ${homeworkWithStatus.reduce((s, h) => s + (h.completion_count ?? 0), 0)}/${(studentCount ?? 0) * homework.length} Abgaben`
      : `${openCount} offen · ${doneCount} erledigt · ${missedCount} versäumt`

  const isStudentOrParent = profile.role === 'student' || profile.role === 'parent'

  return (
    <AnimateIn delay={0}>
      <HomeworkList
        homework={homeworkWithStatus}
        role={profile.role}
        specialRole={profile.special_role}
        userId={user.id}
        classId={activeClassId}
        subtitle={subtitle}
        stats={isStudentOrParent ? { open: openCount, done: doneCount, missed: missedCount } : undefined}
      />
    </AnimateIn>
  )
}
