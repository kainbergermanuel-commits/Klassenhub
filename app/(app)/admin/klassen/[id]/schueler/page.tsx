import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getAuth } from '@/lib/auth'
import StudentManageRow from './StudentManageRow'
import StudentAddForm from './StudentAddForm'

export default async function KlasseSchuelerPage({ params }: { params: Promise<{ id: string }> }) {
  const { profile } = await getAuth()
  if (!profile || !profile.is_admin) redirect('/')

  const { id: classId } = await params
  const supabase = await createClient()

  const [{ data: klass }, { data: students }, { data: allClasses }] = await Promise.all([
    supabase.from('classes').select('id,name,school').eq('id', classId).single(),
    supabase.from('profiles').select('id,full_name,avatar_color,avatar_seed,avatar_hair_color,avatar_skin_color').eq('class_id', classId).eq('role', 'student').order('full_name'),
    supabase.from('classes').select('id,name').order('name'),
  ])

  if (!klass) redirect('/admin')

  const otherClasses = (allClasses ?? []).filter(c => c.id !== classId)

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/admin" className="flex items-center gap-1 text-kh-muted text-sm font-semibold hover:text-kh-dark transition">
          <span className="msym text-[18px]">arrow_back</span>
          Admin
        </Link>
        <span className="text-kh-border">/</span>
        <span className="text-sm font-semibold text-kh-dark">Klasse {klass.name} · Schüler:innen</span>
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-bold text-[#9AA6A4] uppercase tracking-[.6px]">
          Schüler:innen ({(students ?? []).length})
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-6">
        {(students ?? []).map(s => (
          <StudentManageRow
            key={s.id}
            student={s}
            classId={classId}
            otherClasses={otherClasses}
          />
        ))}
        {(students ?? []).length === 0 && (
          <div className="text-sm text-kh-muted font-medium py-4 text-center">Noch keine Schüler:innen in dieser Klasse.</div>
        )}
      </div>

      <div className="border-t border-kh-border pt-5">
        <div className="text-xs font-bold text-[#9AA6A4] uppercase tracking-[.6px] mb-3">Hinzufügen</div>
        <StudentAddForm classId={classId} />
      </div>
    </div>
  )
}
