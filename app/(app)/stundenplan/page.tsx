import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveAuth } from '@/lib/previewAuth'
import { getRelevantMondayOfWeek, getWeekNumber } from '@/lib/date'
import TimetableGrid from './TimetableGrid'
import PageHeader from '@/components/layout/PageHeader'

function weekLabel(): string {
  const mondayStr = getRelevantMondayOfWeek()
  const monday = new Date(`${mondayStr}T00:00:00`)
  const friday = new Date(monday)
  friday.setDate(monday.getDate() + 4)
  const kw = getWeekNumber(mondayStr)
  const fmt = (d: Date) => d.toLocaleDateString('de-AT', { day: 'numeric', month: 'numeric' })
  return `KW ${kw} · ${fmt(monday)} – ${fmt(friday)}`
}

export default async function StundenplanPage() {
  const { user, profile } = await getEffectiveAuth()
  if (!user || !profile) redirect('/login')

  // Nur Schüler und Eltern
  if (profile.role !== 'student' && profile.role !== 'parent') redirect('/')

  const studentId = profile.role === 'student'
    ? user.id
    : profile.child_id ?? null

  if (!studentId) {
    return (
      <div>
        <PageHeader icon="calendar_view_week" title="Mein Stundenplan" gradient="from-[#2F86C5] to-[#56AEE6]" />
        <p className="text-sm text-kh-muted font-medium -mt-4">Kein Kind verknüpft.</p>
      </div>
    )
  }

  const supabase = await createClient()
  const { data: entries } = await (supabase
    .from('timetable_entries' as never)
    .select('day,slot,subject')
    .eq('student_id', studentId)
    .order('day').order('slot') as unknown as Promise<{ data: { day: number; slot: number; subject: string }[] | null }>)

  const isReadonly = profile.role === 'parent'

  return (
    <div>
      <PageHeader
        icon="calendar_view_week"
        title="Mein Stundenplan"
        subtitle={`${weekLabel()}${isReadonly ? ' · Ansicht deines Kindes' : ''}`}
        gradient="from-[#2F86C5] to-[#56AEE6]"
      />
      <div className="kh-card px-5 py-5">
        <TimetableGrid entries={entries ?? []} readonly={isReadonly} />
      </div>
    </div>
  )
}
