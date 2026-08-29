import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveAuth } from '@/lib/previewAuth'
import { getClass } from '@/lib/auth'
import { getStundenplanMondayOfWeek, getWeekNumber, addDaysISO, todayISO } from '@/lib/date'
import TimetableGrid from './TimetableGrid'
import ClassTimetableEditor from './ClassTimetableEditor'
import TeacherTimetableEditor from './TeacherTimetableEditor'
import SupervisionEditor from './SupervisionEditor'
import PageHeader from '@/components/layout/PageHeader'
import AnimateIn from '@/components/ui/AnimateIn'

function weekLabel(): string {
  const mondayStr = getStundenplanMondayOfWeek()
  const monday = new Date(`${mondayStr}T00:00:00`)
  const friday = new Date(monday)
  friday.setDate(monday.getDate() + 4)
  const kw = getWeekNumber(mondayStr)
  const fmt = (d: Date) => d.toLocaleDateString('de-AT', { day: 'numeric', month: 'numeric' })
  return `KW ${kw} · ${fmt(monday)} – ${fmt(friday)}`
}

export default async function StundenplanPage(
  { searchParams }: { searchParams: Promise<{ ansicht?: string }> },
) {
  const { user, profile, activeClassId } = await getEffectiveAuth()
  if (!user || !profile) redirect('/login')

  const supabaseCommon = await createClient()
  // Fächer-Katalog (Admin-verwaltet, siehe supabase/add-subjects-catalog.sql) —
  // für alle Rollen dieselbe Quelle, damit Lehrer-Vorlage und Kind-Ansicht nie
  // auseinanderlaufen können.
  const { data: subjectRows } = await (supabaseCommon
    .from('subjects' as never)
    .select('label,short,color')
    .order('sort_order') as unknown as Promise<{ data: { label: string; short: string; color: string }[] | null }>)
  const subjects = subjectRows ?? []

  // ─── LEHRER: eigener Plan + Standard-Stundenplan der Klasse ────────────────
  // Zwei verschiedene Achsen unter einem Umschalter (kein eigener Route):
  //  • "Mein Plan"    → teacher_timetable_entries, die eigene Woche quer über
  //                     alle Klassen, mit Klassen-Label pro Stunde. Standard,
  //                     weil das die häufigste Frage ist ("wo muss ich hin?").
  //  • "Klassenplan"  → class_timetable_entries, die Vorlage für die Kinder.
  if (profile.role === 'teacher') {
    if (!activeClassId) redirect('/')
    const view = (await searchParams).ansicht === 'klasse' ? 'klasse' : 'mein'

    const [{ data: teacherEntries }, { data: templateEntries }, { data: pushRow }, { data: supervisionRows }, klass] = await Promise.all([
      (supabaseCommon
        .from('teacher_timetable_entries' as never)
        .select('day,slot,subject,class_label')
        .eq('teacher_id', user.id)
        .order('day').order('slot') as unknown as Promise<{ data: { day: number; slot: number; subject: string; class_label: string }[] | null }>),
      (supabaseCommon
        .from('class_timetable_entries' as never)
        .select('day,slot,subject')
        .eq('class_id', activeClassId)
        .order('day').order('slot') as unknown as Promise<{ data: { day: number; slot: number; subject: string }[] | null }>),
      (supabaseCommon
        .from('class_timetable_pushes' as never)
        .select('pushed_at')
        .eq('class_id', activeClassId)
        .maybeSingle() as unknown as Promise<{ data: { pushed_at: string } | null }>),
      // Gangaufsichten der Lehrperson (siehe supabase/add-teacher-supervisions.sql).
      // Fehlt die Tabelle noch (Migration nicht eingespielt), liefert Supabase
      // data=null → leere Liste, die Seite bleibt funktionsfähig.
      (supabaseCommon
        .from('teacher_supervisions' as never)
        .select('day,break_slot,location')
        .eq('teacher_id', user.id)
        .order('day').order('break_slot') as unknown as Promise<{ data: { day: number; break_slot: number; location: string }[] | null }>),
      getClass(activeClassId),
    ])

    const tabs = [
      { key: 'mein', label: 'Mein Plan', href: '/stundenplan' },
      { key: 'klasse', label: 'Klassenplan', href: '/stundenplan?ansicht=klasse' },
    ]

    return (
      <div>
        <PageHeader
          icon="calendar_view_week"
          title="Stundenplan"
          subtitle={view === 'mein'
            ? 'Deine eigene Woche — welches Fach in welcher Klasse'
            : 'Standard-Stundenplan der Klasse erstellen und an alle Kinder senden'}
          gradient="from-[#2F86C5] to-[#56AEE6]"
        />
        {/* Umschalter im "verschlankten" Stil aus dem Design-Vergleich: flache
            Kapsel mit Verlaufs-Unterstrich unter dem aktiven Tab statt gefüllter
            Pille. Bewusst WEISS (nicht kh-page): Auf dem beige Seitenhintergrund
            würde eine gleichfarbige Kapsel grau wirken und der weiche
            Neumorphismus-Schatten unsichtbar bleiben — die weiße Fläche hebt
            sich klar ab und der Schlagschatten wird sichtbar. Der aktive Tab
            trägt einen 3px starken Verlaufs-Unterstrich über die VOLLE
            Tab-Breite (background-strip statt border, damit ein Farbverlauf
            möglich ist), im selben Blau wie der Seitenkopf; overflow-hidden
            hält den Strich an den Kapselrundungen sauber. */}
        <div
          className="inline-flex overflow-hidden rounded-xl mb-4 -mt-2"
          style={{
            background: 'linear-gradient(180deg, #FBF7EE 0%, #FFFFFF 100%)',
            boxShadow: '0 1px 2px rgba(20,40,45,.05), 0 10px 24px rgba(20,40,45,.14)',
          }}
        >
          {tabs.map(t => {
            const active = view === t.key
            return (
              <Link
                key={t.key}
                href={t.href}
                className={`px-5 py-2 text-center text-[13px] font-semibold transition-[color,transform] duration-150 ${
                  active ? 'text-[#2F86C5]' : 'text-kh-muted hover:text-kh-dark hover:-translate-y-px'
                }`}
                style={{
                  minWidth: '5rem',
                  ...(active
                    ? {
                        backgroundImage: 'linear-gradient(90deg, #2F86C5 0%, #56AEE6 100%)',
                        backgroundSize: '100% 3px',
                        backgroundPosition: 'bottom',
                        backgroundRepeat: 'no-repeat',
                      }
                    : {}),
                }}
              >
                {t.label}
              </Link>
            )
          })}
        </div>
        <AnimateIn delay={0} className="kh-card px-5 py-5">
          {view === 'mein' ? (
            <TeacherTimetableEditor
              entries={(teacherEntries ?? []).map(e => ({
                day: e.day, slot: e.slot, subject: e.subject, classLabel: e.class_label ?? '',
              }))}
              subjects={subjects}
              activeClassName={klass?.name ?? null}
            />
          ) : (
            <ClassTimetableEditor entries={templateEntries ?? []} subjects={subjects} lastPushedAt={pushRow?.pushed_at ?? null} />
          )}
        </AnimateIn>

        {/* Gangaufsichten — eigene Karte unter dem persönlichen Plan, nur im
            "Mein Plan"-Tab (der Klassenplan hat keine persönlichen Aufsichten). */}
        {view === 'mein' && (
          <AnimateIn delay={80} className="kh-card px-5 py-5 mt-4">
            <SupervisionEditor
              initial={(supervisionRows ?? []).map(s => ({ day: s.day, breakSlot: s.break_slot, location: s.location ?? '' }))}
            />
          </AnimateIn>
        )}
      </div>
    )
  }

  // Sonst nur Schüler und Eltern
  if (profile.role !== 'student' && profile.role !== 'parent') redirect('/')

  const studentId = profile.role === 'student'
    ? user.id
    : profile.child_id ?? null

  if (!studentId) {
    return (
      <div>
        <PageHeader icon="calendar_view_week" title="Mein Stundenplan" gradient="from-[#2F86C5] to-[#56AEE6]" />
        <p className="text-sm text-kh-muted font-medium -mt-4">Kein Kind verknüpft.</p>
      </div>
    )
  }

  const supabase = supabaseCommon
  const { data: entries } = await (supabase
    .from('timetable_entries' as never)
    .select('day,slot,subject')
    .eq('student_id', studentId)
    .order('day').order('slot') as unknown as Promise<{ data: { day: number; slot: number; subject: string }[] | null }>)

  const isReadonly = profile.role === 'parent'

  // HÜ-Marker: offene Hausübungen dieser Woche pro Wochentag+Fach, für die
  // Darstellung direkt im Stundenplan ("morgen fällig" am jeweiligen Fach).
  const monday = getStundenplanMondayOfWeek()
  const friday = addDaysISO(4, new Date(`${monday}T00:00:00`))
  const today = todayISO()

  const { data: studentProfile } = await supabase
    .from('profiles').select('class_id').eq('id', studentId).single()
  const classId = studentProfile?.class_id ?? null

  let dueMarkers: { day: number; subject: string; title: string; done: boolean }[] = []
  if (classId) {
    const { data: weekHomework } = await supabase
      .from('homework')
      .select('id,subject,title,due_date')
      .eq('class_id', classId)
      // Nur freigegebene HÜ — eine noch nicht bestätigte Einreichung darf
      // keine Stunde markieren (siehe Kommentar in app/(app)/page.tsx).
      .eq('status', 'published')
      .gte('due_date', monday <= today ? today : monday)
      .lte('due_date', friday)

    const homework = weekHomework ?? []
    const hwIds = homework.map(h => h.id)
    const { data: completions } = hwIds.length > 0
      ? await supabase.from('homework_completions').select('homework_id').eq('student_id', studentId).in('homework_id', hwIds)
      : { data: [] }
    const doneIds = new Set((completions ?? []).map(c => c.homework_id))

    dueMarkers = homework
      .map(h => {
        const dayOffset = Math.round((new Date(`${h.due_date}T00:00:00`).getTime() - new Date(`${monday}T00:00:00`).getTime()) / 86400000)
        return { day: dayOffset + 1, subject: h.subject, title: h.title, done: doneIds.has(h.id) }
      })
      .filter(m => m.day >= 1 && m.day <= 5)
  }

  // Erinnerungs-Marker: nicht fachgebunden, daher neben dem Tages-Kürzel
  // statt an einer einzelnen Fach-Zelle. RLS filtert Targeting/Sichtbarkeit
  // (target_student_ids, status=published) bereits serverseitig pro Nutzer.
  let reminderMarkers: { day: number; title: string }[] = []
  if (classId) {
    const { data: weekReminders } = await supabase
      .from('reminders')
      .select('event_date,title')
      .eq('class_id', classId)
      .gte('event_date', monday <= today ? today : monday)
      .lte('event_date', friday)

    reminderMarkers = (weekReminders ?? [])
      .map(r => {
        const dayOffset = Math.round((new Date(`${r.event_date}T00:00:00`).getTime() - new Date(`${monday}T00:00:00`).getTime()) / 86400000)
        return { day: dayOffset + 1, title: r.title }
      })
      .filter(m => m.day >= 1 && m.day <= 5)
  }

  return (
    <div>
      <PageHeader
        icon="calendar_view_week"
        title="Mein Stundenplan"
        subtitle={`${weekLabel()}${isReadonly ? ' · Ansicht deines Kindes' : ''}`}
        gradient="from-[#2F86C5] to-[#56AEE6]"
      />
      <AnimateIn delay={0} className="kh-card px-5 py-5">
        <TimetableGrid entries={entries ?? []} subjects={subjects} readonly={isReadonly} dueMarkers={dueMarkers} reminderMarkers={reminderMarkers} />
      </AnimateIn>
    </div>
  )
}
