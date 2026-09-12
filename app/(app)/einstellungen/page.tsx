import { redirect } from 'next/navigation'
import { getEffectiveAuth } from '@/lib/previewAuth'
import { getAuth } from '@/lib/auth'
import { getTeacherClasses } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import ChangePasswordForm from '@/components/settings/ChangePasswordForm'
import DatenschutzCard from '@/components/settings/DatenschutzCard'
import TeacherSubjectsEditor from '@/components/settings/TeacherSubjectsEditor'
import DefaultExclusionsEditor from '@/components/settings/DefaultExclusionsEditor'
import PageHeader from '@/components/layout/PageHeader'
import AnimateIn from '@/components/ui/AnimateIn'
import { loadSubjectsCatalog } from '@/lib/subjectsCatalog'
import type { TeacherSubject } from '@/app/actions/saveTeacherSubjects'

export default async function SettingsPage() {
  const { user, profile: effectiveProfile, activeClassId } = await getEffectiveAuth()
  if (!user) redirect('/login')

  const { profile: realProfile } = await getAuth()
  let teacherSubjects: TeacherSubject[] = []
  let allClasses: { id: string; name: string }[] = []
  let subjectsCatalog: Awaited<ReturnType<typeof loadSubjectsCatalog>> = []
  // Standard-Ausnahmen der aktiven Klasse (nur Lehrpersonen, siehe
  // supabase/add-subject-default-exclusions.sql).
  let exclusionStudents: ExclusionStudent[] = []
  let exclusionMap: Record<string, string[]> = {}
  if (realProfile?.role === 'teacher' && effectiveProfile?.role === 'teacher') {
    const supabase = await createClient()
    const [classes, catalogRow, subjects] = await Promise.all([
      getTeacherClasses(realProfile.id),
      activeClassId
        ? (supabase
            .from('teacher_classes' as string)
            .select('subjects')
            .eq('teacher_id', realProfile.id)
            .eq('class_id', activeClassId)
            .single() as unknown as Promise<{ data: { subjects: TeacherSubject[] | null } | null }>)
        : Promise.resolve({ data: null }),
      loadSubjectsCatalog(supabase),
    ])
    allClasses = classes.map(c => ({ id: c.id, name: c.name })).sort((a, b) => a.name.localeCompare(b.name))
    teacherSubjects = catalogRow.data?.subjects ?? []
    subjectsCatalog = subjects

    if (activeClassId) {
      const [studentsRes, exclusionsRes] = await Promise.all([
        supabase.from('profiles')
          .select('id,full_name,avatar_color,avatar_seed,avatar_hair_color,avatar_skin_color')
          .eq('class_id', activeClassId).eq('role', 'student').order('full_name'),
        supabase.from('subject_default_exclusions' as never)
          .select('student_id,subject_short')
          .eq('class_id', activeClassId) as unknown as Promise<{ data: { student_id: string; subject_short: string }[] | null }>,
      ])
      exclusionStudents = studentsRes.data ?? []
      for (const row of exclusionsRes.data ?? []) {
        (exclusionMap[row.student_id] ??= []).push(row.subject_short)
      }
    }
  }

  return (
    <>
      <PageHeader icon="settings" title="Einstellungen" subtitle={user.email} gradient="from-kh-muted to-[#8A9896]" />
      <div className="flex flex-col gap-4">
        {realProfile?.role === 'teacher' && effectiveProfile?.role === 'teacher' && (
          <AnimateIn delay={0}>
            <TeacherSubjectsEditor
              key={activeClassId ?? 'default'}
              initial={teacherSubjects}
              activeClassId={activeClassId}
              allClasses={allClasses}
              subjects={subjectsCatalog}
            />
          </AnimateIn>
        )}
        {realProfile?.role === 'teacher' && effectiveProfile?.role === 'teacher' && activeClassId && (
          <AnimateIn delay={30}>
            <DefaultExclusionsEditor
              key={activeClassId}
              classId={activeClassId}
              className={allClasses.find(c => c.id === activeClassId)?.name ?? 'Klasse'}
              students={exclusionStudents}
              subjects={subjectsCatalog}
              initial={exclusionMap}
            />
          </AnimateIn>
        )}
        <AnimateIn delay={60}>
          <ChangePasswordForm />
        </AnimateIn>
        {effectiveProfile && (
          <AnimateIn delay={120}>
            <DatenschutzCard role={effectiveProfile.role} />
          </AnimateIn>
        )}
      </div>
    </>
  )
}

interface ExclusionStudent {
  id: string
  full_name: string
  avatar_color: string
  avatar_seed: string | null
  avatar_hair_color: string | null
  avatar_skin_color: string | null
}
