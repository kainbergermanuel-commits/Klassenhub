'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getAuth } from '@/lib/auth'

export async function saveAvatarSeed(seed: string, hairColor: string | null, skinColor: string | null) {
  const { user } = await getAuth()
  if (!user) return
  const supabase = await createClient()
  await supabase.from('profiles').update({ avatar_seed: seed, avatar_hair_color: hairColor, avatar_skin_color: skinColor }).eq('id', user.id)
  revalidatePath('/', 'layout')
}
