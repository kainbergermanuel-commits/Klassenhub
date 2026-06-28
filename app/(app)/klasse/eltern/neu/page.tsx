import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAuth } from '@/lib/auth'
import NeuesElternteilForm from './NeuesElternteilForm'

export default async function NeuesElternteilPage() {
  const { profile } = await getAuth()
  if (!profile || profile.role !== 'teacher' || !profile.class_id) redirect('/')

  const supabase = await createClient()
  const { data: students } = await supabase
    .from('profiles')
    .select('id,full_name')
    .eq('class_id', profile.class_id)
    .eq('role', 'student')
    .order('full_name')

  return <NeuesElternteilForm students={students ?? []} />
}
