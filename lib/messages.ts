import type { Message } from '@/lib/types'

type Unreadable = Pick<Message, 'parent_id' | 'sender_id' | 'seen_at' | 'deleted_at'> & {
  addressed_teacher_id?: string | null
}

/**
 * Ist diese Nachricht für DIESE Lehrperson neu?
 *
 * Eine einzige Regel für Nav-Badge, Heft-Liste und Gelesen-Markieren:
 *   - nur Elternnachrichten (sender = Heftbesitzer)
 *   - noch nicht gelesen, nicht gelöscht
 *   - an alle gerichtet ODER gezielt an mich
 *
 * Gezielt an eine Kollegin gerichtete Nachrichten zählen bei mir nicht:
 * sie bleiben bei ihr „neu“, bis SIE sie liest (feature-message-addressed.sql).
 */
export function isUnreadForTeacher(m: Unreadable, teacherId: string): boolean {
  if (m.sender_id !== m.parent_id) return false
  if (m.seen_at || m.deleted_at) return false
  return !m.addressed_teacher_id || m.addressed_teacher_id === teacherId
}

/** Eine Lehrperson, die Eltern im Heft gezielt anschreiben können. */
export type AddressableTeacher = {
  id: string
  name: string
  /** Klassenvorstand (teacher_classes.is_primary). */
  primary: boolean
  /** Fächer in dieser Klasse, als Kurzform für die Auswahl. */
  subjects: string[]
}
