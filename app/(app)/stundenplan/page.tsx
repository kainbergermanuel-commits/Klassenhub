import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveAuth } from '@/lib/previewAuth'
import { getStundenplanMondayOfWeek, getWeekNumber, addDaysISO, todayISO } from '@/lib/date'
import TimetableGrid from './TimetableGrid'
import ClassTimetableEditor from './ClassTimetableEditor'
import PageHeader from '@/components/layout/PageHeader'

function weekLabel(): string {
  const mondayStr = getStundenplanMondayOfWeek()
  const monday = new Date(`${mondayStr}T00:00:00`)
  const friday = new Date(monday)
  friday.setDate(monday.getDate() + 4)
  const kw = getWeekNumber(mondayStr)
  const fmt = (d: Date) => d.toLocaleDateString('de-AT', { day: 'numeric', month: 'numeric' })
  return `KW ${kw} · ${fmt(monday)} – ${fmt(friday)}`
}

export default async function StundenplanPage() {
  const { user, profile, activeClassId } = await getEffectiveAuth()
  if (!user || !profile) redirect('/login')

  const supabaseCommon = await createClient()
  // Fächer-Katalog (Admin-verwaltet, siehe supabase/add-subjects-catalog.sql) —
  // für alle Rollen dieselbe Quelle, damit Lehrer-Vorlage und Kind-Ansicht nie
  // auseinanderlaufen können.
  const { data: subjectRows } = await (supabaseCommon
    .from('subjects' as never)
    .select('label,short,color')
    .order('sort_order') as unknown as Promise<{ data: { label: string; short: string; color: string }[] | null }>)
  const subjects = subjectRows ?? []

  // ─── LEHRER: Standard-Stundenplan der Klasse erstellen + pushen ────────────
  if (profile.role === 'teacher') {
    if (!activeClassId) redirect('/')
    const { data: templateEntries } = await (supabaseCommon
      .from('class_timetable_entries' as never)
      .select('day,slot,subject')
      .eq('class_id', activeClassId)
      .order('day').order('slot') as unknown as Promise<{ data: { day: number; slot: number; subject: string }[] | null }>)

    return (
      <div>
        <PageHeader
          icon="calendar_view_week"
          title="Stundenplan"
          subtitle="Standard-Stundenplan der Klasse erstellen und an alle Kinder senden"
          gradient="from-[#2F86C5] to-[#56AEE6]"
        />
        <div className="kh-card px-5 py-5">
          <ClassTimetableEditor entries={templateEntries ?? []} subjects={subjects} />
        </div>
      </div>
    )
  }

  // Sonst nur Schüler und Eltern
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

  const supabase = supabaseCommon
  const { data: entries } = await (supabase
    .from('timetable_entries' as never)
    .select('day,slot,subject')
    .eq('student_id', studentId)
    .order('day').order('slot') as unknown as Promise<{ data: { day: number; slot: number; subject: string }[] | null }>)

  const isReadonly = profile.role === 'parent'

  // HÜ-Marker: offene Hausübungen dieser Woche pro Wochentag+Fach, für die
  // Darstellung direkt im Stundenplan ("morgen fällig" am jeweiligen Fach).
  const monday = getStundenplanMondayOfWeek()
  const friday = addDaysISO(4, new Date(`${monday}T00:00:00`))
  const today = todayISO()

  const { data: studentProfile } = await supabase
    .from('profiles').select('class_id').eq('id', studentId).single()
  const classId = studentProfile?.class_id ?? null

  let dueMarkers: { day: number; subject: string; title: string; done: boolean }[] = []
  if (classId) {
    const { data: weekHomework } = await supabase
      .from('homework')
      .select('id,subject,title,due_date')
      .eq('class_id', classId)
      .gte('due_date', monday <= today ? today : monday)
      .lte('due_date', friday)

    const homework = weekHomework ?? []
    const hwIds = homework.map(h => h.id)
    const { data: completions } = hwIds.length > 0
      ? await supabase.from('homework_completions').select('homework_id').eq('student_id', studentId).in('homework_id', hwIds)
      : { data: [] }
    const doneIds = new Set((completions ?? []).map(c => c.homework_id))

    dueMarkers = homework
      .map(h => {
        const dayOffset = Math.round((new Date(`${h.due_date}T00:00:00`).getTime() - new Date(`${monday}T00:00:00`).getTime()) / 86400000)
        return { day: dayOffset + 1, subject: h.subject, title: h.title, done: doneIds.has(h.id) }
      })
      .filter(m => m.day >= 1 && m.day <= 5)
  }

  // Erinnerungs-Marker: nicht fachgebunden, daher neben dem Tages-Kürzel
  // statt an einer einzelnen Fach-Zelle. RLS filtert Targeting/Sichtbarkeit
  // (target_student_ids, status=published) bereits serverseitig pro Nutzer.
  let reminderMarkers: { day: number; title: string }[] = []
  if (classId) {
    const { data: weekReminders } = await supabase
      .from('reminders')
      .select('event_date,title')
      .eq('class_id', classId)
      .gte('event_date', monday <= today ? today : monday)
      .lte('event_date', friday)

    reminderMarkers = (weekReminders ?? [])
      .map(r => {
        const dayOffset = Math.round((new Date(`${r.event_date}T00:00:00`).getTime() - new Date(`${monday}T00:00:00`).getTime()) / 86400000)
        return { day: dayOffset + 1, title: r.title }
      })
      .filter(m => m.day >= 1 && m.day <= 5)
  }

  return (
    <div>
      <PageHeader
        icon="calendar_view_week"
        title="Mein Stundenplan"
        subtitle={`${weekLabel()}${isReadonly ? ' · Ansicht deines Kindes' : ''}`}
        gradient="from-[#2F86C5] to-[#56AEE6]"
      />
      <div className="kh-card px-5 py-5">
        <TimetableGrid entries={entries ?? []} subjects={subjects} readonly={isReadonly} dueMarkers={dueMarkers} reminderMarkers={reminderMarkers} />
      </div>
    </div>
  )
}
