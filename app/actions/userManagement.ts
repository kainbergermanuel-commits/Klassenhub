'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getAuth, getTeacherActiveClassId } from '@/lib/auth'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

function toUsername(fullName: string, role: 'student' | 'parent'): string {
  const normalized = fullName
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
  const parts = normalized.split(/\s+/)
  if (role === 'student') {
    // vorname.nachname
    return parts.length >= 2 ? `${parts[0]}.${parts.slice(1).join('')}` : parts[0]
  } else {
    // eltern.nachname
    const lastName = parts[parts.length - 1]
    return `eltern.${lastName}`
  }
}

function toPassword(fullName: string, role: 'student' | 'parent'): string {
  const normalized = fullName
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
  const parts = normalized.split(/\s+/)
  if (role === 'student') return `${parts[0]}123`
  return 'eltern123'
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

async function createAuthUserUnique(
  baseUsername: string,
  password: string,
  usedEmails: Set<string> = new Set(),
): Promise<{ authUser: { id: string }; username: string }> {
  let suffix = 0
  while (true) {
    const username = suffix === 0 ? baseUsername : `${baseUsername}${suffix + 1}`
    const email = `${username}@klassenhub.local`
    if (usedEmails.has(email)) { suffix++; continue }

    const res = await adminFetch('users', 'POST', { email, password, email_confirm: true })
    if (res.ok) {
      usedEmails.add(email)
      return { authUser: await res.json(), username }
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

async function assertTeacher() {
  const { profile } = await getAuth()
  if (!profile || profile.role !== 'teacher') throw new Error('Unauthorized')
  return profile
}

async function createStudentUnsafe(formData: FormData) {
  const teacherProfile = await assertTeacher()
  const classId = await getTeacherActiveClassId(teacherProfile)

  const fullName = (formData.get('full_name') as string).trim()
  const gender = null
  const baseUsername = toUsername(fullName, 'student')
  const password = toPassword(fullName, 'student')

  const { authUser, username } = await createAuthUserUnique(baseUsername, password)

  // Trigger hat bereits eine leere Profil-Zeile angelegt → upsert mit vollen Daten
  const service = createServiceClient()
  const { error } = await service.from('profiles').upsert({
    id: authUser.id,
    role: 'student',
    full_name: fullName,
    class_id: classId,
    gender,
    avatar_color: '#0F8A82',
    avatar_seed: null,
    is_admin: false,
    joined_class_at: new Date().toISOString(),
  } as never)
  if (error) {
    await adminFetch(`users/${authUser.id}`, 'DELETE')
    throw new Error(error.message)
  }

  return { username, password, fullName }
}

async function createParentUnsafe(formData: FormData) {
  const teacherProfile = await assertTeacher()
  const classId = await getTeacherActiveClassId(teacherProfile)

  const fullName = (formData.get('full_name') as string).trim()
  const childId = (formData.get('child_id') as string | null) || null
  const password = toPassword(fullName, 'parent')

  const service = createServiceClient()

  // Das Kind muss in der gewählten Klasse sitzen. Die ID kommt aus dem Formular
  // und geht danach über den Service-Client an RLS vorbei — ohne diese Prüfung
  // ließe sich jedes beliebige Kind der Schule verknüpfen.
  if (childId) {
    const { data: kind } = await service
      .from('profiles').select('id').eq('id', childId)
      .eq('role', 'student').eq('class_id', classId).maybeSingle()
    if (!kind) throw new Error('Das Kind gehört nicht zur gewählten Klasse')
  }

  // Gleicher Nachname heißt nicht gleiche Familie: ist eltern.<nachname> schon
  // vergeben, bekommt das neue Konto eltern.<nachname>2 usw. wie bei Schülern.
  const { authUser, username } = await createAuthUserUnique(toUsername(fullName, 'parent'), password)

  const { error } = await service.from('profiles').upsert({
    id: authUser.id,
    role: 'parent',
    full_name: fullName,
    class_id: classId,
    child_id: childId,
    avatar_color: '#C98A2B',
    avatar_seed: crypto.randomUUID(),
    is_admin: false,
  })
  if (error) {
    await adminFetch(`users/${authUser.id}`, 'DELETE')
    throw new Error(error.message)
  }

  // Verknüpfung mitschreiben, sonst taucht das Kind im Umschalter nicht auf.
  if (childId) {
    await service.from('parent_children').upsert({
      parent_id: authUser.id,
      student_id: childId,
      is_primary: true,
    } as never)
  }

  return { username, password, fullName }
}

type AnlageErgebnis =
  | { ok: true; username: string; password: string; fullName: string }
  | { ok: false; error: string }

/**
 * Fehler als Wert zurückgeben statt zu werfen: in Production ersetzt Next.js
 * den Text geworfener Fehler durch eine Standardmeldung. Dann sähe niemand,
 * ob die Klasse, das Kind oder Supabase das Problem war.
 */
async function alsErgebnis(
  anlegen: () => Promise<{ username: string; password: string; fullName: string }>,
): Promise<AnlageErgebnis> {
  try {
    return { ok: true, ...(await anlegen()) }
  } catch (err) {
    console.error('Konto-Anlage fehlgeschlagen:', err)
    return { ok: false, error: (err as Error).message || 'Unbekannter Fehler' }
  }
}

export async function createStudent(formData: FormData): Promise<AnlageErgebnis> {
  return alsErgebnis(() => createStudentUnsafe(formData))
}

export async function createParent(formData: FormData): Promise<AnlageErgebnis> {
  return alsErgebnis(() => createParentUnsafe(formData))
}

export async function resetPassword(profileId: string) {
  await assertTeacher()
  const supabase = await createClient()
  const { data: profile } = await supabase.from('profiles').select('full_name,role').eq('id', profileId).single()
  if (!profile) throw new Error('Profil nicht gefunden')

  const role = profile.role as 'student' | 'parent'
  const password = toPassword(profile.full_name, role)

  // Nur das Passwort zurücksetzen, den Benutzernamen nicht aus dem Namen neu
  // bilden: bei eltern.isakovic2 käme sonst eltern.isakovic heraus, also das
  // Login einer anderen Familie.
  const res = await adminFetch(`users/${profileId}`, 'PUT', { password })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.message ?? 'Passwort-Reset fehlgeschlagen')
  }

  return { password }
}

export async function deleteUser(profileId: string) {
  await assertTeacher()

  // Auth-Account löschen (Supabase löscht das Profil via CASCADE nicht automatisch)
  const res = await adminFetch(`users/${profileId}`, 'DELETE')
  if (!res.ok && res.status !== 404) {
    const err = await res.json()
    throw new Error(err.message ?? 'Löschen fehlgeschlagen')
  }

  // Profil explizit löschen
  const supabase = await createClient()
  await supabase.from('profiles').delete().eq('id', profileId)
}
