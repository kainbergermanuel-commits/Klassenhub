import type { AchievementKind } from '@/lib/types'

export interface AchievementRow {
  student_id: string
  kind: AchievementKind
  key: string
  period: string
}

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
  for (const r of rows) counts[r.kind]++
  return counts
}
