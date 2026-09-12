import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAuth } from '@/lib/auth'
import PageHeader from '@/components/layout/PageHeader'
import AnimateIn from '@/components/ui/AnimateIn'
import LearningGroupsEditor from '@/components/admin/LearningGroupsEditor'
import { loadSubjectsCatalog } from '@/lib/subjectsCatalog'

/**
 * Administration der Lerngruppen (klassenübergreifender Unterricht).
 *
 * Bewusst hier und nicht bei den Lehrpersonen: eine Gruppe greift über
 * Klassengrenzen, und wer sie zusammenstellt, sieht dabei Kinder fremder
 * Klassen. Die führende Lehrperson arbeitet danach unter /gruppen mit der
 * fertigen Gruppe, ohne Zugriff auf die beteiligten Klassen zu erhalten.
 */
export default async function AdminGruppenPage() {
  const { profile } = await getAuth()
  if (!profile?.is_admin) redirect('/')

  const supabase = await createClient()
  const [groupsRes, membersRes, teachersRes, classesRes, studentsRes, subjects] = await Promise.all([
    supabase.from('learning_groups' as never)
      .select('id,name,subject,subject_short,subject_color,teacher_id,archived')
      .order('name') as unknown as Promise<{ data: GroupRow[] | null }>,
    supabase.from('learning_group_members' as never)
      .select('group_id,student_id') as unknown as Promise<{ data: { group_id: string; student_id: string }[] | null }>,
    supabase.from('profiles').select('id,full_name').eq('role', 'teacher').order('full_name'),
    supabase.from('classes').select('id,name').order('name'),
    supabase.from('profiles').select('id,full_name,class_id').eq('role', 'student').order('full_name'),
    loadSubjectsCatalog(supabase),
  ])

  const members: Record<string, string[]> = {}
  for (const row of membersRes.data ?? []) {
    (members[row.group_id] ??= []).push(row.student_id)
  }

  return (
    <>
      <PageHeader
        icon="diversity_3"
        title="Lerngruppen"
        subtitle="Klassenübergreifende Gruppen — Mitglieder und führende Lehrperson"
        gradient="from-kh-dark to-[#2A4A55]"
      />
      <AnimateIn delay={0}>
        <LearningGroupsEditor
          groups={groupsRes.data ?? []}
          members={members}
          teachers={teachersRes.data ?? []}
          classes={classesRes.data ?? []}
          students={(studentsRes.data ?? []).map(s => ({ id: s.id, full_name: s.full_name, class_id: s.class_id }))}
          subjects={subjects}
        />
      </AnimateIn>
    </>
  )
}

interface GroupRow {
  id: string
  name: string
  subject: string
  subject_short: string
  subject_color: string
  teacher_id: string | null
  archived: boolean
}
