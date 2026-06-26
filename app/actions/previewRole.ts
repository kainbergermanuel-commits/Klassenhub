'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

export async function setPreviewRole(role: string | null, studentId?: string) {
  const jar = await cookies()
  if (role) {
    jar.set('preview_role', role, { path: '/', httpOnly: true, sameSite: 'lax' })
  } else {
    jar.delete('preview_role')
    jar.delete('preview_student_id')
  }
  if (studentId) {
    jar.set('preview_student_id', studentId, { path: '/', httpOnly: true, sameSite: 'lax' })
  } else if (role === 'student') {
    jar.delete('preview_student_id')
  }
  revalidatePath('/', 'layout')
}
