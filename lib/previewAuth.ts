import { cache } from 'react'
import { cookies } from 'next/headers'
import { getAuth, getTeacherClasses } from './auth'
import { createClient } from './supabase/server'
import type { Profile } from './types'

export type EffectiveAuth = {
  user: { id: string; email?: string }
  profile: Profile
  isPreview: boolean
  previewRole: string | null
  activeClassId: string | null
}

export const getEffectiveAuth = cache(async (): Promise<EffectiveAuth> => {
  const { user, profile } = await getAuth()

  if (!user || !profile || profile.role !== 'teacher') {
    return { user: user ?? { id: '' }, profile: profile!, isPreview: false, previewRole: null, activeClassId: profile?.class_id ?? null }
  }

  const jar = await cookies()
  const previewRole = jar.get('preview_role')?.value ?? null

  // activeClassId: cookie → profiles.class_id → first teacher_classes entry
  let activeClassId: string | null = jar.get('active_class_id')?.value ?? profile.class_id ?? null
  if (!activeClassId) {
    const classes = await getTeacherClasses(profile.id)
    activeClassId = classes[0]?.id ?? null
  }

  if (!previewRole || previewRole === 'teacher') {
    return { user, profile, isPreview: false, previewRole: null, activeClassId }
  }

  const supabase = await createClient()

  if (previewRole === 'student') {
    const studentId = jar.get('preview_student_id')?.value ?? null
    const query = supabase.from('profiles').select('*').eq('class_id', activeClassId).eq('role', 'student')
    const { data } = studentId
      ? await query.eq('id', studentId).limit(1)
      : await query.order('full_name').limit(1)
    const target = data?.[0]
    if (target) {
      return { user: { ...user, id: target.id }, profile: target, isPreview: true, previewRole, activeClassId: target.class_id ?? activeClassId }
    }
  }

  if (previewRole === 'parent') {
    const parentId = jar.get('preview_parent_id')?.value ?? null
    const query = supabase.from('profiles').select('*').eq('class_id', activeClassId).eq('role', 'parent')
    const { data } = parentId
      ? await query.eq('id', parentId).limit(1)
      : await query.order('full_name').limit(1)
    const target = data?.[0]
    const effectiveProfile: Profile = target ?? { ...profile, role: 'parent' }
    const effectiveUser = target ? { ...user, id: target.id } : user
    return { user: effectiveUser, profile: effectiveProfile, isPreview: true, previewRole, activeClassId: effectiveProfile.class_id ?? activeClassId }
  }

  return { user, profile, isPreview: false, previewRole: null, activeClassId }
})
