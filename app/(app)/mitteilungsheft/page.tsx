import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveAuth } from '@/lib/previewAuth'
import ParentBooklet from '@/components/mitteilungsheft/ParentBooklet'
import TeacherBooklets from '@/components/mitteilungsheft/TeacherBooklets'
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
      <ParentBooklet
        messages={(messages ?? []) as Message[]}
        userId={user.id}
        classId={activeClassId}
        senderNames={senderNames}
        senderAvatars={senderAvatars}
      />
    )
  }

  // Lehrkraft: alle Hefte (Eltern) der aktiven Klasse + deren Nachrichten
  const [{ data: parents }, { data: students }, { data: messages }] = await Promise.all([
    supabase.from('profiles').select('id,full_name,child_id,avatar_color,avatar_seed,avatar_hair_color,avatar_skin_color').eq('class_id', activeClassId).eq('role', 'parent').order('full_name'),
    supabase.from('profiles').select('id,full_name,avatar_color,avatar_seed,avatar_hair_color,avatar_skin_color').eq('class_id', activeClassId).eq('role', 'student').order('full_name'),
    supabase.from('messages').select('*').eq('class_id', activeClassId).order('created_at', { ascending: true }),
  ])

  return (
    <TeacherBooklets
      parents={parents ?? []}
      students={students ?? []}
      messages={(messages ?? []) as Message[]}
      userId={user.id}
      ownName={profile.full_name}
      classId={activeClassId}
    />
  )
}
