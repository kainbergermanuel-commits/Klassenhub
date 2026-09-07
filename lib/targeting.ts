/**
 * Gezielte Zustellung von Erinnerungen und Terminen.
 *
 *   target_student_ids = null / leer → gilt für alle Kinder der Klasse
 *   Array gesetzt                    → gilt NUR für diese Kinder
 *
 * Das ist die Umkehrung von `excluded_student_ids` bei Hausübungen (siehe
 * lib/homeworkScope.ts). Beide Richtungen sind Absicht und kein Versehen: eine
 * Erinnerung geht gezielt an wenige, eine Hausübung an alle bis auf wenige.
 * Genau weil sie sich so ähnlich sehen und trotzdem gegenläufig sind, steht
 * jede Regel an genau einer Stelle statt in jeder Datei neu ausgeschrieben.
 *
 * Alles hier arbeitet auf bereits geladenen Daten und macht KEINE eigene
 * Abfrage. Siehe supabase/add-reminder-targets.sql und add-event-targets.sql.
 */

export type Targeted = {
  target_student_ids: string[] | null
}

/** Ist dieses Kind Empfänger? */
export function isTargetedAt(row: Targeted, studentId: string): boolean {
  const target = row.target_student_ids
  if (!target || target.length === 0) return true
  return target.includes(studentId)
}

/**
 * Wie viele der übergebenen Kinder dieser Eintrag erreicht.
 *
 * Für Quoten in der Lehrer-Sicht ("wie viele haben die Erinnerung gesehen?").
 * Der Nenner muss die Nicht-Empfänger abziehen, sonst kann eine gezielte
 * Erinnerung, die alle ihre Empfänger gesehen haben, nie 100 Prozent
 * erreichen — sie sähe dauerhaft nach einer Lücke aus.
 *
 * Empfänger, die nicht (mehr) in der Klasse sind, zählen nicht mit: sonst
 * bliebe ein ausgetretenes Kind als Geisterzahl im Nenner stehen.
 */
export function targetedStudentCount(row: Targeted, studentIds: string[]): number {
  const target = row.target_student_ids
  if (!target || target.length === 0) return studentIds.length
  return studentIds.reduce((n, id) => (target.includes(id) ? n + 1 : n), 0)
}
