import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveAuth } from '@/lib/previewAuth'
import StudentHomeworkPanel from '@/components/klasse/StudentHomeworkPanel'
import Avatar from '@/components/ui/Avatar'
import type { Profile, Homework } from '@/lib/types'

export default async function KlassePage() {
  const { user, profile } = await getEffectiveAuth()
  if (!user) redirect('/login')
  if (!profile || profile.role !== 'teacher' || !profile.class_id) redirect('/')

  const supabase = await createClient()
  const { data: klass } = await supabase.from('classes').select('*').eq('id', profile.class_id).single()

  const [{ data: students }, { data: parents }, { data: allHomework }] = await Promise.all([
    supabase.from('profiles').select('*').eq('class_id', profile.class_id).eq('role', 'student').order('full_name'),
    supabase.from('profiles').select('*').eq('class_id', profile.class_id).eq('role', 'parent').order('full_name'),
    supabase.from('homework').select('*').eq('class_id', profile.class_id).order('due_date', { ascending: false }),
  ])

  const studentList = (students ?? []) as Profile[]
  const parentList = (parents ?? []) as Profile[]
  const studentById = Object.fromEntries(studentList.map(s => [s.id, s]))
  const homeworkList = allHomework ?? []

  // Completions für alle Schüler laden
  const hwIds = homeworkList.map(h => h.id)
  const completionsByStudent: Record<string, string[]> = {}
  if (hwIds.length > 0) {
    const { data: completions } = await supabase
      .from('homework_completions').select('homework_id,student_id').in('homework_id', hwIds)
    for (const c of completions ?? []) {
      if (!completionsByStudent[c.student_id]) completionsByStudent[c.student_id] = []
      completionsByStudent[c.student_id].push(c.homework_id)
    }
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-[25px] font-extrabold text-kh-dark tracking-tight">Klasse {klass?.name}</h1>
        <p className="text-[13.5px] text-kh-muted font-medium mt-0.5">
          {klass?.school} · {studentList.length} Schüler:innen · {parentList.length} Elternteile
        </p>
      </div>

      {/* Schüler */}
      <div className="mb-6">
        <div className="text-xs font-bold text-[#9AA6A4] uppercase tracking-[.6px] mb-3">
          Schüler:innen ({studentList.length})
        </div>
        <StudentHomeworkPanel
          students={studentList}
          homework={homeworkList}
          completionsByStudent={completionsByStudent}
        />
      </div>

      {/* Eltern */}
      {parentList.length > 0 && (
        <div>
          <div className="text-xs font-bold text-[#9AA6A4] uppercase tracking-[.6px] mb-3">
            Elternteile ({parentList.length})
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {parentList.map(p => (
              <div key={p.id} className="bg-white rounded-2xl px-4 py-3.5 shadow-sm flex items-center gap-3">
              <Avatar name={p.full_name} color={p.avatar_color} seed={p.avatar_seed} hairColor={p.avatar_hair_color} skinColor={p.avatar_skin_color} size={40} />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[15px] text-kh-dark truncate">{p.full_name}</div>
                  <div className="text-xs text-kh-muted font-medium mt-0.5">
                    {p.child_id && studentById[p.child_id]
                      ? `Elternteil von ${studentById[p.child_id].full_name.split(' ')[0]}`
                      : 'Elternteil'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
