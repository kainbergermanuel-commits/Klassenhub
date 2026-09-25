import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAuth, getTeacherActiveClassId } from '@/lib/auth'
import NeuesElternteilForm from './NeuesElternteilForm'

export default async function NeuesElternteilPage() {
  const { profile } = await getAuth()
  if (!profile || profile.role !== 'teacher') redirect('/')

  // Die Kinder der gerade gewählten Klasse, nicht die der Stammklasse.
  const classId = await getTeacherActiveClassId(profile)

  const supabase = await createClient()
  const { data: students } = await supabase
    .from('profiles')
    .select('id,full_name')
    .eq('class_id', classId)
    .eq('role', 'student')
    .order('full_name')

  return <NeuesElternteilForm students={students ?? []} />
}
