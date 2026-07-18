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
  return rows
}

export interface AchievementCounts {
  quest: number
  guild_quest: number
  class_goal: number
}

export function countAchievements(rows: { kind: AchievementKind }[]): AchievementCounts {
  const counts: AchievementCounts = { quest: 0, guild_quest: 0, class_goal: 0 }
  // 'riddle' bewusst NICHT gezählt: der Wappen-Fragment-Zähler
  // (quest+guild_quest+class_goal, siehe RucksackItems) soll durch Rätsel
  // nicht verschoben werden — Rätsel werden nur im Logbuch gewürdigt.
  for (const r of rows) if (r.kind !== 'riddle') counts[r.kind]++
  return counts
}
