import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getAuth, getClass, getTeacherClasses } from '@/lib/auth'
import { getEffectiveAuth } from '@/lib/previewAuth'
import { todayISO, getMondayOfWeek } from '@/lib/date'
import BodyTheme from '@/components/layout/BodyTheme'
import Sidebar from '@/components/layout/Sidebar'
import MobileHeader from '@/components/layout/MobileHeader'
import RolePreviewBar from '@/components/layout/RolePreviewBar'
import type { Profile, Class } from '@/lib/types'

function buildNav(profile: Profile, hwOpen: number, reminderUnread: number, todoOpen: number, messageUnread: number) {
  const isTeacher = profile.role === 'teacher'

  const all = [
    { href: '/', icon: 'home', label: 'Start' },
    { href: '/hausaufgaben', icon: 'assignment', label: 'Hausübungen', badge: hwOpen || undefined },
    { href: '/dienste', icon: 'cleaning_services', label: 'Dienste' },
    { href: '/erinnerungen', icon: 'push_pin', label: 'Erinnerungen', badge: reminderUnread || undefined },
    ...(profile.role !== 'student' ? [
      { href: '/mitteilungsheft', icon: 'menu_book', label: 'Mitteilungsheft', badge: messageUnread || undefined },
    ] : []),
    { href: '/todo', icon: 'checklist', label: 'Wochen-To-Do', badge: todoOpen || undefined },
    { href: '/streaks', icon: 'local_fire_department', label: 'Streaks' },
    ...(isTeacher ? [
      { href: '/klasse', icon: 'groups', label: 'Klasse' },
    ] : []),
    ...(profile.is_admin ? [
      { href: '/admin', icon: 'admin_panel_settings', label: 'Admin' },
    ] : []),
    ...(profile.role === 'student' ? [
      { href: '/meine-klasse', icon: 'groups', label: 'Meine Klasse' },
      { href: '/stundenplan', icon: 'calendar_view_week', label: 'Stundenplan' },
    ] : []),
    ...(profile.role === 'parent' ? [
      { href: '/stundenplan', icon: 'calendar_view_week', label: 'Stundenplan' },
    ] : []),
    { href: '/einstellungen', icon: 'settings', label: 'Einstellungen' },
  ]

  const bottom = [
    { href: '/', icon: 'home', label: 'Start' },
    { href: '/hausaufgaben', icon: 'assignment', label: 'HÜ', badge: hwOpen || undefined },
    { href: '/dienste', icon: 'cleaning_services', label: 'Dienste' },
    { href: '/erinnerungen', icon: 'push_pin', label: 'Termine' },
    { href: '/todo', icon: 'checklist', label: 'To-Do', badge: todoOpen || undefined },
  ]

  return { all, bottom }
}

/** Ungelesene bevorstehende Erinnerungen je Rolle. */
async function computeReminderBadge(profile: Profile, userId: string, classId: string | null): Promise<number> {
  if (!classId) return 0
  if (profile.role === 'teacher') return 0
  const supabase = await createClient()
  const today = todayISO()

  const { data: upcoming } = await supabase
    .from('reminders').select('id').eq('class_id', classId).gte('event_date', today)
  const upcomingIds = (upcoming ?? []).map(r => r.id)
  if (upcomingIds.length === 0) return 0

  let studentId = userId
  if (profile.role === 'parent') {
    if (!profile.child_id) return upcomingIds.length
    studentId = profile.child_id
  }

  const { count } = await supabase
    .from('reminder_views').select('reminder_id', { count: 'exact', head: true })
    .eq('student_id', studentId).in('reminder_id', upcomingIds)
  return upcomingIds.length - (count ?? 0)
}

/** Ungelesene Mitteilungsheft-Nachrichten je Rolle. Schüler haben kein Heft. */
async function computeMessageBadge(profile: Profile, userId: string, classId: string | null): Promise<number> {
  if (!classId || profile.role === 'student') return 0
  const supabase = await createClient()

  if (profile.role === 'parent') {
    // Eigenes Heft: ungesehene Nachrichten der Lehrkraft (sender ≠ ich).
    const { data } = await supabase
      .from('messages').select('sender_id')
      .eq('parent_id', userId).is('seen_at', null)
    return (data ?? []).filter(m => m.sender_id !== userId).length
  }

  // Lehrkraft: ungesehene Eltern-Nachrichten (sender = Heftbesitzer) der Klasse.
  const { data } = await supabase
    .from('messages').select('parent_id,sender_id')
    .eq('class_id', classId).is('seen_at', null)
  return (data ?? []).filter(m => m.sender_id === m.parent_id).length
}

/** Anzahl für das HÜ-Badge je Rolle (offen bzw. aktiv). */
async function computeHwBadge(profile: Profile, classId: string | null): Promise<number> {
  if (!classId) return 0
  const supabase = await createClient()
  const today = todayISO()

  // Bevorstehende (aktive) HÜ der Klasse
  const { data: upcoming } = await supabase
    .from('homework').select('id').eq('class_id', classId).gte('due_date', today)
  const upcomingIds = (upcoming ?? []).map(h => h.id)

  // Lehrer: Anzahl aktiver HÜ
  if (profile.role === 'teacher') return upcomingIds.length
  if (upcomingIds.length === 0) return 0

  // Schüler: eigene offene; Elternteil: offene des Kindes
  let studentId = profile.id
  if (profile.role === 'parent') {
    if (!profile.child_id) return 0
    studentId = profile.child_id
  }

  const { count } = await supabase
    .from('homework_completions')
    .select('homework_id', { count: 'exact', head: true })
    .eq('student_id', studentId)
    .in('homework_id', upcomingIds)
  return upcomingIds.length - (count ?? 0)
}

