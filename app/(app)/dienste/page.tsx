import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveAuth } from '@/lib/previewAuth'
import { getRelevantMondayOfWeek, getWeekNumber } from '@/lib/date'
import DutyWeek from '@/components/dienste/DutyWeek'
import AnimateIn from '@/components/ui/AnimateIn'

export default async function DienstePage() {
  const { user, profile, activeClassId } = await getEffectiveAuth()
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

  const weekLabel = `KW ${getWeekNumber(weekStart)} · ${new Date(weekStart).toLocaleDateString('de-AT', { day: 'numeric', month: 'long' })} – ${weekEnd.toLocaleDateString('de-AT', { day: 'numeric', month: 'long' })}`

  return (
    <AnimateIn delay={0}>
      <DutyWeek
        duties={duties ?? []}
        students={students ?? []}
        role={profile.role}
        userId={user.id}
        classId={activeClassId}
        weekStart={weekStart}
        weekLabel={weekLabel}
      />
    </AnimateIn>
  )
}
