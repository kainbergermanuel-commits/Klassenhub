import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveAuth } from '@/lib/previewAuth'
import { getRelevantMondayOfWeek, getMondayOfWeek, getWeekNumber, addDaysISO } from '@/lib/date'
import PlanungWeek from './PlanungWeek'

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

  let notes: Note[] = []
  if (activeClassId) {
    const supabase = await createClient()
    const { data } = await (supabase
      .from('planning_notes' as never)
      .select('day,subject,content')
      .eq('class_id', activeClassId)
      .eq('week_start', weekStart) as unknown as Promise<{ data: Note[] | null }>)
    notes = data ?? []
  }

  const monday = new Date(`${weekStart}T00:00:00`)
  const friday = new Date(monday)
  friday.setDate(monday.getDate() + 4)
  const fmt = (d: Date) => d.toLocaleDateString('de-AT', { day: 'numeric', month: 'numeric' })
  const kw = getWeekNumber(weekStart)

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-[26px] font-extrabold text-kh-dark tracking-tight">Planung</h1>
        <p className="text-sm text-kh-muted font-medium mt-1">
          KW {kw} · {fmt(monday)} – {fmt(friday)}
        </p>
      </header>
      <PlanungWeek
        key={weekStart}
        weekStart={weekStart}
        prevWeek={addDaysISO(-7, monday)}
        nextWeek={addDaysISO(7, monday)}
        currentWeek={getRelevantMondayOfWeek()}
        weekLabel={`KW ${kw}`}
        initialNotes={notes}
      />
    </div>
  )
}
