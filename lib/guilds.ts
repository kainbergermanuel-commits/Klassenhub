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
// V2 (Balance-Fahrplan Phase 2): zwei Familien von Signalen.
// (a) Per-Mitglied-Signale (homework/duty_done/parent_confirm) — erfüllt,
//     wenn ein einstellbarer ANTEIL der Gilde das Signal individuell
//     erreicht (`minShare`, Default .75 statt vorher "alle"). Verhindert,
//     dass ein einzelnes säumiges Kind die ganze Gilde blockiert/beschämt.
// (b) `distributed_homework` — ein ECHT verteilter, kooperativer Zähler:
//     die Gilde sammelt zusammen X erledigte HÜ, von mindestens Y
//     verschiedenen Mitgliedern beigetragen. Kein Kind kann das allein
//     tragen → erzwingt Verteilung, schummelsicher (nur echte HÜ-Signale).
// Bewusst ein eigener, kleiner Vorrat statt Wiederverwendung von QUEST_VAULT
// — die Auswertung (über mehrere Schüler:innen statt über eine:n) ist
// strukturell anders genug, um sie nicht zu vermischen.

export type GuildQuestSignal =
  | { type: 'homework'; targetCount: number }
  /** Dienst der Woche selbst bestätigt (nicht bloß zugeteilt), siehe duty_completions. */
  | { type: 'duty_done'; targetCount: number }
  | { type: 'parent_confirm'; targetCount: number }
  /** Verteilter Kern: `totalCount` HÜ insgesamt, von mind. `minContributors`
   *  verschiedenen Mitgliedern. Keine Einzelperson kann das Ziel allein
   *  erreichen, sobald `minContributors` > 1. */
  | { type: 'distributed_homework'; totalCount: number; minContributors: number }

export interface GuildQuestTemplate {
  key: string
  title: string
  narrative: string
  signal: GuildQuestSignal
  /** Nur für Per-Mitglied-Signale relevant: Anteil der Gilde, der das Signal
   *  erreichen muss (0–1). Fehlt das Feld, gilt .75 — "X von Y", nicht mehr
   *  "alle". Bei kleinen Gilden (3er) wird abgerundet, nie aufgerundet
   *  (sonst bliebe .75 bei 3 Mitgliedern effektiv "alle 3"). */
  minShare?: number
}

export const GUILD_QUEST_VAULT: GuildQuestTemplate[] = [
  {
    key: 'guild_hw',
    title: 'Alle an Bord',
    narrative: '{guide}: die meisten Gildenmitglieder schaffen diese Woche mindestens eine Hausübung.',
    signal: { type: 'homework', targetCount: 1 },
  },
  {
    key: 'guild_duty',
    title: 'Gemeinsam verantwortlich',
    narrative: '{guide}: die meisten Gildenmitglieder mit Dienst diese Woche erfüllen ihn.',
    signal: { type: 'duty_done', targetCount: 1 },
  },
  {
    key: 'guild_parent',
    title: 'Vertrauensbeweis',
    narrative: '{guide}: die meisten Mitglieder holen sich diese Woche mindestens eine Eltern-Bestätigung.',
    signal: { type: 'parent_confirm', targetCount: 1 },
  },
  {
    key: 'guild_pool',
    title: 'Gemeinsamer Vorrat',
    narrative: '{guide}: sammelt zusammen 5 Hausübungen — von mindestens 3 verschiedenen Mitgliedern beigetragen.',
    signal: { type: 'distributed_homework', totalCount: 5, minContributors: 3 },
  },
]

export function findGuildQuestTemplate(key: string): GuildQuestTemplate | undefined {
  return GUILD_QUEST_VAULT.find(t => t.key === key)
}

/** Klassenweite Machbarkeit für Gilden-Quests (Selbstprüfung 2026-07-14:
 *  anders als bei Solo-Quests seit Phase 1 fehlte hier bislang jeder
 *  Machbarkeits-Filter — in einer Woche ganz ohne fällige HÜ wären 3 der 4
 *  Vorlagen für die GESAMTE Klasse gleichzeitig unerfüllbar gewesen, nicht
 *  nur für ein einzelnes Kind wie beim Solo-Fall). */
export interface GuildQuestFeasibility {
  hasWeekHomework: boolean
  hasWeekDuty: boolean
}

function guildTemplateFeasible(template: GuildQuestTemplate, f: GuildQuestFeasibility): boolean {
  switch (template.signal.type) {
    case 'homework':
    case 'distributed_homework':
    case 'parent_confirm':
      return f.hasWeekHomework
    case 'duty_done':
      return f.hasWeekDuty
  }
}

/** Wählt deterministisch eine Gilden-Quest pro Klasse+Woche — eigener Seed-
 *  Namensraum ("guild-…"), damit sie nicht zufällig mit der individuellen
 *  Wochen-Quest-Auswahl gleichläuft. `feasibility`, falls übergeben: filtert
 *  Vorlagen heraus, die diese Woche klassenweit gar nicht erfüllbar sind
 *  (z.B. Dienst-Quest ohne Dienste diese Woche). Fällt auf den vollen Vorrat
 *  zurück, falls dadurch nichts übrig bliebe. */
