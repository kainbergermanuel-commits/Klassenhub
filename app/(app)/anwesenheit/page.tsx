import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveAuth } from '@/lib/previewAuth'
import { todayISO, schoolYearStartISO } from '@/lib/date'
import PageHeader from '@/components/layout/PageHeader'
import TeacherView from './TeacherView'
import ParentView from './ParentView'
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

  // Anwesenheit ist reine Eltern-/Lehrer-Sache — Schüler:innen haben keinen
  // Zugang (Nav-Link entfernt, Route hier serverseitig gesperrt). Damit bleibt
  // unten nur noch die Elternansicht.
  if (profile.role !== 'parent') redirect('/')

  const studentId = profile.child_id
  let entries: Attendance[] = []
  let childName: string | null = null

  if (studentId) {
    const [{ data }, childRes] = await Promise.all([
      supabase.from('attendance' as never).select('*')
        .eq('student_id', studentId).gte('date', schoolYearStart)
        .order('date', { ascending: false }) as unknown as Promise<{ data: Attendance[] | null }>,
      supabase.from('profiles').select('full_name').eq('id', studentId).maybeSingle(),
    ])
    entries = data ?? []
    if (childRes.data) childName = childRes.data.full_name
  }

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
