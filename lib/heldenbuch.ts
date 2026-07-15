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

type GuideNoteVoice = (s: GuideNoteSignals) => GuideNote

/** Neutrale Standard-Stimme — greift für jeden Guide, der noch keine eigenen
 *  Formulierungen hat (Mein Guide: Prinzip 4, kein Vorab-Content-Berg). */
const GENERIC_VOICE: GuideNoteVoice = s => {
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

/** Vala-Stimme (Bergführerin) — dieselben 7 Situationen, aber in ihrem
 *  Bergexpeditions-Ton. Erste ausformulierte Persönlichkeit für "Mein Guide";
 *  weitere Guides bekommen ihre eigene Stimme erst, sobald sie wählbar sind. */
const VALA_VOICE: GuideNoteVoice = s => {
  if (s.dutyKeptUp && s.dutyName) {
    return { icon: 'volunteer_activism', text: `Auf dich ist Verlass, wie auf ein gutes Seil: „${s.dutyName}“ hast du zuverlässig übernommen — die Klasse kann sich auf dich stützen.` }
  }
  if (s.broken) {
    return { icon: 'self_improvement', text: 'Deine Flamme ist gerade aus — auch auf dem Berg geht mal eine Rast nicht wie geplant. Morgen brechen wir einfach neu auf.' }
  }
  if (s.openHomeworkCount > 0) {
    const hw = s.openHomeworkCount === 1 ? 'Hausübung' : 'Hausübungen'
    return { icon: 'visibility', text: `Ich seh von hier oben noch ${s.openHomeworkCount} ${hw} vor dir liegen — ein Schritt nach dem anderen, du schaffst das.` }
  }
  if (s.confirmedStreak >= 5) {
    return { icon: 'local_fire_department', text: `${s.confirmedStreak} Tage in Folge dabeigeblieben — das ist echte Ausdauer, wie bei einer guten Bergtour. Ich hab's gesehen.` }
  }
  if (s.questsTotal > 0 && s.questsDone === s.questsTotal) {
    return { icon: 'military_tech', text: 'Alle Etappen dieser Woche gemeistert — stark erklommen!' }
  }
  if (s.questsDone > 0) {
    return { icon: 'trending_up', text: `Schon ${s.questsDone} von ${s.questsTotal} Quests diese Woche geschafft — guter Fortschritt am Hang.` }
  }
  return { icon: 'waving_hand', text: 'Schön, dass du mit dabei bist. Ich behalte jeden deiner Schritte im Blick — und jeder bringt dich weiter.' }
}

/** Guide-Stimmen nach Theme-Icon — derselbe Schlüssel wie GUIDE_PORTRAIT/
 *  SEASON_ART. Fehlt ein Eintrag, greift GENERIC_VOICE. */
const GUIDE_VOICES: Partial<Record<string, GuideNoteVoice>> = {
  landscape: VALA_VOICE,
}

/** `guideIcon` bestimmt, wessen Stimme spricht — bei "Mein Guide" der
 *  persönlich gewählte (falls freigeschaltet), sonst der Guide der aktuell
 *  laufenden Klassenwelt (siehe resolveGuideTheme in app-Seiten). */
export function buildGuideNote(s: GuideNoteSignals, guideIcon?: string): GuideNote {
  const voice = (guideIcon && GUIDE_VOICES[guideIcon]) || GENERIC_VOICE
  return voice(s)
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