/** Offene To-Dos dieser Woche je Rolle. */
async function computeTodoBadge(profile: Profile, userId: string, classId: string | null): Promise<number> {
  if (!classId) return 0
  const supabase = await createClient()
  const weekStart = getMondayOfWeek()

  const { data: todos } = await supabase
    .from('todos').select('id').eq('class_id', classId).eq('week_start', weekStart)
  const todoIds = (todos ?? []).map(t => t.id)
  if (todoIds.length === 0) return 0

  if (profile.role === 'teacher') return todoIds.length

  let studentId = userId
  if (profile.role === 'parent') {
    if (!profile.child_id) return 0
    studentId = profile.child_id
  }

  const { count } = await supabase
    .from('todo_completions').select('todo_id', { count: 'exact', head: true })
    .eq('student_id', studentId).in('todo_id', todoIds)
  return todoIds.length - (count ?? 0)
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // realProfile: echter Lehrer — nur für Preview-Bar-Sichtbarkeit
  const { user: realUser, profile: realProfile } = await getAuth()
  if (!realUser || !realProfile) redirect('/login')

  // effectiveProfile: aktive Rolle (Schüler/Elternteil während Vorschau)
  const { user, profile, activeClassId } = await getEffectiveAuth()

  const klass = await getClass(activeClassId)

  const teacherClasses = realProfile.role === 'teacher' ? await getTeacherClasses(realProfile.id) : []

  const [hwOpen, reminderUnread, todoOpen, messageUnread] = await Promise.all([
    computeHwBadge(profile, activeClassId),
    computeReminderBadge(profile, user.id, activeClassId),
    computeTodoBadge(profile, user.id, activeClassId),
    computeMessageBadge(profile, user.id, activeClassId),
  ])
  const { all, bottom } = buildNav(profile, hwOpen, reminderUnread, todoOpen, messageUnread)

  // Preview bar: nur für echten Lehrer
  let previewRole: string | null = null
  let previewName: string | null = null
  let previewStudentId: string | null = null
  let previewParentId: string | null = null
  let allStudents: { id: string; full_name: string }[] = []
  let allParents: { id: string; full_name: string }[] = []
  if (realProfile.is_admin && activeClassId) {
    const supabase = await createClient()
    const jar = await cookies()
    previewRole = jar.get('preview_role')?.value ?? null
    previewStudentId = jar.get('preview_student_id')?.value ?? null
    previewParentId = jar.get('preview_parent_id')?.value ?? null
    const [{ data: students }, { data: parents }] = await Promise.all([
      supabase.from('profiles').select('id,full_name').eq('class_id', activeClassId).eq('role', 'student').order('full_name'),
      supabase.from('profiles').select('id,full_name').eq('class_id', activeClassId).eq('role', 'parent').order('full_name'),
    ])
    allStudents = students ?? []
    allParents = parents ?? []
    if (previewRole === 'student') {
      const active = previewStudentId ? allStudents.find(s => s.id === previewStudentId) : allStudents[0]
      previewName = active?.full_name.split(' ')[0] ?? null
    } else if (previewRole === 'parent') {
      const active = previewParentId ? allParents.find(p => p.id === previewParentId) : allParents[0]
      previewName = active ? active.full_name.split(' ').slice(1).join(' ') || active.full_name : 'Elternteil'
    }
  }

  return (
    <div className="min-h-screen bg-kh-page p-3 md:p-4 md:px-[26px] md:py-[21px] max-md:p-0">
      {/* iOS: Notch-/Statusbar-Zone auf Mobile weiß färben (Login bleibt beige) */}
      <BodyTheme color="#ffffff" />
      <div className="flex min-h-[calc(100vh-1.5rem)] md:min-h-[calc(100vh-2rem)] max-md:min-h-screen rounded-[28px] max-md:rounded-none bg-white overflow-hidden shadow-[0_10px_40px_rgba(20,40,45,.08)]">
        <Sidebar profile={profile} klass={klass as Class | null} navItems={all} teacherClasses={teacherClasses} activeClassId={activeClassId} isPreview={!!previewRole} />
        <main className="flex-1 min-w-0 overflow-y-auto scrollbar-kh">
          <MobileHeader profile={profile} klass={klass as Class | null} navItems={all} teacherClasses={teacherClasses} activeClassId={activeClassId} />
          <div className="max-w-[1180px] mx-auto px-7 py-7 pb-20 max-md:px-4 max-md:py-5 max-md:pb-6 max-md:pt-[calc(env(safe-area-inset-top)+1.25rem)]">
            {children}
          </div>
        </main>
      </div>
      {realProfile.is_admin && (
        <RolePreviewBar currentPreview={previewRole} previewName={previewName} previewStudentId={previewStudentId} previewParentId={previewParentId} students={allStudents} parents={allParents} />
      )}
    </div>
  )
}
