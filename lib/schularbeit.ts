/** Regeln rund um Schularbeiten.
 *
 *  Die Zahlen stehen bewusst hier als benannte Konstanten und nicht verstreut
 *  in den Komponenten: sie sind Schulrecht, nicht Gestaltung, und können sich
 *  mit Schulstufe oder Schulform ändern. Von Manuel am 2026-09-02 bestätigt. */

import { getMondayOfWeek } from './date'

/** Höchstens eine Schularbeit pro Tag. */
export const MAX_PER_DAY = 1
/** Höchstens zwei Schularbeiten pro Kalenderwoche. */
export const MAX_PER_WEEK = 2
/** Ankündigungsfrist in Tagen. */
export const MIN_NOTICE_DAYS = 7

export interface SchularbeitLike {
  id: string
  start_date: string
  category: string
  subject_short: string | null
}

export interface Collision {
  kind: 'tag' | 'woche' | 'frist'
  text: string
}

function daysBetween(fromISO: string, toISO: string): number {
  return Math.round(
    (new Date(`${toISO}T00:00:00`).getTime() - new Date(`${fromISO}T00:00:00`).getTime()) / 86400000
  )
}

function dayLabel(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('de-AT', { day: 'numeric', month: 'long' })
}

/** Prüft einen geplanten Schularbeits-Termin gegen die bereits eingetragenen.
 *  Gibt Hinweise zurück, KEINE Fehler — es gibt begründete Ausnahmen, und die
 *  Entscheidung bleibt bei der Lehrperson.
 *
 *  `excludeId` blendet beim Bearbeiten den Termin selbst aus, sonst kollidierte
 *  jede Schularbeit mit sich selbst. */
export function findCollisions(
  startDate: string,
  existing: SchularbeitLike[],
  today: string,
  subjectLabel: (short: string | null) => string,
  excludeId?: string,
): Collision[] {
  const others = existing.filter(e => e.category === 'schularbeit' && e.id !== excludeId)
  const out: Collision[] = []

  const sameDay = others.filter(e => e.start_date === startDate)
  if (sameDay.length >= MAX_PER_DAY) {
    const names = sameDay.map(e => subjectLabel(e.subject_short)).join(', ')
    out.push({
      kind: 'tag',
      text: `Am ${dayLabel(startDate)} steht bereits eine Schularbeit: ${names}.`,
    })
  }

  const week = getMondayOfWeek(new Date(`${startDate}T00:00:00`))
  const sameWeek = others.filter(e => getMondayOfWeek(new Date(`${e.start_date}T00:00:00`)) === week)
  if (sameWeek.length >= MAX_PER_WEEK) {
    const names = sameWeek
      .map(e => `${subjectLabel(e.subject_short)} am ${dayLabel(e.start_date)}`)
      .join(' und ')
    out.push({
      kind: 'woche',
      text: `In dieser Woche sind bereits ${sameWeek.length} Schularbeiten eingetragen: ${names}.`,
    })
  }

  const notice = daysBetween(today, startDate)
  if (notice >= 0 && notice < MIN_NOTICE_DAYS) {
    out.push({
      kind: 'frist',
      text: notice === 0
        ? `Der Termin ist heute. Die Ankündigungsfrist beträgt ${MIN_NOTICE_DAYS} Tage.`
        : `Bis zum Termin ${notice === 1 ? 'ist es nur 1 Tag' : `sind es nur ${notice} Tage`}. Die Ankündigungsfrist beträgt ${MIN_NOTICE_DAYS} Tage.`,
    })
  }

  return out
}

/** "in 12 Tagen" / "morgen" / "heute" — der Countdown auf Karte und Leiste. */
export function countdownLabel(startDate: string, today: string): string {
  const d = daysBetween(today, startDate)
  if (d < 0) return 'vorbei'
  if (d === 0) return 'heute'
  if (d === 1) return 'morgen'
  return `in ${d} Tagen`
}
