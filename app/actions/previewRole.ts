'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

export async function setPreviewRole(role: string | null, personId?: string) {
  const jar = await cookies()
  if (role) {
    jar.set('preview_role', role, { path: '/', httpOnly: true, sameSite: 'lax' })
  } else {
    jar.delete('preview_role')
    jar.delete('preview_student_id')
    jar.delete('preview_parent_id')
  }
  if (role === 'student') {
    jar.delete('preview_parent_id')
    if (personId) jar.set('preview_student_id', personId, { path: '/', httpOnly: true, sameSite: 'lax' })
    else jar.delete('preview_student_id')
  } else if (role === 'parent') {
    jar.delete('preview_student_id')
    if (personId) jar.set('preview_parent_id', personId, { path: '/', httpOnly: true, sameSite: 'lax' })
    else jar.delete('preview_parent_id')
  }
  revalidatePath('/', 'layout')
  revalidatePath('/hausaufgaben')
  revalidatePath('/erinnerungen')
  revalidatePath('/todo')
  revalidatePath('/dienste')
  revalidatePath('/streaks')
  revalidatePath('/zahlungen')
  revalidatePath('/klasse')
  revalidatePath('/einstellungen')
}
