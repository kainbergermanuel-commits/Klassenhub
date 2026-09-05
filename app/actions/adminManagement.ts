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
    } as never)

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

  // '' = explicitly no KV; valid classId = that class is KV
  const effectivePrimary = (primaryClassId && classIds.includes(primaryClassId)) ? primaryClassId : null

  // Bestehende Fächer je Klasse sichern, damit sie beim Neuzuweisen nicht verloren gehen
  const { data: existing } = await tc.select('class_id, subjects').eq('teacher_id', profileId)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subjectsByClass = new Map<string, unknown>((existing ?? []).map((r: any) => [r.class_id, r.subjects]))

  // Replace all existing assignments (Fächer der weiterhin zugewiesenen Klassen bleiben erhalten)
  await tc.delete().eq('teacher_id', profileId)
  if (classIds.length > 0) {
    await tc.insert(classIds.map(cid => ({
      teacher_id: profileId,
      class_id: cid,
      is_primary: cid === effectivePrimary,
      subjects: subjectsByClass.get(cid) ?? null,
    })))
  }

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
  const { error } = await (service.from('profiles').update({ class_id: classId, joined_class_at: new Date().toISOString() } as never).eq('id', profileId) as unknown as Promise<{ error: { message: string } | null }>)
  if (error) throw new Error(error.message)
}

export async function adminResetPassword(profileId: string) {
  await assertAdmin()
  const supabase = await createClient()
  const { data: profile } = await supabase.from('profiles').select('full_name,role').eq('id', profileId).single()
  if (!profile) throw new Error('Profil nicht gefunden')

  const password = profile.role === 'teacher'
    ? toTeacherPassword(profile.full_name)
    : `${profile.full_name.split(' ')[0].toLowerCase()}123`

  // Nur das Passwort setzen, NICHT die E-Mail (= den Benutzernamen).
  //
  // Vorher wurde die Adresse aus dem Namen neu berechnet. Das schlug bei
  // Schüler:innen und Eltern immer fehl, weil dort der volle Name mit
  // Leerzeichen eingesetzt wurde ("Ryan Wilson@klassenhub.local") und der
  // Reset mit 500 endete. Und selbst bei Lehrkräften war es falsch: die
  // Anlage hängt bei Namensgleichheit eine Ziffer an (vorname.nachname2),
  // ein neu berechneter Wert hätte den Login stillschweigend umbenannt und
  // die gedruckten Zugangszettel entwertet.
  const res = await adminFetch(`users/${profileId}`, 'PUT', { password })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.message ?? 'Passwort-Reset fehlgeschlagen')
  }

  // Das Konto steht wieder auf einem Standardpasswort nach bekanntem Muster.
  // Deshalb den Willkommens-Screen erneut scharfstellen: beim nächsten Login
  // wird wieder ein eigenes Passwort angeboten. Ohne das bliebe genau der
  // häufigste Fall, "Passwort vergessen", dauerhaft auf dem Standardwert.
  const service = createServiceClient()
  await service.from('profiles').update({ onboarded_at: null }).eq('id', profileId)

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
