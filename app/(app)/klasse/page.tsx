import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveAuth } from '@/lib/previewAuth'
import type { Profile } from '@/lib/types'

export default async function KlassePage() {
  const { user, profile } = await getEffectiveAuth()
  if (!user) redirect('/login')
  if (!profile || profile.role !== 'teacher' || !profile.class_id) redirect('/')

  const supabase = await createClient()
  const { data: klass } = await supabase.from('classes').select('*').eq('id', profile.class_id).single()

  const [{ data: students }, { data: parents }] = await Promise.all([
    supabase.from('profiles').select('*').eq('class_id', profile.class_id).eq('role', 'student').order('full_name'),
    supabase.from('profiles').select('*').eq('class_id', profile.class_id).eq('role', 'parent').order('full_name'),
  ])

  const studentList = (students ?? []) as Profile[]
  const parentList = (parents ?? []) as Profile[]

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
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {studentList.map(s => (
            <div key={s.id} className="bg-white rounded-2xl px-4 py-3.5 shadow-sm flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-[12px] flex items-center justify-center font-extrabold text-sm text-white flex-shrink-0"
                style={{ background: s.avatar_color }}
              >
                {s.full_name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[15px] text-kh-dark truncate">{s.full_name}</div>
                <div className="text-xs text-kh-muted font-medium mt-0.5">Schüler:in</div>
              </div>
            </div>
          ))}
          {studentList.length === 0 && (
            <p className="text-sm text-kh-muted font-medium col-span-2">Noch keine Schüler:innen angelegt.</p>
          )}
        </div>
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
                <div
                  className="w-10 h-10 rounded-[12px] flex items-center justify-center font-extrabold text-sm text-white flex-shrink-0"
                  style={{ background: p.avatar_color }}
                >
                  {p.full_name.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[15px] text-kh-dark truncate">{p.full_name}</div>
                  <div className="text-xs text-kh-muted font-medium mt-0.5">Elternteil</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
