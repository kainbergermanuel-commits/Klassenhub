import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveAuth } from '@/lib/previewAuth'
import { matchChild } from '@/lib/auth'
import { getMondayOfWeek, getWeekNumber } from '@/lib/date'
import TodoList from '@/components/todo/TodoList'
import PageHeader from '@/components/layout/PageHeader'
import type { TodoWithStatus } from '@/lib/types'

export default async function TodoPage() {
  const { user, profile, activeClassId } = await getEffectiveAuth()
  if (!user) redirect('/login')
  if (!activeClassId) redirect('/')

  const supabase = await createClient()
  const weekStart = getMondayOfWeek()

  const { data: todos } = await supabase
    .from('todos')
    .select('*')
    .eq('class_id', activeClassId)
    .eq('week_start', weekStart)
    .order('created_at', { ascending: true })

  const { count: studentCount } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('class_id', activeClassId)
    .eq('role', 'student')

  let todosWithStatus: TodoWithStatus[]

  if (profile.role === 'student') {
    const { data: completions } = await supabase
      .from('todo_completions')
      .select('todo_id')
      .eq('student_id', user.id)
    const doneIds = new Set((completions ?? []).map(c => c.todo_id))
    todosWithStatus = (todos ?? []).map(t => ({ ...t, done: doneIds.has(t.id) }))
  } else if (profile.role === 'teacher') {
    const todoIds = (todos ?? []).map(t => t.id)
    const { data: counts } = todoIds.length > 0
      ? await supabase.from('todo_completions').select('todo_id').in('todo_id', todoIds)
      : { data: [] }
    const countMap: Record<string, number> = {}
    for (const c of counts ?? []) countMap[c.todo_id] = (countMap[c.todo_id] ?? 0) + 1
    todosWithStatus = (todos ?? []).map(t => ({ ...t, done: false, completion_count: countMap[t.id] ?? 0 }))
  } else {
    // parent: show child's completions (Kind via child_id-Link, Fallback Nachname)
    const { data: allStudents } = await supabase
      .from('profiles').select('id,full_name').eq('class_id', activeClassId).eq('role', 'student')
    const child = matchChild(profile, allStudents ?? [])
    const childDoneIds = new Set<string>()
    if (child && (todos ?? []).length > 0) {
      const { data: childCompletions } = await supabase
        .from('todo_completions').select('todo_id').eq('student_id', child.id)
        .in('todo_id', (todos ?? []).map(t => t.id))
      for (const c of childCompletions ?? []) childDoneIds.add(c.todo_id)
    }
    todosWithStatus = (todos ?? []).map(t => ({ ...t, done: childDoneIds.has(t.id) }))
  }

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  const weekLabel = `KW ${getWeekNumber(weekStart)} · ${new Date(weekStart).toLocaleDateString('de-AT', { day: 'numeric', month: 'long' })} – ${weekEnd.toLocaleDateString('de-AT', { day: 'numeric', month: 'long' })}`

  return (
    <>
      <PageHeader icon="checklist" title="Wochen-To-Do" subtitle={weekLabel} />
      <TodoList
        todos={todosWithStatus}
        role={profile.role}
        userId={user.id}
        classId={activeClassId}
        weekStart={weekStart}
        studentCount={studentCount ?? 0}
      />
    </>
  )
}
