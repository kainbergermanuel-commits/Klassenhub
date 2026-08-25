import type { AchievementKind } from '@/lib/types'

export interface AchievementRow {
  student_id: string
  kind: AchievementKind
  key: string
  period: string
}

/** Reservierter `key`-Wert innerhalb kind='quest' fürs Wochensiegel (siehe
 *  collectAchievements) — kollidiert nie mit einem echten Quest-template_key,
 *  da alle Vorlagen in questVault.ts sprechende Keys ohne Unterstriche am
 *  Rand verwenden. Kein Schema-Wechsel nötig: die CHECK-Constraint auf `kind`
 *  erlaubt 'quest' bereits, `period` (week_start) macht den Eintrag pro Woche
 *  eindeutig — genau wie bei normalen Quest-Erfolgen. */
export const WEEKLY_SEAL_KEY = '__weekly_seal__'

/** Reservierte Keys für die Story-Momente der Jahresreise, nach demselben
 *  Muster wie WEEKLY_SEAL_KEY (kind='quest', kein Schema-Wechsel nötig).
 *  `period` trägt den Welt-Icon-Schlüssel und macht den Eintrag damit pro Welt
 *  eindeutig — jede Welt kann ihr Zeichen genau einmal erwecken und genau
 *  einmal abgeschlossen werden. */
export const SIGN_AWAKENED_KEY = '__sign_awakened__'
export const WORLD_DONE_KEY = '__world_done__'

/** Leitet aus dem aktuell berechneten Zustand (Quests/Gilden-Quest/Klassenziel)
 *  ab, welche Erfolge protokolliert werden sollen. Reine Funktion — das
 *  eigentliche Schreiben (idempotent, fehlertolerant) passiert separat in den
 *  Server Components, da es einen Supabase-Client braucht. */
export function collectAchievements(params: {
  studentId: string
  weekStart: string
  season: string
  quests: { template: { key: string }; done: boolean }[]
  guildQuest: { template: { key: string }; done: boolean } | null
  classGoalReached: boolean
  /** Story-Momente der laufenden Welt: Icon-Schlüssel plus die zwei Fragen
   *  „ist ihr Zeichen erwacht?" und „ist ihre letzte Etappe erreicht?".
   *  Fehlt das Feld, werden keine Story-Momente protokolliert. */
  world?: { icon: string; signAwakened: boolean; completed: boolean }
}): AchievementRow[] {
  const rows: AchievementRow[] = []
  for (const q of params.quests) {
    if (q.done) rows.push({ student_id: params.studentId, kind: 'quest', key: q.template.key, period: params.weekStart })
  }
  // Wochensiegel: alle aktiven Wochen-Quests diese Woche geschafft (die
  // kooperative Gilden-Quest zählt separat, siehe unten) — eine stille
  // Anerkennung fürs Logbuch (Prinzip 2), KEIN neuer Spezialrang/Befugnis
  // (Grundsatzentscheidung 3 zum Spezialrang-Set ist noch offen).
  if (params.quests.length > 0 && params.quests.every(q => q.done)) {
    rows.push({ student_id: params.studentId, kind: 'quest', key: WEEKLY_SEAL_KEY, period: params.weekStart })
  }
  if (params.guildQuest?.done) {
    rows.push({ student_id: params.studentId, kind: 'guild_quest', key: params.guildQuest.template.key, period: params.weekStart })
  }
  if (params.classGoalReached) {
    rows.push({ student_id: params.studentId, kind: 'class_goal', key: 'season_goal', period: params.season })
  }
  // Story-Momente fürs Logbuch: das Erwachen eines Splitter-Zeichens und der
  // Abschluss einer Welt. Beides gehört zur Reise, die man später zurückblättern
  // können soll — vorher stand im Logbuch nur Mechanik (Quests, Items, Flamme).
  // Bewusst NICHT im Wappen-Zähler: countAchievements filtert sie mit heraus,
  // damit die Fragment-Balance unverändert bleibt.
  if (params.world?.signAwakened) {
    rows.push({ student_id: params.studentId, kind: 'quest', key: SIGN_AWAKENED_KEY, period: params.world.icon })
  }
  if (params.world?.completed) {
    rows.push({ student_id: params.studentId, kind: 'quest', key: WORLD_DONE_KEY, period: params.world.icon })
  }
  return rows
}

export interface AchievementCounts {
  quest: number
  guild_quest: number
  class_goal: number
}

export function countAchievements(rows: { kind: AchievementKind; key: string }[]): AchievementCounts {
  const counts: AchievementCounts = { quest: 0, guild_quest: 0, class_goal: 0 }
  // Bewusst NICHT gezählt: Rätsel ('riddle') und die Story-Momente. Der
  // Wappen-Fragment-Zähler (siehe RucksackItems) soll nur echte Quest-,
  // Gilden- und Klassenziel-Erfolge abbilden, damit seine Balance unverändert
  // bleibt. Beides wird stattdessen im Logbuch gewürdigt.
  const STORY_KEYS = new Set<string>([SIGN_AWAKENED_KEY, WORLD_DONE_KEY])
  for (const r of rows) {
    if (r.kind === 'riddle') continue
    if (STORY_KEYS.has(r.key)) continue
    counts[r.kind]++
  }
  return counts
}
