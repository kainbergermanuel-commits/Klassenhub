import { redirect } from 'next/navigation'
import { getEffectiveAuth } from '@/lib/previewAuth'
import { getAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import ChangePasswordForm from '@/components/settings/ChangePasswordForm'
import TeacherSubjectsEditor from '@/components/settings/TeacherSubjectsEditor'
import type { TeacherSubject } from '@/app/actions/saveTeacherSubjects'

export default async function SettingsPage() {
  const { user } = await getEffectiveAuth()
  if (!user) redirect('/login')

  const { profile } = await getAuth()
  let teacherSubjects: TeacherSubject[] = []
  if (profile?.role === 'teacher') {
    const supabase = await createClient()
    const { data } = await supabase.from('profiles').select('subjects').eq('id', profile.id).single()
    teacherSubjects = (data?.subjects as TeacherSubject[] | null) ?? []
  }

  return (
    <>
      <div className="mb-5">
        <h1 className="text-[25px] font-extrabold text-kh-dark tracking-tight">Einstellungen</h1>
        <p className="text-[13.5px] text-kh-muted font-medium mt-0.5">{user.email}</p>
      </div>
      <div className="flex flex-col gap-4">
        {profile?.role === 'teacher' && (
          <TeacherSubjectsEditor initial={teacherSubjects} />
        )}
        <ChangePasswordForm />
      </div>
    </>
  )
}
