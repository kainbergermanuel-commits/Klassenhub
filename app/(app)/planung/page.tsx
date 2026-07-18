import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveAuth } from '@/lib/previewAuth'
import { getRelevantMondayOfWeek, getMondayOfWeek, getWeekNumber, addDaysISO } from '@/lib/date'
import PlanungWeek from './PlanungWeek'
import PageHeader from '@/components/layout/PageHeader'
import AnimateIn from '@/components/ui/AnimateIn'
import { loadSubjectsCatalog } from '@/lib/subjectsCatalog'

interface Note { day: number; subject: string; content: string }

export default async function PlanungPage({ searchParams }: { searchParams: Promise<{ w?: string }> }) {
  const { user, profile, activeClassId } = await getEffectiveAuth()
  if (!user || !profile) redirect('/login')
  if (profile.role !== 'teacher') redirect('/')

  const { w } = await searchParams
  // Nur gültige Montage akzeptieren, sonst aktuelle (bzw. So → nächste) Woche
  const weekStart = w && /^\d{4}-\d{2}-\d{2}$/.test(w)
    ? getMondayOfWeek(new Date(`${w}T00:00:00`))
    : getRelevantMondayOfWeek()

  const supabase = await createClient()
  const [notesResult, subjects] = await Promise.all([
    activeClassId
      ? (supabase
          .from('planning_notes' as never)
          .select('day,subject,content')
          .eq('class_id', activeClassId)
          .eq('week_start', weekStart) as unknown as Promise<{ data: Note[] | null }>)
      : Promise.resolve({ data: [] as Note[] }),
    loadSubjectsCatalog(supabase),
  ])
  const notes = notesResult.data ?? []

  const monday = new Date(`${weekStart}T00:00:00`)
  const friday = new Date(monday)
  friday.setDate(monday.getDate() + 4)
  const fmt = (d: Date) => d.toLocaleDateString('de-AT', { day: 'numeric', month: 'numeric' })
  const kw = getWeekNumber(weekStart)

  return (
    <div>
      <PageHeader icon="edit_calendar" title="Planung" subtitle={`KW ${kw} · ${fmt(monday)} – ${fmt(friday)}`} />
      <AnimateIn delay={0}>
        <PlanungWeek
          key={weekStart}
          weekStart={weekStart}
          prevWeek={addDaysISO(-7, monday)}
          nextWeek={addDaysISO(7, monday)}
          currentWeek={getRelevantMondayOfWeek()}
          weekLabel={`KW ${kw}`}
          initialNotes={notes}
          subjects={subjects}
        />
      </AnimateIn>
    </div>
  )
}
