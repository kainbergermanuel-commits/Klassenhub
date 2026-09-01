import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveAuth } from '@/lib/previewAuth'
import { matchChild } from '@/lib/auth'
import { getRelevantMondayOfWeek, getWeekNumber } from '@/lib/date'
import { buildDutyDone, confirmableWeekday, dutyDoneWeekdays } from '@/lib/duty'
import DutyWeek from '@/components/dienste/DutyWeek'
import AnimateIn from '@/components/ui/AnimateIn'

export default async function DienstePage() {
  const { user, profile, activeClassId, isPreview } = await getEffectiveAuth()
  if (!user) redirect('/login')
  if (!activeClassId) redirect('/')

  const supabase = await createClient()
  const weekStart = getRelevantMondayOfWeek()
  const weekEnd = new Date(`${weekStart}T00:00:00`)
  weekEnd.setDate(weekEnd.getDate() + 6)

  const [{ data: duties }, { data: students }] = await Promise.all([
    supabase.from('duties').select('*').eq('class_id', activeClassId).eq('week_start', weekStart).order('created_at'),
    supabase.from('profiles').select('*').eq('class_id', activeClassId).eq('role', 'student').order('full_name'),
  ])

  // Bestätigungsstand der Woche. Vorher zeigte diese Seite ihn gar nicht: das
  // Abhaken lebte allein im Startseiten-Modul, und die Wochentags-Chips hier
  // waren rein kalendarisch — grüner Haken, sobald ein Tag vorbei war.
  const dutyIds = (duties ?? []).map(d => d.id)
  const { data: completions } = dutyIds.length > 0
    ? await supabase.from('duty_completions').select('duty_id,student_id,weekday').in('duty_id', dutyIds)
    : { data: [] }
  const { doneByDutyStudent } = buildDutyDone(duties ?? [], completions ?? [], weekStart)

  // Bestätigte Tage je (Dienst, Kind) — flach serialisiert, damit die Client-
  // Komponente keine Map über die Server-Grenze bekommt.
  const doneMap: Record<string, number[]> = {}
  for (const d of duties ?? []) {
    for (const sid of d.assignee_ids) {
      doneMap[`${d.id}:${sid}`] = dutyDoneWeekdays(doneByDutyStudent, d.id, sid)
    }
  }

  // Eltern sollen sehen, welcher Dienst ihrem Kind gehört. Ihre eigene ID
  // steht nie in assignee_ids, deshalb wird hier das Kind aufgelöst.
  const childId = profile.role === 'parent'
    ? (matchChild(profile, students ?? [])?.id ?? null)
    : null
  const highlightId = profile.role === 'student' ? user.id : childId

  const weekLabel = `KW ${getWeekNumber(weekStart)} · ${new Date(weekStart).toLocaleDateString('de-AT', { day: 'numeric', month: 'long' })} – ${weekEnd.toLocaleDateString('de-AT', { day: 'numeric', month: 'long' })}`

  return (
    <AnimateIn delay={0}>
      <DutyWeek
        duties={duties ?? []}
        students={students ?? []}
        role={profile.role}
        userId={user.id}
        highlightStudentId={highlightId}
        classId={activeClassId}
        weekStart={weekStart}
        weekLabel={weekLabel}
        doneMap={doneMap}
        confirmableUntil={confirmableWeekday(weekStart)}
        isPreview={isPreview}
      />
    </AnimateIn>
  )
}
