import { createClient } from '@/lib/supabase/server'
import { getAuth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import NeueLehrkraftForm from './NeueLehrkraftForm'

export default async function NeueLehrkraftPage() {
  const { profile } = await getAuth()
  if (!profile || !profile.is_admin) redirect('/')

  const supabase = await createClient()
  const { data: classes } = await supabase.from('classes').select('id,name,school').order('name')

  return <NeueLehrkraftForm classes={classes ?? []} />
}
