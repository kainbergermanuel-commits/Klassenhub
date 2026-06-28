import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveAuth } from '@/lib/previewAuth'
import StudentCard from '@/components/klasse/StudentCard'
import TeacherCard from '@/components/klasse/TeacherCard'
import type { TeacherSubject } from '@/app/actions/saveTeacherSubjects'

export default async function MeineKlassePage() {
  const { user, profile } = await getEffectiveAuth()
  if (!user || !profile) redirect('/login')
  if (profile.role !== 'student') redirect('/')
  if (!profile.class_id) redirect('/')

  const supabase = await createClient()

  // Lehrer via teacher_classes laden (Multi-Class-korrekt)
  const tcRows = await (supabase
    .from('teacher_classes' as string)
    .select('teacher_id,is_primary,subjects')
    .eq('class_id', profile.class_id) as unknown as Promise<{ data: { teacher_id: string; is_primary: boolean; subjects: TeacherSubject[] | null }[] | null }>)
    .then(r => r.data ?? [])
  const teacherIds = tcRows.map(r => r.teacher_id)
  const homeroomTeacherIds = new Set(tcRows.filter(r => r.is_primary).map(r => r.teacher_id))
  const teacherSubjectsMap = new Map(tcRows.map(r => [r.teacher_id, r.subjects ?? []]))

  const [{ data: studentsRaw }, { data: klass }, { data: teachersRaw }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, avatar_color, avatar_seed, avatar_hair_color, avatar_skin_color, special_role')
      .eq('class_id', profile.class_id)
      .eq('role', 'student')
      .order('full_name'),
    supabase.from('classes').select('name').eq('id', profile.class_id).single(),
    teacherIds.length > 0
      ? supabase
          .from('profiles')
          .select('id, full_name, avatar_color, avatar_seed, avatar_hair_color, avatar_skin_color, is_admin')
          .in('id', teacherIds)
          .order('full_name')
      : Promise.resolve({ data: [] }),
  ])

  const teachers = teachersRaw ?? []

  // Sortierung: eigene Card zuerst, dann Klassensprecher:in, dann Stv., dann Rest (alphabetisch)
  const priority = (s: { id: string; special_role: string | null }) => {
    if (s.id === user.id) return 0
    if (s.special_role === 'klassensprecher') return 1
    if (s.special_role === 'stv_klassensprecher') return 2
    return 3
  }
  const students = (studentsRaw ?? [])
    .slice()
    .sort((a, b) => priority(a) - priority(b) || a.full_name.localeCompare(b.full_name))

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-[26px] font-extrabold text-kh-dark tracking-tight">Meine Klasse</h1>
        {klass && <p className="text-sm text-kh-muted font-medium mt-1">Klasse {klass.name} · {students.length} Schüler:innen</p>}
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {teachers.map((t, i) => (
          <TeacherCard
            key={t.id}
            full_name={t.full_name}
            avatar_color={t.avatar_color ?? '#0F8A82'}
            avatar_seed={t.avatar_seed ?? null}
            avatar_hair_color={t.avatar_hair_color ?? null}
            avatar_skin_color={t.avatar_skin_color ?? null}
            subjects={teacherSubjectsMap.get(t.id) ?? []}
            is_admin={t.is_admin ?? false}
            is_homeroom={homeroomTeacherIds.has(t.id)}
            index={i}
          />
        ))}
        {students.map((s, i) => (
          <StudentCard
            key={s.id}
            id={s.id}
            full_name={s.full_name}
            avatar_color={s.avatar_color ?? '#0F8A82'}
            avatar_seed={s.avatar_seed ?? null}
            avatar_hair_color={s.avatar_hair_color ?? null}
            avatar_skin_color={s.avatar_skin_color ?? null}
            special_role={s.special_role ?? null}
            isMe={s.id === user.id}
            index={teachers.length + i}
          />
        ))}
      </div>
    </div>
  )
}
