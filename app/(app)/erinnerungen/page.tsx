import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveAuth } from '@/lib/previewAuth'
import ReminderList from '@/components/erinnerungen/ReminderList'

export default async function ErinnerungenPage() {
  const { user, profile } = await getEffectiveAuth()
  if (!user) redirect('/login')
  if (!profile?.class_id) redirect('/')

  const supabase = await createClient()

  const { data: reminders } = await supabase
    .from('reminders')
    .select('*')
    .eq('class_id', profile.class_id)
    .order('event_date', { ascending: true })

  const reminderIds = (reminders ?? []).map(r => r.id)

  // Teacher: fetch who has seen each reminder + total student count
  let viewersByReminder: Record<string, string[]> = {}
  let allStudentNames: string[] = []
  if (profile.role === 'teacher' && reminderIds.length > 0) {
    const [{ data: views }, { data: students }] = await Promise.all([
      supabase.from('reminder_views').select('reminder_id,student_id').in('reminder_id', reminderIds),
      supabase.from('profiles').select('id,full_name').eq('class_id', profile.class_id).eq('role', 'student'),
    ])
    allStudentNames = (students ?? []).map(s => s.full_name.split(' ')[0])
    const nameById = Object.fromEntries((students ?? []).map(s => [s.id, s.full_name.split(' ')[0]]))
    for (const v of views ?? []) {
      if (!viewersByReminder[v.reminder_id]) viewersByReminder[v.reminder_id] = []
      viewersByReminder[v.reminder_id].push(nameById[v.student_id] ?? '?')
    }
  }

  // Student: fetch own views
  let myViewedIds: string[] = []
  if (profile.role === 'student' && reminderIds.length > 0) {
    const { data: myViews } = await supabase
      .from('reminder_views').select('reminder_id')
      .eq('student_id', user.id).in('reminder_id', reminderIds)
    myViewedIds = (myViews ?? []).map(v => v.reminder_id)
  }

  return (
    <ReminderList
      reminders={reminders ?? []}
      role={profile.role}
      specialRole={profile.special_role}
      userId={user.id}
      classId={profile.class_id}
      viewersByReminder={viewersByReminder}
      allStudentNames={allStudentNames}
      myViewedIds={myViewedIds}
    />
  )
}
