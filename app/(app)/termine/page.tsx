import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveAuth } from '@/lib/previewAuth'
import { todayISO } from '@/lib/date'
import PageHeader from '@/components/layout/PageHeader'
import TermineView from './TermineView'
import AnimateIn from '@/components/ui/AnimateIn'
import { loadSubjectsCatalog } from '@/lib/subjectsCatalog'

export default async function TerminePage() {
  const { user, profile, activeClassId } = await getEffectiveAuth()
  if (!user || !profile) redirect('/login')
  if (!activeClassId) redirect('/')

  const supabase = await createClient()
  const today = todayISO()

  // Fächer-Katalog löst `subject_short` in Bezeichnung und Farbe auf
  // (Schularbeiten). Günstiger Query, läuft parallel zu den Terminen.
  const [{ data }, subjects] = await Promise.all([
    supabase
      .from('events')
      .select('*')
      .eq('class_id', activeClassId)
      .order('start_date', { ascending: true }),
    loadSubjectsCatalog(supabase),
  ])

  const events = data ?? []
  const upcomingCount = events.filter(e => e.end_date >= today).length

  // Vornamen nur für Lehrpersonen: sie sollen bei einem persönlichen Termin
  // sehen, WEN er betrifft (vorher stand dort bloss "Persönlich", die eigene
  // Auswahl war nach dem Anlegen nicht mehr nachvollziehbar). Schüler:innen
  // und Eltern brauchen das nicht — sie sehen ohnehin nur eigene Termine.
  let studentNames: Record<string, string> | undefined
  if (profile.role === 'teacher' && events.some(e => e.target_student_ids)) {
    const { data: students } = await supabase
      .from('profiles').select('id,full_name').eq('class_id', activeClassId).eq('role', 'student')
    studentNames = Object.fromEntries((students ?? []).map(s => [s.id, s.full_name.split(' ')[0]]))
  }

  return (
    <div>
      <PageHeader
        icon="calendar_month"
        title="Termine"
        subtitle={`${upcomingCount} bevorstehend`}
        gradient="from-[#4C93C9] to-[#7EB8E5]"
      />
      <AnimateIn delay={0}>
        <TermineView
          events={events}
          role={profile.role}
          today={today}
          classId={activeClassId}
          userId={user.id}
          studentNames={studentNames}
          subjects={subjects}
        />
      </AnimateIn>
    </div>
  )
}
