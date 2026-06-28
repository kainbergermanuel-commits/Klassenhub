import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getAuth } from '@/lib/auth'
import AdminManageBar from '@/components/admin/AdminManageBar'
import AdminClassManageBar from '@/components/admin/AdminClassManageBar'

export default async function AdminPage() {
  const { user, profile } = await getAuth()
  if (!profile || !profile.is_admin) redirect('/')

  const supabase = await createClient()
  const [{ data: classes }, { data: teachers }, { data: teacherClassRows }] = await Promise.all([
    supabase.from('classes').select('id,name,school').order('name'),
    supabase.from('profiles').select('id,full_name,class_id,is_admin').eq('role', 'teacher').order('full_name'),
    supabase.from('teacher_classes' as string).select('teacher_id,class_id,is_primary') as unknown as Promise<{ data: { teacher_id: string; class_id: string; is_primary: boolean }[] | null }>,
  ])

  const teacherIds = (teachers ?? []).map(t => t.id)
  const { data: signInData } = teacherIds.length > 0
    ? await (supabase as any).rpc('get_teacher_last_sign_in', { teacher_ids: teacherIds })
    : { data: [] }
  const lastSignInMap = new Map<string, string>(
    (signInData ?? []).map((r: { id: string; last_sign_in_at: string }) => [r.id, r.last_sign_in_at])
  )

  // Map teacherId → classId[]
  const teacherClassMap = new Map<string, string[]>()
  const teacherPrimaryMap = new Map<string, string>()
  for (const row of teacherClassRows ?? []) {
    if (!teacherClassMap.has(row.teacher_id)) teacherClassMap.set(row.teacher_id, [])
    teacherClassMap.get(row.teacher_id)!.push(row.class_id)
    if (row.is_primary) teacherPrimaryMap.set(row.teacher_id, row.class_id)
  }
  // Map classId → teacherName[]
  const classTeacherMap = new Map<string, string[]>()
  for (const row of teacherClassRows ?? []) {
    const teacher = (teachers ?? []).find(t => t.id === row.teacher_id)
    if (!teacher) continue
    if (!classTeacherMap.has(row.class_id)) classTeacherMap.set(row.class_id, [])
    classTeacherMap.get(row.class_id)!.push(teacher.full_name)
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-[25px] font-extrabold text-kh-dark tracking-tight">Administration</h1>
        <p className="text-[13.5px] text-kh-muted font-medium mt-0.5">Klassen und Lehrpersonen verwalten</p>
      </div>

      {/* Klassen */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-bold text-[#9AA6A4] uppercase tracking-[.6px]">
            Klassen ({(classes ?? []).length})
          </div>
          <Link
            href="/admin/klassen/neu"
            className="flex items-center gap-1 text-xs font-bold text-kh-teal hover:text-kh-dark transition"
          >
            <span className="msym text-[16px]">add</span>
            Anlegen
          </Link>
        </div>
        <div className="flex flex-col gap-2">
          {(classes ?? []).map(c => {
            const teacherNames = classTeacherMap.get(c.id) ?? []
            return (
              <div key={c.id} className="bg-white rounded-2xl px-5 py-4 shadow-sm flex items-center gap-4">
                <span className="msym text-[22px] text-kh-teal" style={{ fontVariationSettings: "'FILL' 1" }}>groups</span>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[15px] text-kh-dark">{c.name}</div>
                  <div className="text-xs text-kh-muted font-medium mt-0.5">
                    {c.school}{teacherNames.length > 0 ? ` · ${teacherNames.join(', ')}` : ' · Keine Lehrperson'}
                  </div>
                </div>
                <AdminClassManageBar classId={c.id} name={c.name} />
              </div>
            )
          })}
          {(classes ?? []).length === 0 && (
            <div className="text-sm text-kh-muted font-medium">Noch keine Klassen angelegt.</div>
          )}
        </div>
      </div>

      {/* Lehrkräfte */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-bold text-[#9AA6A4] uppercase tracking-[.6px]">
            Lehrpersonen ({(teachers ?? []).length})
          </div>
          <Link
            href="/admin/lehrer/neu"
            className="flex items-center gap-1 text-xs font-bold text-kh-teal hover:text-kh-dark transition"
          >
            <span className="msym text-[16px]">add</span>
            Anlegen
          </Link>
        </div>
        <div className="flex flex-col gap-2">
          {(teachers ?? []).map(t => {
            const assignedClassIds = teacherClassMap.get(t.id) ?? [] as string[]
            const assignedClasses = assignedClassIds.map(cid => (classes ?? []).find(c => c.id === cid)).filter(Boolean)
            return (
              <div key={t.id} className="bg-white rounded-2xl px-5 py-4 shadow-sm flex items-center gap-4">
                <span className="msym text-[22px] text-kh-teal" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <div className="font-bold text-[15px] text-kh-dark">{t.full_name}</div>
                    {t.is_admin && (
                      <span className="msym text-[15px] text-kh-teal" title="Administrator" style={{ fontVariationSettings: "'FILL' 1" }}>shield_person</span>
                    )}
                  </div>
                  <div className="text-xs text-kh-muted font-medium mt-0.5">
                    {assignedClasses.length > 0
                      ? assignedClasses.map(c => c!.name).join(', ')
                      : 'Keine Klasse zugewiesen'}
                    {lastSignInMap.has(t.id) && (
                      <span className="ml-2 text-[11px] text-kh-muted/60">
                        · zuletzt {new Date(lastSignInMap.get(t.id)!).toLocaleDateString('de-AT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>
                <AdminManageBar
                  profileId={t.id}
                  fullName={t.full_name}
                  classes={classes ?? []}
                  assignedClassIds={assignedClassIds}
                  primaryClassId={teacherPrimaryMap.get(t.id)}
                  currentUserId={user?.id}
                />
              </div>
            )
          })}
          {(teachers ?? []).length === 0 && (
            <div className="text-sm text-kh-muted font-medium">Noch keine Lehrpersonen angelegt.</div>
          )}
        </div>
      </div>
    </>
  )
}
