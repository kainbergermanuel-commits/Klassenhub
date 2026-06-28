'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getAuth } from '@/lib/auth'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function assertAdmin() {
  const { profile } = await getAuth()
  if (!profile || !profile.is_admin) throw new Error('Unauthorized')
  return profile
}

async function adminFetch(path: string, method: string, body?: object) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  return res
}

function toTeacherUsername(fullName: string): string {
  const normalized = fullName
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
  const parts = normalized.split(/\s+/)
  return parts.length >= 2 ? `${parts[0]}.${parts.slice(1).join('')}` : parts[0]
}

function toTeacherPassword(fullName: string): string {
  const normalized = fullName
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
  return `${normalized.split(/\s+/)[0]}123`
}

function toBaseUsername(fullName: string): string {
  const normalized = fullName
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9\s]/g, '').trim()
  const parts = normalized.split(/\s+/)
  return parts.length >= 2 ? `${parts[0]}.${parts.slice(1).join('')}` : parts[0]
}

/** Creates an auth user, appending a numeric suffix if the email is already taken. */
async function createAuthUserUnique(
  baseUsername: string,
  password: string,
  usedEmails: Set<string> = new Set(),
): Promise<{ authUser: { id: string }; email: string; username: string }> {
  let suffix = 0
  while (true) {
    const username = suffix === 0 ? baseUsername : `${baseUsername}${suffix + 1}`
    const email = `${username}@klassenhub.local`
    if (usedEmails.has(email)) { suffix++; continue }

    const res = await adminFetch('users', 'POST', { email, password, email_confirm: true })
    if (res.ok) {
      usedEmails.add(email)
      return { authUser: await res.json(), email, username }
    }
    const err = await res.json()
    const msg: string = err.message ?? ''
    if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('registered')) {
      usedEmails.add(email)
      suffix++
      continue
    }
    throw new Error(msg || 'Auth-Account konnte nicht angelegt werden')
  }
}

export async function createClass(formData: FormData) {
  await assertAdmin()
  const name = (formData.get('name') as string).trim()

  const supabase = await createClient()
  const { data: existing } = await supabase.from('classes').select('school').limit(1).single()
  const school = existing?.school ?? 'MS Hirtenberg'

  const { data, error } = await supabase.from('classes').insert({ name, school }).select('id').single()
  if (error) throw new Error(error.message)
  return { classId: data.id as string, className: name }
}

export async function adminCreateStudentsForClass(classId: string, names: string[]) {
  await assertAdmin()
  const service = createServiceClient()

  const results: { fullName: string; username: string; password: string }[] = []
  const errors: string[] = []
  const usedEmails = new Set<string>()

  for (const fullName of names) {
    const trimmed = fullName.trim()
    if (!trimmed) continue

    const baseUsername = toBaseUsername(trimmed)
    const normalized = trimmed.toLowerCase()
      .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
      .replace(/[^a-z0-9\s]/g, '').trim()
    const password = `${normalized.split(/\s+/)[0]}123`

    let authUser: { id: string }
    let username: string
    try {
      ;({ authUser, username } = await createAuthUserUnique(baseUsername, password, usedEmails))
    } catch (e) {
      errors.push(`${trimmed}: ${(e as Error).message}`)
      continue
    }

    const { error } = await service.from('profiles').upsert({
      id: authUser.id,
      role: 'student',
      full_name: trimmed,
      class_id: classId,
      gender: null,
      avatar_color: '#0F8A82',
      avatar_seed: null,
      is_admin: false,
      joined_class_at: new Date().toISOString(),
    })

    if (error) {
      errors.push(`${trimmed}: ${error.message}`)
    } else {
      results.push({ fullName: trimmed, username, password })
    }
  }

  return { results, errors }
}

