import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveAuth } from '@/lib/previewAuth'
import { todayISO, schoolYearStartISO } from '@/lib/date'
import PageHeader from '@/components/layout/PageHeader'
import TeacherView from './TeacherView'
import ParentView from './ParentView'
import StudentList from './StudentList'
import PersonalAttendanceStats from './PersonalAttendanceStats'
import AnimateIn from '@/components/ui/AnimateIn'
import type { Attendance, Profile } from '@/lib/types'

export default async function AnwesenheitPage() {
  const { user, profile, activeClassId } = await getEffectiveAuth()
  if (!user || !profile) redirect('/login')
  if (!activeClassId) redirect('/')

  const supabase = await createClient()
  const today = todayISO()
  const schoolYearStart = schoolYearStartISO()

  if (profile.role === 'teacher') {
    const [{ data: students }, { data: entries }] = await Promise.all([
      supabase.from('profiles').select('*')
        .eq('class_id', activeClassId).eq('role', 'student').order('full_name'),
      supabase.from('attendance' as never).select('*')
        .eq('class_id', activeClassId).gte('date', schoolYearStart)
        .order('date', { ascending: false }) as unknown as Promise<{ data: Attendance[] | null }>,
    ])
    const studentList = (students ?? []) as Profile[]
    const entryList = entries ?? []
    const absentToday = entryList.filter(e => e.date === today).length
    const pending = entryList.filter(e => !e.confirmed_at).length

    return (
      <div>
        <PageHeader
          icon="fact_check"
          title="Anwesenheit"
          subtitle={`${absentToday === 0 ? 'Alle anwesend heute' : `${absentToday} heute abwesend`}${pending > 0 ? ` · ${pending} offene ${pending === 1 ? 'Meldung' : 'Meldungen'}` : ''}`}
          gradient="from-[#2E9C6E] to-[#5BC392]"
        />
        <AnimateIn delay={0}>
          <TeacherView students={studentList} entries={entryList} today={today} />
        </AnimateIn>
      </div>
    )
  }

  // Elternteil: Einträge des Kindes · Schüler:in: eigene Einträge
  const studentId = profile.role === 'parent' ? profile.child_id : user.id
  let entries: Attendance[] = []
  let childName: string | null = null

  if (studentId) {
    const [{ data }, childRes] = await Promise.all([
      supabase.from('attendance' as never).select('*')
        .eq('student_id', studentId).gte('date', schoolYearStart)
        .order('date', { ascending: false }) as unknown as Promise<{ data: Attendance[] | null }>,
      profile.role === 'parent'
        ? supabase.from('profiles').select('full_name').eq('id', studentId).maybeSingle()
        : Promise.resolve({ data: null }),
    ])
    entries = data ?? []
    if (childRes.data) childName = childRes.data.full_name
  }

  if (profile.role === 'parent') {
    const firstName = childName?.split(' ')[0]
    return (
      <div>
        <PageHeader
          icon="fact_check"
          title="Anwesenheit"
          subtitle={firstName ? `${firstName} abmelden & Abwesenheiten im Blick behalten` : 'Kein Kind verknüpft'}
          gradient="from-[#2E9C6E] to-[#5BC392]"
        />
        {studentId && firstName
          ? <AnimateIn delay={0}><ParentView entries={entries} childFirstName={firstName} today={today} /></AnimateIn>
          : <div className="kh-card p-6 text-kh-muted text-[14px]">Deinem Profil ist noch kein Kind zugeordnet — bitte bei der Lehrperson melden.</div>}
      </div>
    )
  }

  // Schüler:in — eigene Abwesenheiten, read-only
  const dayLabel = entries.length === 1 ? 'Fehltag' : 'Fehltage'
  return (
    <div>
      <PageHeader
        icon="fact_check"
        title="Anwesenheit"
        subtitle={`${entries.length === 0 ? 'Keine Fehltage' : `${entries.length} ${dayLabel}`} seit Schuljahresbeginn`}
        gradient="from-[#2E9C6E] to-[#5BC392]"
      />
      <AnimateIn delay={0} className="space-y-5">
        <PersonalAttendanceStats entries={entries} today={today} role="student" />
        <StudentList entries={entries} emptyText="Du warst bisher immer da — stark!" />
      </AnimateIn>
    </div>
  )
}
