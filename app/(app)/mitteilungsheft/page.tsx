import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveAuth } from '@/lib/previewAuth'
import { getTeacherClasses, getParentsOfStudents } from '@/lib/auth'
import ParentBooklet from '@/components/mitteilungsheft/ParentBooklet'
import TeacherBooklets from '@/components/mitteilungsheft/TeacherBooklets'
import AnimateIn from '@/components/ui/AnimateIn'
import type { SenderAvatar } from '@/components/mitteilungsheft/MessageThread'
import type { Message } from '@/lib/types'

export default async function MitteilungsheftPage() {
  const { user, profile, activeClassId } = await getEffectiveAuth()
  if (!user) redirect('/login')
  if (!activeClassId) redirect('/')
  // Schueler haben kein Heft – nur Eltern und Lehrkraft.
  if (profile.role === 'student') redirect('/')

  const supabase = await createClient()

  if (profile.role === 'parent') {
    const { data: messages } = await supabase
      .from('messages')
      .select('*')
      .eq('parent_id', user.id)
      // Ein Heft je Klasse, nicht je Elternteil: hinter jeder Klasse steht eine
      // andere Lehrperson. Ohne diesen Filter sähe eine Familie mit
      // Geschwistern einen gemischten Strom aus zwei Klassen, während ihre
      // Antwort nur in einer davon landet.
      .eq('class_id', activeClassId)
      .order('created_at', { ascending: true })

    // Anzeigenamen + Avatare der Absender (Lehrkraft[en] + eigener Name).
    const senderNames: Record<string, string> = { [user.id]: profile.full_name }
    const senderAvatars: Record<string, SenderAvatar> = {}
    const teacherIds = [...new Set((messages ?? []).map(m => m.sender_id).filter((id): id is string => !!id && id !== user.id))]
    if (teacherIds.length > 0) {
      const { data: teachers } = await supabase
        .from('profiles').select('id,full_name,avatar_color,avatar_seed,avatar_hair_color,avatar_skin_color').in('id', teacherIds)
      for (const t of teachers ?? []) {
        senderNames[t.id] = t.full_name
        senderAvatars[t.id] = { name: t.full_name, color: t.avatar_color, seed: t.avatar_seed, hairColor: t.avatar_hair_color, skinColor: t.avatar_skin_color }
      }
    }

    return (
      <AnimateIn delay={0}>
        <ParentBooklet
          messages={(messages ?? []) as Message[]}
          userId={user.id}
          classId={activeClassId}
          senderNames={senderNames}
          senderAvatars={senderAvatars}
        />
      </AnimateIn>
    )
  }

  // Lehrkraft: Hefte der aktiven Klasse + deren Nachrichten.
  // Für die Sammelnachricht zusätzlich Eltern/Schüler ALLER eigenen Klassen.
  const teacherClasses = await getTeacherClasses(profile.id)
  const classIds = teacherClasses.map(c => c.id)

  const [{ data: allStudents }, { data: messages }, { data: broadcastMessages }] = await Promise.all([
    supabase.from('profiles').select('id,full_name,class_id,avatar_color,avatar_seed,avatar_hair_color,avatar_skin_color').in('class_id', classIds).eq('role', 'student').order('full_name'),
    supabase.from('messages').select('*').eq('class_id', activeClassId).order('created_at', { ascending: true }),
    // Sammelnachrichten über ALLE eigenen Klassen (für die klassenübergreifende Übersicht).
    supabase.from('messages').select('*').in('class_id', classIds).not('broadcast_id', 'is', null).order('created_at', { ascending: true }),
  ])

  // Eltern über ihre Kinder holen statt über profiles.class_id: ein Konto mit
  // Geschwistern in zwei Klassen trägt nur eine Klasse und fehlte sonst in der
  // Heft-Liste der anderen — die Lehrkraft könnte die Familie nicht erreichen.
  const { parents: allParents, childrenByParent } = await getParentsOfStudents(
    (allStudents ?? []).map(s => s.id),
  )

  const students = (allStudents ?? []).filter(s => s.class_id === activeClassId)
  const idsAktiveKlasse = new Set(students.map(s => s.id))
  // Heft-Liste zeigt weiterhin nur die aktive Klasse: ein Elternteil gehört
  // dazu, sobald eines seiner Kinder in dieser Klasse sitzt.
  const parents = allParents.filter(p =>
    (childrenByParent[p.id] ?? []).some(id => idsAktiveKlasse.has(id)),
  )

  return (
    <AnimateIn delay={0}>
      <TeacherBooklets
        parents={parents}
        students={students}
        allParents={allParents}
        allStudents={allStudents ?? []}
        classes={teacherClasses.map(c => ({ id: c.id, name: c.name }))}
        messages={(messages ?? []) as Message[]}
        broadcastMessages={(broadcastMessages ?? []) as Message[]}
        userId={user.id}
        ownName={profile.full_name}
        classId={activeClassId}
      />
    </AnimateIn>
  )
}
