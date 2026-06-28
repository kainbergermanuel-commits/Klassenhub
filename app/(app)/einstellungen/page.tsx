import { redirect } from 'next/navigation'
import { getEffectiveAuth } from '@/lib/previewAuth'
import { getAuth } from '@/lib/auth'
import { getTeacherClasses } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import ChangePasswordForm from '@/components/settings/ChangePasswordForm'
import TeacherSubjectsEditor from '@/components/settings/TeacherSubjectsEditor'
import type { TeacherSubject } from '@/app/actions/saveTeacherSubjects'

export default async function SettingsPage() {
  const { user, profile: effectiveProfile, activeClassId } = await getEffectiveAuth()
  if (!user) redirect('/login')

  const { profile: realProfile } = await getAuth()
  let teacherSubjects: TeacherSubject[] = []
  let allClasses: { id: string; name: string }[] = []
  if (realProfile?.role === 'teacher' && effectiveProfile?.role === 'teacher') {
    const supabase = await createClient()
    const classes = await getTeacherClasses(realProfile.id)
    allClasses = classes.map(c => ({ id: c.id, name: c.name })).sort((a, b) => a.name.localeCompare(b.name))
    if (activeClassId) {
      const row = await (supabase
        .from('teacher_classes' as string)
        .select('subjects')
        .eq('teacher_id', realProfile.id)
        .eq('class_id', activeClassId)
        .single() as unknown as Promise<{ data: { subjects: TeacherSubject[] | null } | null }>)
      teacherSubjects = row.data?.subjects ?? []
    }
  }

  return (
    <>
      <div className="mb-5">
        <h1 className="text-[25px] font-extrabold text-kh-dark tracking-tight">Einstellungen</h1>
        <p className="text-[13.5px] text-kh-muted font-medium mt-0.5">{user.email}</p>
      </div>
      <div className="flex flex-col gap-4">
        {realProfile?.role === 'teacher' && effectiveProfile?.role === 'teacher' && (
          <TeacherSubjectsEditor
            key={activeClassId ?? 'default'}
            initial={teacherSubjects}
            activeClassId={activeClassId}
            allClasses={allClasses}
          />
        )}
        <ChangePasswordForm />
      </div>
    </>
  )
}
