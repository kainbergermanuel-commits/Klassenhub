import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAuth } from '@/lib/auth'
import PageHeader from '@/components/layout/PageHeader'
import AnimateIn from '@/components/ui/AnimateIn'
import LearningGroupsView from '@/components/groups/LearningGroupsView'

/**
 * Lerngruppen aus Sicht der führenden Lehrperson.
 *
 * Die Seite lädt bewusst NUR die Gruppenliste (eine kleine Abfrage, durch die
 * RLS ohnehin auf die eigenen Gruppen begrenzt). Mitglieder und Hausübungen
 * kommen erst beim Aufklappen einer Gruppe dazu — wer die Seite nur streift,
 * bezahlt nichts dafür.
 */
export default async function GruppenPage() {
  const { user, profile } = await getAuth()
  if (!user || !profile) redirect('/login')
  if (profile.role !== 'teacher') redirect('/')

  const supabase = await createClient()
  const { data: groups } = await (supabase
    .from('learning_groups' as never)
    .select('id,name,subject,subject_short,subject_color,archived')
    .order('archived')
    .order('name') as unknown as Promise<{ data: GroupRow[] | null }>)

  return (
    <>
      <PageHeader
        icon="diversity_3"
        title="Lerngruppen"
        subtitle="Klassenübergreifende Gruppen — Hausübungen und Kontrolle an einem Ort"
      />
      <AnimateIn delay={0}>
        <LearningGroupsView groups={groups ?? []} isAdmin={!!profile.is_admin} />
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
  archived: boolean
}