export async function createTeacher(formData: FormData) {
  await assertAdmin()
  const fullName = (formData.get('full_name') as string).trim()
  const classIds = formData.getAll('class_ids').map(v => (v as string)).filter(Boolean)
  const primaryClassId = classIds[0] ?? null
  const baseUsername = toTeacherUsername(fullName)
  const password = toTeacherPassword(fullName)

  const { authUser, username } = await createAuthUserUnique(baseUsername, password)

  const service = createServiceClient()
  const { error } = await service.from('profiles').upsert({
    id: authUser.id,
    role: 'teacher',
    full_name: fullName,
    class_id: primaryClassId,
    avatar_color: '#73AB84',
    avatar_seed: crypto.randomUUID(),
    is_admin: false,
  })
  if (error) {
    await adminFetch(`users/${authUser.id}`, 'DELETE')
    throw new Error(error.message)
  }

  if (classIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (service.from('teacher_classes' as any) as any).insert(
      classIds.map((cid, i) => ({ teacher_id: authUser.id, class_id: cid, is_primary: i === 0 }))
    )
  }

  return { username, password, fullName }
}

export async function adminRenameClass(classId: string, name: string) {
  await assertAdmin()
  const supabase = await createClient()
  const { error } = await supabase.from('classes').update({ name: name.trim() }).eq('id', classId)
  if (error) throw new Error(error.message)
}

export async function adminDeleteClass(classId: string) {
  await assertAdmin()
  const service = createServiceClient()
  const { error } = await service.from('classes').delete().eq('id', classId)
  if (error) throw new Error(error.message)
}

export async function adminUpdateTeacherClasses(profileId: string, classIds: string[], primaryClassId?: string) {
  await assertAdmin()
  const service = createServiceClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tc = service.from('teacher_classes' as any) as any

  // '' means explicitly no KV; undefined means not set → fall back to first class
  const effectivePrimary = primaryClassId === '' ? null : (primaryClassId ?? classIds[0] ?? null)

  // Replace all existing assignments
  await tc.delete().eq('teacher_id', profileId)
  if (classIds.length > 0) {
    await tc.insert(classIds.map(cid => ({ teacher_id: profileId, class_id: cid, is_primary: cid === effectivePrimary })))
  }

  // Sync profiles.class_id to primary class (or first class if no KV)
  await service.from('profiles').update({ class_id: effectivePrimary ?? classIds[0] ?? null }).eq('id', profileId)
}

export async function adminRenameStudent(profileId: string, fullName: string) {
  await assertAdmin()
  const trimmed = fullName.trim()
  const service = createServiceClient()

  const { error } = await service.from('profiles').update({ full_name: trimmed }).eq('id', profileId)
  if (error) throw new Error(error.message)

  // Sync Auth-Email so login and password-reset keep working
  const normalized = trimmed.toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9\s]/g, '').trim()
  const parts = normalized.split(/\s+/)
  const username = parts.length >= 2 ? `${parts[0]}.${parts.slice(1).join('')}` : parts[0]
  await adminFetch(`users/${profileId}`, 'PUT', { email: `${username}@klassenhub.local` })
}

export async function adminMoveStudent(profileId: string, classId: string) {
  await assertAdmin()
  const service = createServiceClient()
  const { error } = await service.from('profiles').update({ class_id: classId, joined_class_at: new Date().toISOString() }).eq('id', profileId)
  if (error) throw new Error(error.message)
}

export async function adminResetPassword(profileId: string) {
  await assertAdmin()
  const supabase = await createClient()
  const { data: profile } = await supabase.from('profiles').select('full_name,role').eq('id', profileId).single()
  if (!profile) throw new Error('Profil nicht gefunden')

  let password: string
  let username: string
  if (profile.role === 'teacher') {
    username = toTeacherUsername(profile.full_name)
    password = toTeacherPassword(profile.full_name)
  } else {
    username = profile.full_name // fallback — teacher actions handle their own
    password = `${profile.full_name.split(' ')[0].toLowerCase()}123`
  }
  const email = `${username}@klassenhub.local`

  const res = await adminFetch(`users/${profileId}`, 'PUT', { password, email })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.message ?? 'Passwort-Reset fehlgeschlagen')
  }

  return { password }
}

export async function adminDeleteUser(profileId: string) {
  await assertAdmin()

  const res = await adminFetch(`users/${profileId}`, 'DELETE')
  if (!res.ok && res.status !== 404) {
    const err = await res.json()
    throw new Error(err.message ?? 'Löschen fehlgeschlagen')
  }

  const service = createServiceClient()
  await service.from('profiles').delete().eq('id', profileId)
}
