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
  const [{ data: studentsRaw }, { data: klass }, { data: teacherRaw }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, avatar_color, avatar_seed, avatar_hair_color, avatar_skin_color, special_role, gender')
      .eq('class_id', profile.class_id)
      .eq('role', 'student')
      .order('full_name'),
    supabase.from('classes').select('name').eq('id', profile.class_id).single(),
    supabase
      .from('profiles')
      .select('id, full_name, avatar_color, avatar_seed, avatar_hair_color, avatar_skin_color, subjects')
      .eq('class_id', profile.class_id)
      .eq('role', 'teacher')
      .single(),
  ])

  const teacherSubjects = (teacherRaw?.subjects as TeacherSubject[] | null) ?? []

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
        {teacherRaw && (
          <TeacherCard
            full_name={teacherRaw.full_name}
            avatar_color={teacherRaw.avatar_color ?? '#0F8A82'}
            avatar_seed={teacherRaw.avatar_seed ?? null}
            avatar_hair_color={teacherRaw.avatar_hair_color ?? null}
            avatar_skin_color={teacherRaw.avatar_skin_color ?? null}
            subjects={teacherSubjects}
            index={0}
          />
        )}
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
            gender={s.gender ?? null}
            isMe={s.id === user.id}
            index={teacherRaw ? i + 1 : i}
          />
        ))}
      </div>
    </div>
  )
}
