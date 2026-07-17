import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAuth } from '@/lib/auth'
import PageHeader from '@/components/layout/PageHeader'
import SubjectsEditor from '@/components/admin/SubjectsEditor'

export default async function AdminFaecherPage() {
  const { profile } = await getAuth()
  if (!profile?.is_admin) redirect('/')

  const supabase = await createClient()
  const { data: subjects } = await (supabase
    .from('subjects' as never)
    .select('id,label,short,color,sort_order')
    .order('sort_order') as unknown as Promise<{ data: { id: string; label: string; short: string; color: string; sort_order: number }[] | null }>)

  return (
    <>
      <PageHeader
        icon="palette"
        title="Fächer-Katalog"
        subtitle="Fächer für den Stundenplan verwalten — Name, Kürzel und Farbe"
        gradient="from-kh-dark to-[#2A4A55]"
      />
      <div className="kh-card px-5 py-5">
        <SubjectsEditor initial={subjects ?? []} />
      </div>
    </>
  )
}
