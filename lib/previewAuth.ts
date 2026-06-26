import { cookies } from 'next/headers'
import { getAuth } from './auth'
import { createClient } from './supabase/server'
import type { Profile } from './types'

export type EffectiveAuth = {
  user: { id: string; email?: string }
  profile: Profile
  isPreview: boolean
  previewRole: string | null
}

export async function getEffectiveAuth(): Promise<EffectiveAuth> {
  const { user, profile } = await getAuth()

  // No auth or not a teacher → no preview available
  if (!user || !profile || profile.role !== 'teacher' || !profile.class_id) {
    return { user: user ?? { id: '' }, profile: profile!, isPreview: false, previewRole: null }
  }

  const jar = await cookies()
  const previewRole = jar.get('preview_role')?.value ?? null

  if (!previewRole || previewRole === 'teacher') {
    return { user, profile, isPreview: false, previewRole: null }
  }

  const supabase = await createClient()

  if (previewRole === 'student') {
    const studentId = jar.get('preview_student_id')?.value ?? null
    const query = supabase.from('profiles').select('*').eq('class_id', profile.class_id).eq('role', 'student')
    const { data } = studentId
      ? await query.eq('id', studentId).limit(1)
      : await query.order('full_name').limit(1)
    const target = data?.[0]
    if (target) {
      return { user: { ...user, id: target.id }, profile: target, isPreview: true, previewRole }
    }
  }

  if (previewRole === 'parent') {
    const parentId = jar.get('preview_parent_id')?.value ?? null
    const query = supabase.from('profiles').select('*').eq('class_id', profile.class_id).eq('role', 'parent')
    const { data } = parentId
      ? await query.eq('id', parentId).limit(1)
      : await query.order('full_name').limit(1)
    const target = data?.[0]
    const effectiveProfile: Profile = target ?? { ...profile, role: 'parent' }
    const effectiveUser = target ? { ...user, id: target.id } : user
    return { user: effectiveUser, profile: effectiveProfile, isPreview: true, previewRole }
  }

  return { user, profile, isPreview: false, previewRole: null }
}
