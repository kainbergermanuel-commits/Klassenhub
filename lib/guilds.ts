/** Gilden (Gamification Phase 3): wechselnde Kleingruppen pro Season.
 *  Bewusst wie die Quest-Auswahl rein berechnet, keine eigene DB-Tabelle —
 *  die Einteilung ist deterministisch aus (Klasse, Season) und für alle
 *  Mitglieder der Klasse gleich, ohne Lehrer-Eingriff (siehe Entscheidung
 *  "automatisch gemischt" im Gamification-Plan). */

export interface Guild {
  index: number
  name: string
  memberIds: string[]
}

/** Anzeige-Daten eines Gildenmitglieds (für Avatare in der Quest-Card). */
export interface GuildMember {
  id: string
  full_name: string
  avatar_color: string
  avatar_seed: string | null
  avatar_hair_color: string | null
  avatar_skin_color: string | null
}

const GUILD_NAMES = [
  'Die Flammenwächter',
  'Die Wegfinder',
  'Die Sternensucher',
  'Die Baumeister',
  'Die Kundschafter',
  'Die Zeitreisenden',
  'Die Brückenbauer',
  'Die Nachtwachen',
]

/** Deterministisches Fisher-Yates-Shuffle, geseedet aus einem String. */
function seededShuffle<T>(arr: T[], seed: string): T[] {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  let h = hash
  function nextInt(maxExclusive: number): number {
    h = (Math.imul(h, 1103515245) + 12345) >>> 0
    return h % maxExclusive
  }
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = nextInt(i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Teilt die Klasse in Gilden von ~3–4 Mitgliedern ein, stabil pro
 *  (Klasse, Season) — derselbe Aufruf liefert immer dieselbe Einteilung,
 *  ändert sich aber automatisch mit jedem neuen Monat. */
export function assignGuilds(classId: string, season: string, studentIds: string[]): Guild[] {
  if (studentIds.length === 0) return []
  const sorted = [...studentIds].sort() // stabile Ausgangsreihenfolge, unabhängig von DB-Reihenfolge
  const shuffled = seededShuffle(sorted, `${classId}-${season}`)
  const groupCount = Math.max(1, Math.round(shuffled.length / 3.5))
  const groups: string[][] = Array.from({ length: groupCount }, () => [])
  shuffled.forEach((id, i) => groups[i % groupCount].push(id))
  return groups.map((memberIds, index) => ({
    index,
    name: GUILD_NAMES[index % GUILD_NAMES.length],
    memberIds,
  }))
}

export function findMyGuild(guilds: Guild[], studentId: string): Guild | undefined {
  return guilds.find(g => g.memberIds.includes(studentId))
}

// ─── Gilden-Quests ─────────────────────────────────────────────────────────
// Aggregierte Version der Solo-Quests: erfüllt, wenn ALLE Gildenmitglieder
// das Signal individuell erreichen. Bewusst ein eigener, kleiner Vorrat statt
// Wiederverwendung von QUEST_VAULT — die Auswertung (über mehrere Schüler:innen
// statt über eine:n) ist strukturell anders genug, um sie nicht zu vermischen.

export type GuildQuestSignal =
  | { type: 'homework'; targetCount: number }
  | { type: 'duty_assigned'; targetCount: number }
  | { type: 'parent_confirm'; targetCount: number }

export interface GuildQuestTemplate {
  key: string
  title: string
  narrative: string
  signal: GuildQuestSignal
}

export const GUILD_QUEST_VAULT: GuildQuestTemplate[] = [
  {
    key: 'guild_hw',
    title: 'Alle an Bord',
    narrative: '{guide}: jedes Gildenmitglied schafft diese Woche mindestens eine Hausübung.',
    signal: { type: 'homework', targetCount: 1 },
  },
  {
    key: 'guild_duty',
    title: 'Gemeinsam verantwortlich',
    narrative: '{guide}: alle Gildenmitglieder mit Dienst diese Woche erfüllen ihn.',
    signal: { type: 'duty_assigned', targetCount: 1 },
  },
  {
    key: 'guild_parent',
    title: 'Vertrauensbeweis',
    narrative: '{guide}: jedes Mitglied holt sich diese Woche mindestens eine Eltern-Bestätigung.',
    signal: { type: 'parent_confirm', targetCount: 1 },
  },
]

export function findGuildQuestTemplate(key: string): GuildQuestTemplate | undefined {
  return GUILD_QUEST_VAULT.find(t => t.key === key)
}

/** Wählt deterministisch eine Gilden-Quest pro Klasse+Woche — eigener Seed-
 *  Namensraum ("guild-…"), damit sie nicht zufällig mit der individuellen
 *  Wochen-Quest-Auswahl gleichläuft. */
export function weeklyGuildQuestKey(classId: string, weekStart: string): string {
  const seed = `guild-${classId}-${weekStart}`
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  h = (Math.imul(h, 1103515245) + 12345) >>> 0
  return GUILD_QUEST_VAULT[h % GUILD_QUEST_VAULT.length].key
}

export interface GuildQuestContext {
  weekHomeworkIds: string[]
  doneByStudent: Map<string, Set<string>>
  confirmedByStudent: Map<string, Set<string>>
  dutyAssignedByStudent: Set<string>
}

export interface GuildQuestResult {
  template: GuildQuestTemplate
  membersMet: number
  total: number
  done: boolean
}

export function computeGuildQuestProgress(template: GuildQuestTemplate, guild: Guild, ctx: GuildQuestContext): GuildQuestResult {
  function meetsSignal(studentId: string): boolean {
    switch (template.signal.type) {
      case 'homework': {
        const done = ctx.doneByStudent.get(studentId) ?? new Set<string>()
        return ctx.weekHomeworkIds.filter(id => done.has(id)).length >= template.signal.targetCount
      }
      case 'duty_assigned':
        return ctx.dutyAssignedByStudent.has(studentId)
      case 'parent_confirm': {
        const confirmed = ctx.confirmedByStudent.get(studentId) ?? new Set<string>()
        return ctx.weekHomeworkIds.filter(id => confirmed.has(id)).length >= template.signal.targetCount
      }
    }
  }
  const membersMet = guild.memberIds.filter(meetsSignal).length
  return { template, membersMet, total: guild.memberIds.length, done: guild.memberIds.length > 0 && membersMet === guild.memberIds.length }
}
