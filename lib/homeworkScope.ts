/**
 * Geltungsbereich einer Hausübung: für welche Kinder gilt sie?
 *
 * Der Normalfall ist "für alle". Einzelne Kinder können von einer HÜ
 * ausgenommen werden, etwa weil sie im betreffenden Fach gesondert
 * unterrichtet werden. In der Datenbank steht dafür `excluded_student_ids`
 * (siehe supabase/add-homework-exclusions.sql):
 *
 *   null / leer   → gilt für alle
 *   Array gesetzt → gilt für alle AUSSER diesen Kindern
 *
 * ── Warum es diese Datei überhaupt gibt ──────────────────────────────────
 *
 * Für Schüler:innen und Eltern erledigt die RLS-Policy die Filterung schon in
 * der Datenbank: eine ausgenommene HÜ kommt gar nicht erst an. Lehrpersonen
 * sehen dagegen per Policy IMMER alle Zeilen, und genau dort wird pro Kind
 * gerechnet (Streaks, Quests, Abgabequoten, Kinder-Matrix). Ohne diese Datei
 * würde eine ausgenommene HÜ dem Kind in der Lehrer-Sicht als versäumt
 * angerechnet, während das Kind sie nie gesehen hat.
 *
 * Deshalb ist das hier die EINZIGE Stelle, an der die Regel steht — analog zu
 * isOver()/isActionable() in lib/date.ts als einziger Quelle der
 * Fälligkeitsregel. Nirgends sonst von Hand auf dem Array herumprüfen.
 *
 * ── Warum reine Array-Funktionen und keine Query-Helfer ──────────────────
 *
 * Alle Funktionen hier arbeiten auf bereits geladenen Daten und machen NIE
 * eine eigene Abfrage. Der naheliegende Fehler wäre, in der Lehrer-Matrix pro
 * Kind eine gefilterte HÜ-Abfrage zu stellen: aus einem Round-Trip würden
 * sechzehn, und das wäre der einzige Weg, dieses Feature spürbar teuer zu
 * machen. Die Filterung im Speicher kostet dagegen nichts.
 */

/** Minimalform, die zum Prüfen des Geltungsbereichs reicht.
 *
 *  `excluded_student_ids` ist bewusst PFLICHT und nicht optional: so meldet
 *  TypeScript jede Abfrage, die die Spalte nicht mitlädt. Wäre das Feld
 *  optional, würde eine vergessene Spalte still als "gilt für alle"
 *  durchlaufen — also genau der Fehler, den diese Datei verhindern soll. */
export type HomeworkScope = {
  excluded_student_ids: string[] | null
}

/** Gilt diese Hausübung für dieses Kind? */
export function isHwForStudent(hw: HomeworkScope, studentId: string): boolean {
  const excluded = hw.excluded_student_ids
  if (!excluded || excluded.length === 0) return true
  return !excluded.includes(studentId)
}

/**
 * Die Hausübungen aus `all`, die für dieses eine Kind gelten.
 *
 * Reihenfolge und Objektidentität bleiben erhalten, das Ergebnis lässt sich
 * also unverändert an computeStreak()/findBreakingHomework() weiterreichen,
 * die eine absteigend sortierte Liste erwarten.
 *
 * Enthält keine einzige HÜ eine Ausnahme (der Normalfall in den allermeisten
 * Klassen), wird `all` unverändert zurückgegeben, statt eine identische Kopie
 * anzulegen. Aufrufer dürfen das Ergebnis deshalb nicht verändern — tut in
 * diesem Projekt ohnehin niemand, alle Listen werden nur gelesen.
 */
export function hwForStudent<T extends HomeworkScope>(all: T[], studentId: string): T[] {
  let hasExclusions = false
  for (const hw of all) {
    if (hw.excluded_student_ids && hw.excluded_student_ids.length > 0) { hasExclusions = true; break }
  }
  if (!hasExclusions) return all
  return all.filter(hw => isHwForStudent(hw, studentId))
}

/**
 * Wie viele der übergebenen Kinder diese eine Hausübung betrifft.
 *
 * Für Quoten in der Lehrer-Sicht ("wie viele haben abgegeben?"). Der Nenner
 * muss die Ausgenommenen abziehen, sonst sieht eine vollständig erledigte HÜ
 * dauerhaft nach einer Lücke aus.
 */
export function studentCountForHw(hw: HomeworkScope, studentIds: string[]): number {
  const excluded = hw.excluded_student_ids
  if (!excluded || excluded.length === 0) return studentIds.length
  return studentIds.reduce((n, id) => (excluded.includes(id) ? n : n + 1), 0)
}

/** Anzahl der Kinder, die von dieser HÜ ausgenommen sind — für die Anzeige
 *  in der Lehrer-Sicht ("2 ausgenommen"). Zählt nur Ausnahmen, die auf ein
 *  aktuelles Kind der Klasse zeigen; ausgetretene Kinder bleiben sonst als
 *  Geisterzahl im Array stehen. */
export function excludedCount(hw: HomeworkScope, studentIds: string[]): number {
  const excluded = hw.excluded_student_ids
  if (!excluded || excluded.length === 0) return 0
  return studentIds.reduce((n, id) => (excluded.includes(id) ? n + 1 : n), 0)
}
