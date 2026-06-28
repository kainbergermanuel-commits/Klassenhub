import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveAuth } from '@/lib/previewAuth'
import { getRelevantMondayOfWeek, getWeekNumber } from '@/lib/date'
import TimetableGrid from './TimetableGrid'

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
        <h1 className="text-[26px] font-extrabold text-kh-dark tracking-tight mb-2">Mein Stundenplan</h1>
        <p className="text-sm text-kh-muted font-medium">Kein Kind verknüpft.</p>
      </div>
    )
  }

  const supabase = await createClient()
  const { data: entries } = await supabase
    .from('timetable_entries')
    .select('day,slot,subject')
    .eq('student_id', studentId)
    .order('day').order('slot')

  const isReadonly = profile.role === 'parent'

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-[26px] font-extrabold text-kh-dark tracking-tight">Mein Stundenplan</h1>
        <p className="text-sm text-kh-muted font-medium mt-1">
          {weekLabel()}{isReadonly ? ' · Ansicht deines Kindes' : ''}
        </p>
      </header>
      <div className="bg-white rounded-2xl shadow-sm px-5 py-5">
        <TimetableGrid entries={entries ?? []} readonly={isReadonly} />
      </div>
    </div>
  )
}