export function weeklyGuildQuestKey(classId: string, weekStart: string, feasibility?: GuildQuestFeasibility): string {
  const seed = `guild-${classId}-${weekStart}`
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  h = (Math.imul(h, 1103515245) + 12345) >>> 0
  const feasibleVault = feasibility ? GUILD_QUEST_VAULT.filter(t => guildTemplateFeasible(t, feasibility)) : GUILD_QUEST_VAULT
  const vault = feasibleVault.length > 0 ? feasibleVault : GUILD_QUEST_VAULT
  return vault[h % vault.length].key
}

export interface GuildQuestContext {
  weekHomeworkIds: string[]
  doneByStudent: Map<string, Set<string>>
  confirmedByStudent: Map<string, Set<string>>
  dutyDoneByStudent: Set<string>
  /** Wer diese Woche überhaupt einen Dienst hat (siehe buildDutyDone). Für die
   *  Dienst-Quest zählt nur dieser Kreis, nicht die ganze Gilde — sonst wäre
   *  „die meisten Mitglieder mit Dienst" für Gilden mit wenigen Dienst-Kindern
   *  rechnerisch unerfüllbar. */
  dutyAssignedStudents: Set<string>
}

export interface GuildQuestResult {
  template: GuildQuestTemplate
  /** Per-Mitglied-Signale: Anzahl Mitglieder, die das Signal individuell
   *  erreichen. `distributed_homework`: Anzahl beitragender Mitglieder. */
  membersMet: number
  /** Per-Mitglied-Signale: Gildengröße (bzw. Dienst-Pool-Größe). `distributed_
   *  homework`: benötigte Mindest-Beitragende (`minContributors`, auf
   *  Gildengröße gedeckelt) — dort ist `total` bereits die Schwelle selbst. */
  total: number
  /** Nur bei Per-Mitglied-Signalen gesetzt: ab wie vielen von `total` die
   *  Quest erfüllt ist (i.d.R. 75 %, nicht "alle") — für eine UI, die den
   *  Fortschrittsbalken korrekt bei der Schwelle statt bei `total` als "voll"
   *  markieren will. Bei `distributed_homework` fehlt das Feld, weil `total`
   *  dort schon die Schwelle selbst ist. */
  required?: number
  done: boolean
  /** Nur bei `distributed_homework` gesetzt: der gemeinsame HÜ-Fortschritt
   *  ("3 von 5 HÜ gesammelt"), zusätzlich zur Beitragenden-Zahl oben. */
  collected?: { current: number; target: number }
}

export function computeGuildQuestProgress(template: GuildQuestTemplate, guild: Guild, ctx: GuildQuestContext): GuildQuestResult {
  const size = guild.memberIds.length

  if (template.signal.type === 'distributed_homework') {
    const { totalCount, minContributors } = template.signal
    let collected = 0
    let contributors = 0
    for (const sid of guild.memberIds) {
      const done = ctx.doneByStudent.get(sid) ?? new Set<string>()
      const doneCount = ctx.weekHomeworkIds.filter(id => done.has(id)).length
      collected += doneCount
      if (doneCount > 0) contributors++
    }
    const requiredContributors = Math.min(minContributors, size)
    return {
      template,
      membersMet: contributors,
      total: requiredContributors,
      done: size > 0 && collected >= totalCount && contributors >= requiredContributors,
      collected: { current: collected, target: totalCount },
    }
  }

  function meetsSignal(studentId: string): boolean {
    switch (template.signal.type) {
      case 'homework': {
        const done = ctx.doneByStudent.get(studentId) ?? new Set<string>()
        return ctx.weekHomeworkIds.filter(id => done.has(id)).length >= template.signal.targetCount
      }
      case 'duty_done':
        return ctx.dutyDoneByStudent.has(studentId)
      case 'parent_confirm': {
        const confirmed = ctx.confirmedByStudent.get(studentId) ?? new Set<string>()
        return ctx.weekHomeworkIds.filter(id => confirmed.has(id)).length >= template.signal.targetCount
      }
      default:
        return false
    }
  }
  // Dienst-Quest: nur Mitglieder mit tatsächlichem Dienst diese Woche zählen
  // als Bezugsgröße (das Narrativ sagt „die meisten Mitglieder mit Dienst").
  // Sonst müssten 75 % der GESAMTEN Gilde einen Dienst haben UND erfüllen —
  // bei 2 Dienst-Kindern pro Dienst praktisch nie erreichbar. Andere Signale
  // (HÜ, Eltern-Bestätigung) kann jedes Mitglied erbringen → ganze Gilde.
  const eligible = template.signal.type === 'duty_done'
    ? guild.memberIds.filter(id => ctx.dutyAssignedStudents.has(id))
    : guild.memberIds
  const poolSize = eligible.length
  const membersMet = eligible.filter(meetsSignal).length
  // "X von Y" statt "alle" (Prinzip 1: kein einzelnes Kind blockiert/beschämt
  // die Gilde) — abgerundet, nie aufgerundet, sonst bliebe z.B. .75 bei einer
  // 3er-Gilde effektiv "alle 3" und die Erleichterung ginge verloren.
  const minShare = template.minShare ?? 0.75
  const required = poolSize > 0 ? Math.max(1, Math.floor(poolSize * minShare)) : 0
  return { template, membersMet, total: poolSize, required, done: poolSize > 0 && membersMet >= required }
}
