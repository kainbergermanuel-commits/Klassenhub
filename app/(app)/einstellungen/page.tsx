import { redirect } from 'next/navigation'
import { getEffectiveAuth } from '@/lib/previewAuth'
import { getAuth } from '@/lib/auth'
import { getTeacherClasses } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import ChangePasswordForm from '@/components/settings/ChangePasswordForm'
import TeacherSubjectsEditor from '@/components/settings/TeacherSubjectsEditor'
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
        <AnimateIn delay={60}>
          <ChangePasswordForm />
        </AnimateIn>
      </div>
    </>
  )
}
