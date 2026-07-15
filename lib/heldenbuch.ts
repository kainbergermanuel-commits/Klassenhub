import { VETERAN_MILESTONE } from '@/lib/streak'
import { findQuestTemplate } from '@/lib/questVault'
import { findGuildQuestTemplate } from '@/lib/guilds'
import type { AchievementKind } from '@/lib/types'

/** Datenbausteine für das Heldenbuch, die aus Roh-Signalen abgeleitet werden —
 *  bewusst als reine Funktionen (kein DB-Zugriff), damit Startseite und
 *  Abenteuerseite exakt dieselbe Logik teilen (analog lib/questContext.ts). */

// ─── Stille Anerkennung (Guide-Notiz) ────────────────────────────────────────
// Eine kurze, private Beobachtung des Guides in Ich-Form ("ich habe gesehen,
// dass du…") — nie ein Vergleich mit anderen (Prinzip 1), mal Lob, mal ein
// sanfter Hinweis. Priorität wählt das gerade Relevanteste aus.

export interface GuideNote {
  icon: string
  text: string
}

export interface GuideNoteSignals {
  openHomeworkCount: number
  dutyName: string | null
  dutyKeptUp: boolean
  confirmedStreak: number
  broken: boolean
  questsDone: number
  questsTotal: number
}

export function buildGuideNote(s: GuideNoteSignals): GuideNote {
  if (s.dutyKeptUp && s.dutyName) {
    return { icon: 'volunteer_activism', text: `Danke, dass du dich so zuverlässig um „${s.dutyName}“ kümmerst — die Klasse verlässt sich auf dich.` }
  }
  if (s.broken) {
    return { icon: 'self_improvement', text: 'Deine Flamme ist gerade aus — kein Weltuntergang. Morgen zündest du sie einfach neu an.' }
  }
  if (s.openHomeworkCount > 0) {
    const hw = s.openHomeworkCount === 1 ? 'Hausübung' : 'Hausübungen'
    return { icon: 'visibility', text: `Ich sehe, du hast noch ${s.openHomeworkCount} ${hw} offen — du schaffst das, Schritt für Schritt.` }
  }
  if (s.confirmedStreak >= 5) {
    return { icon: 'local_fire_department', text: `Ich habe gesehen, wie beständig du dranbleibst — ${s.confirmedStreak} Tage in Folge. Beeindruckend.` }
  }
  if (s.questsTotal > 0 && s.questsDone === s.questsTotal) {
    return { icon: 'military_tech', text: 'Alle deine Quests diese Woche geschafft — stark!' }
  }
  if (s.questsDone > 0) {
    return { icon: 'trending_up', text: `Schon ${s.questsDone} von ${s.questsTotal} Quests diese Woche — du bist gut unterwegs.` }
  }
  return { icon: 'waving_hand', text: 'Schön, dass du da bist. Ich sehe jeden Schritt, den du gehst — und jeder zählt.' }
}

// ─── Chronik / Logbuch ───────────────────────────────────────────────────────
// Zusammengeführte, datierte Ereignisliste: Meilensteine + eingesetzte Items
// (Schutzschild/Zeitkristall) + abgeschlossene Quests/Gilden-Quests/Klassenziele
// (= das Quest-Logbuch, Cluster A) + aktuell erloschene Flamme. Absteigend.

export type ChronicleKind = 'milestone' | 'shield' | 'crystal' | 'break' | AchievementKind

export interface ChronicleEntry {
  kind: ChronicleKind
  label: string
  note?: string
  /** ISO-Zeitstempel (oder YYYY-MM-DD…) — nur für Sortierung + Anzeige. */
  date: string
}

export function buildChronicle(input: {
  milestones: { milestone: number; confirmed_at: string }[]
  shieldUses: { created_at: string }[]
  crystalUses: { created_at: string }[]
  /** Protokollierte Erfolge (achievements-Tabelle) fürs Quest-Logbuch. */
  achievements?: { kind: AchievementKind; key: string; achieved_at: string }[]
  brokenNow: boolean
  today: string
}): ChronicleEntry[] {
  const out: ChronicleEntry[] = []
  for (const m of input.milestones) {
    out.push({
      kind: 'milestone',
      label: `${m.milestone} HÜ in Folge`,
      note: m.milestone === VETERAN_MILESTONE ? 'Meistersiegel' : undefined,
      date: m.confirmed_at,
    })
  }
  for (const s of input.shieldUses) out.push({ kind: 'shield', label: 'Schutzschild eingesetzt', date: s.created_at })
  for (const c of input.crystalUses) out.push({ kind: 'crystal', label: 'Zeitkristall eingesetzt', date: c.created_at })
  for (const a of input.achievements ?? []) {
    if (a.kind === 'quest') {
      out.push({ kind: 'quest', label: findQuestTemplate(a.key)?.title ?? 'Wochen-Quest geschafft', date: a.achieved_at })
    } else if (a.kind === 'guild_quest') {
      out.push({ kind: 'guild_quest', label: findGuildQuestTemplate(a.key)?.title ?? 'Gilden-Quest geschafft', note: 'Gilde', date: a.achieved_at })
    } else {
      out.push({ kind: 'class_goal', label: 'Klassenziel erreicht', note: 'ganze Klasse', date: a.achieved_at })
    }
  }
  // Aktuell gerissene Flamme als jüngstes Ereignis (Ende des heutigen Tages,
  // damit es über heutige Meilensteine sortiert). Nur der Ist-Zustand — es gibt
  // (bewusst) kein persistiertes Historien-Log gerissener Streaks.
  if (input.brokenNow) out.push({ kind: 'break', label: 'Flamme erloschen', date: `${input.today}T23:59:59` })

  out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  return out
}
