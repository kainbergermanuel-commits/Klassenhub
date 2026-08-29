import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveAuth } from '@/lib/previewAuth'
import { matchChild } from '@/lib/auth'
import HomeworkList from '@/components/homework/HomeworkList'
import AnimateIn from '@/components/ui/AnimateIn'
import { loadSubjectsCatalog } from '@/lib/subjectsCatalog'
import { todayISO, schoolYearStartISO, isOver, isActionable } from '@/lib/date'
import { effectiveDueDate } from '@/lib/streak'
import type { HomeworkWithStatus } from '@/lib/types'

export default async function HomeworkPage() {
  const { user, profile, activeClassId } = await getEffectiveAuth()
  if (!user) redirect('/login')
  if (!activeClassId) redirect('/')

  const supabase = await createClient()

  // Fächer-Katalog parallel zur Hausübungsliste laden (Promise.all statt
  // sequenziellem Await) — kostet dadurch keine zusätzliche wahrgenommene
  // Ladezeit, nur ein 13-Zeilen-Query mehr im selben Bündel.
  const [{ data: homeworkRaw }, subjects] = await Promise.all([
    supabase
      .from('homework')
      .select('*')
      .eq('class_id', activeClassId)
      // Auf das laufende Schuljahr begrenzt — wie Startseite und alle
      // Server-Actions. Ohne die Grenze lädt die Seite ab dem zweiten Jahr
      // auch alte Schuljahre und rendert sie als Karten.
      .gte('due_date', schoolYearStartISO())
      .order('due_date', { ascending: true }),
    loadSubjectsCatalog(supabase),
  ])

  const homework = homeworkRaw ?? []

  let homeworkWithStatus: HomeworkWithStatus[]
  // Für den Bestätigen-Knopf der Eltern (Server-Action braucht die Kind-ID).
  let childId: string | null = null

  if (profile.role === 'student') {
    // confirmed_by_parent_at kommt mit derselben Abfrage mit (eine Spalte
    // mehr), die Zeitkristall-Verlängerungen parallel dazu.
    const [{ data: completions }, { data: extensions }] = await Promise.all([
      supabase.from('homework_completions').select('homework_id,confirmed_by_parent_at').eq('student_id', user.id),
      supabase.from('homework_extensions').select('homework_id,extra_days').eq('student_id', user.id),
    ])

    const doneIds = new Set((completions ?? []).map(c => c.homework_id))
    const confirmedIds = new Set(
      (completions ?? []).filter(c => c.confirmed_by_parent_at).map(c => c.homework_id)
    )
    const extMap = extensionMap(extensions)
    homeworkWithStatus = homework.map(h => ({
      ...h,
      done: doneIds.has(h.id),
      confirmed: confirmedIds.has(h.id),
      ...extensionField(h, extMap),
    }))
  } else if (profile.role === 'teacher') {
    // Erledigungen je HÜ — zusätzlich getrennt nach „bestätigt", weil nur
    // die bestätigte Erledigung für Flamme und Klassenziel zählt. Ohne diese
    // Unterscheidung sieht die Lehrkraft 20 „gemacht", während für das
    // Abenteuer vielleicht nur 12 zählen.
    const { data: counts } = await supabase
      .from('homework_completions')
      .select('homework_id,confirmed_by_parent_at')
      .in('homework_id', homework.map(h => h.id))

    const countMap: Record<string, number> = {}
    const confirmedMap: Record<string, number> = {}
    for (const c of counts ?? []) {
      countMap[c.homework_id] = (countMap[c.homework_id] ?? 0) + 1
      if (c.confirmed_by_parent_at) confirmedMap[c.homework_id] = (confirmedMap[c.homework_id] ?? 0) + 1
    }
    // Kein extended_due_date für Lehrer: eine Verlängerung ist persönlich,
    // die Lehrkraft hat keine eigene Frist. Sie sieht sie im Schüler-Popup.
    homeworkWithStatus = homework.map(h => ({
      ...h,
      done: false,
      completion_count: countMap[h.id] ?? 0,
      confirmed_count: confirmedMap[h.id] ?? 0,
    }))
  } else {
    // parent: show child's completions
    const { data: allStudents } = await supabase
      .from('profiles').select('id,full_name').eq('class_id', activeClassId).eq('role', 'student')
    const child = matchChild(profile, allStudents ?? [])
    childId = child?.id ?? null
    const childDoneIds = new Set<string>()
    const childConfirmedIds = new Set<string>()
    let extMap = new Map<string, number>()
    if (child) {
      const [{ data: childCompletions }, { data: childExtensions }] = await Promise.all([
        supabase.from('homework_completions').select('homework_id,confirmed_by_parent_at').eq('student_id', child.id),
        supabase.from('homework_extensions').select('homework_id,extra_days').eq('student_id', child.id),
      ])
      for (const c of childCompletions ?? []) {
        childDoneIds.add(c.homework_id)
        if (c.confirmed_by_parent_at) childConfirmedIds.add(c.homework_id)
      }
      extMap = extensionMap(childExtensions)
    }
    homeworkWithStatus = homework.map(h => ({
      ...h,
      done: childDoneIds.has(h.id),
      confirmed: childConfirmedIds.has(h.id),
      ...extensionField(h, extMap),
    }))
  }

  // Zähler und Untertitel rechnen ausschließlich über PUBLISHED — sonst
  // stünden hier andere Prozentwerte als in HomeworkStatsCard, die intern
  // ebenfalls auf published filtert. Pending-HÜ sind noch keine Aufgabe.
  const today = todayISO()
  const published = homeworkWithStatus.filter(h => h.status === 'published')
  const doneCount = published.filter(h => h.done).length
  const openCount = published.filter(h => !h.done && isActionable(h.due_date, today)).length
  const missedCount = published.filter(h => !h.done && isOver(h.due_date, today)).length

  const { count: studentCount } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('class_id', activeClassId)
    .eq('role', 'student')

  const subtitle =
    profile.role === 'teacher'
      ? `${published.length} Aufgaben · ${published.reduce((s, h) => s + (h.completion_count ?? 0), 0)}/${(studentCount ?? 0) * published.length} Abgaben`
      : `${openCount} offen · ${doneCount} erledigt · ${missedCount} versäumt`

  return (
    <AnimateIn delay={0}>
      <HomeworkList
        homework={homeworkWithStatus}
        role={profile.role}
        specialRole={profile.special_role}
        userId={user.id}
        classId={activeClassId}
        subtitle={subtitle}
        stats={{ open: openCount, done: doneCount, missed: missedCount }}
        studentCount={studentCount ?? 0}
        childId={childId}
        subjects={subjects}
      />
    </AnimateIn>
  )
}

/** Zeitkristall-Zeilen zu einer Map homework_id -> Extratage. */
function extensionMap(rows: { homework_id: string; extra_days: number }[] | null): Map<string, number> {
  return new Map((rows ?? []).map(e => [e.homework_id, e.extra_days]))
}

/** Setzt extended_due_date NUR, wenn tatsächlich eine Verlängerung existiert.
 *  effectiveDueDate() gibt sonst das Datum unverändert zurück — dann bleibt
 *  das Feld undefined und alle Konsumenten verhalten sich exakt wie bisher. */
function extensionField(hw: { id: string; due_date: string }, extMap: Map<string, number>) {
  if (extMap.size === 0) return {}
  const eff = effectiveDueDate(hw.due_date, hw.id, extMap)
  return eff === hw.due_date ? {} : { extended_due_date: eff }
}
