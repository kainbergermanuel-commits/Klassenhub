'use server'

import { createClient } from '@/lib/supabase/server'
import { getEffectiveAuth } from '@/lib/previewAuth'

/** Lehrperson ermitteln, sonst Fehler.
 *
 *  Die Planung gehört seit feature-planung-persoenlich.sql der Lehrperson,
 *  nicht der Klasse: kein activeClassId mehr, keine Abhängigkeit vom
 *  Klassenumschalter. Welche Klasse eine Notiz meint, steht in ihrem Text. */
async function getTeacher(): Promise<{ userId: string }> {
  const { user, profile } = await getEffectiveAuth()
  if (!user || !profile) throw new Error('Nicht angemeldet')
  if (profile.role !== 'teacher') throw new Error('Keine Berechtigung')
  return { userId: user.id }
}

/**
 * Speichert eine Planungsnotiz (day 0 = Wochennotiz, 1–5 = Mo–Fr;
 * subject '' = allgemein). Leerer Inhalt löscht die Notiz.
 */
export async function savePlanningNote(weekStart: string, day: number, subject: string, content: string) {
  const { userId } = await getTeacher()
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const table = (supabase as any).from('planning_notes')

  if (!content.trim()) {
    const { error } = await table.delete()
      .eq('author_id', userId).eq('week_start', weekStart)
      .eq('day', day).eq('subject', subject)
    if (error) throw new Error(error.message)
    return
  }

  const { error } = await table.upsert(
    { author_id: userId, week_start: weekStart, day, subject, content, updated_at: new Date().toISOString() },
    { onConflict: 'author_id,week_start,day,subject' }
  )
  if (error) throw new Error(error.message)
}

/**
 * Kopiert alle Notizen der Vorwoche in die Woche weekStart.
 * Bestehende Notizen der Zielwoche bleiben unangetastet.
 */
export async function copyPreviousWeek(weekStart: string): Promise<number> {
  const { userId } = await getTeacher()
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const table = (supabase as any).from('planning_notes')

  const prev = new Date(`${weekStart}T00:00:00`)
  prev.setDate(prev.getDate() - 7)
  const y = prev.getFullYear()
  const m = String(prev.getMonth() + 1).padStart(2, '0')
  const d = String(prev.getDate()).padStart(2, '0')
  const prevWeek = `${y}-${m}-${d}`

  const [{ data: source }, { data: existing }] = await Promise.all([
    table.select('day,subject,content').eq('author_id', userId).eq('week_start', prevWeek),
    table.select('day,subject').eq('author_id', userId).eq('week_start', weekStart),
  ])
  if (!source || source.length === 0) return 0

  const taken = new Set((existing ?? []).map((n: { day: number; subject: string }) => `${n.day}|${n.subject}`))
  const rows = source
    .filter((n: { day: number; subject: string }) => !taken.has(`${n.day}|${n.subject}`))
    .map((n: { day: number; subject: string; content: string }) => ({
      author_id: userId, week_start: weekStart,
      day: n.day, subject: n.subject, content: n.content,
    }))
  if (rows.length === 0) return 0

  const { error } = await table.insert(rows)
  if (error) throw new Error(error.message)
  return rows.length
}
