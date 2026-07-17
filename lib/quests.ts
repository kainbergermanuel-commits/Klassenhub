import type { QuestChoice, QuestFocusTag, QuestSignal, QuestTemplate } from '@/lib/questVault'
import { QUEST_VAULT, QUEST_FOCUS_ROTATION } from '@/lib/questVault'

/** Alle Daten, die zur Fortschritts-Berechnung eines Schülers nötig sind —
 *  bewusst aus bereits geladenen Daten zusammengesetzt (keine Extra-Queries
 *  pro Quest). `week*`-Felder sind auf [weekStart, weekEnd] vorgefiltert.
 *
 *  ⚠️ Bekannte Einschränkung: `weekReminderIds`/`weekEventIds` werden aus
 *  ohnehin geladenen "ab heute"-Listen abgeleitet (siehe page.tsx) und
 *  erfassen daher Reminder/Termine von Wochentagen VOR heute nicht — wird
 *  bewusst in Kauf genommen, um keine zusätzliche Query einzuführen. Effekt:
 *  reminder_seen/event_ready können in der ersten Wochenhälfte knapp
 *  unterzählen, nie überzählen. */
export interface QuestContext {
  weekStart: string
  weekEnd: string
  weekHomeworkIds: string[]
  doneHomeworkIds: Set<string>
  earlyHomeworkIds: Set<string>
  confirmedHomeworkIds: Set<string>
  weekReminderIds: string[]
  viewedReminderIds: Set<string>
  weekEventIds: string[]
  /** Verschiedene Kalendertage diese Woche mit mind. einer HÜ-Erledigung
   *  (nicht rohe Anzahl) — Grundlage für "an X Tagen aktiv"-Ziele, die
   *  echte Streckung über die Woche statt "alles an einem Tag" verlangen
   *  (siehe lib/questContext.ts, Balance-Fahrplan Phase 1). */
  doneDatesThisWeek: Set<string>
  /** Anzahl selbst bestätigter Diensttage diese Woche (SDT-Selbstkontrolle,
   *  siehe duty_completions) — kein Alles-oder-nichts, damit Ziele wie
   *  "3 von 5 Tagen" möglich sind. */
  dutyDoneCount: number
  /** Aktuelle (unbestätigte) Streak-Länge in Tagen — Grundlage für Ziele wie
   *  "halte die Flamme 3 Tage in Folge". */
  currentStreakLength: number
}

export interface QuestProgress {
  current: number
  target: number
  done: boolean
}

function clamp(current: number, target: number): QuestProgress {
  return { current: Math.min(current, target), target, done: current >= target }
}

export function computeSignalProgress(signal: QuestSignal, ctx: QuestContext): QuestProgress {
  switch (signal.type) {
    case 'homework':
      return clamp(ctx.weekHomeworkIds.filter(id => ctx.doneHomeworkIds.has(id)).length, signal.targetCount)
    case 'homework_days':
      return clamp(ctx.doneDatesThisWeek.size, signal.targetCount)
    case 'homework_early':
      return clamp(ctx.weekHomeworkIds.filter(id => ctx.earlyHomeworkIds.has(id)).length, signal.targetCount)
    case 'reminder':
      return clamp(ctx.weekReminderIds.filter(id => ctx.viewedReminderIds.has(id)).length, signal.targetCount)
    case 'event_ready':
      return clamp(ctx.weekEventIds.length > 0 ? 1 : 0, signal.targetCount)
    case 'duty_done':
      return clamp(ctx.dutyDoneCount, signal.targetCount)
    case 'streak_hold':
      return clamp(ctx.currentStreakLength, signal.targetCount)
    case 'parent_confirm':
      return clamp(ctx.weekHomeworkIds.filter(id => ctx.confirmedHomeworkIds.has(id)).length, signal.targetCount)
  }
}

export interface QuestPart {
  label: string
  progress: QuestProgress
}

export interface QuestResult {
  template: QuestTemplate
  done: boolean
  /** Bei Wahlpfad-Quests: nur der gewählte Pfad. Bei Solo/Kombi: alle Signale. */
  parts: QuestPart[]
  /** Nur bei Wahlpfad-Quests relevant. */
  needsChoice: boolean
  /** Bei bereits gewählter Wahlpfad-Quest: der gewählte Pfad, damit die UI
   *  dessen konkrete Anleitung (choice.narrative) anzeigen kann — sonst
   *  sieht man nach der Wahl nur noch den allgemeinen Vorlagen-Text
   *  ("wähle deinen Weg") und nicht mehr, was zu tun ist. */
  chosenChoice?: QuestChoice
}

export function computeQuestProgress(template: QuestTemplate, ctx: QuestContext, chosenChoiceKey?: string): QuestResult {
  if (template.choices) {
    if (!chosenChoiceKey) return { template, done: false, parts: [], needsChoice: true }
    const choice = template.choices.find(c => c.key === chosenChoiceKey)
    if (!choice) return { template, done: false, parts: [], needsChoice: true }
    const progress = computeSignalProgress(choice.signal, ctx)
    return { template, done: progress.done, parts: [{ label: signalLabel(choice.signal), progress }], needsChoice: false, chosenChoice: choice }
  }
  const parts = (template.signals ?? []).map(s => ({ label: signalLabel(s), progress: computeSignalProgress(s, ctx) }))
  return { template, done: parts.length > 0 && parts.every(p => p.progress.done), parts, needsChoice: false }
}

function signalLabel(signal: QuestSignal): string {
  switch (signal.type) {
    case 'homework': return 'Hausübungen erledigt'
    case 'homework_days': return 'Tage mit Hausübung'
    case 'homework_early': return 'Vorzeitig erledigt'
    case 'reminder': return 'Erinnerung gesehen'
    case 'event_ready': return 'Termin im Blick'
    case 'duty_done': return 'Diensttage erledigt'
    case 'streak_hold': return 'Tage in Folge'
    case 'parent_confirm': return 'Eltern-Bestätigungen'
  }
}

/** Wochen-Fokus gegen den Novelty-Effekt: rotiert stabil anhand der Anzahl
 *  Wochen seit einem festen Referenz-Montag — unabhängig von Kalenderjahr
 *  oder Uhrzeit, läuft beliebig lange weiter. */
export function weeklyFocusTag(weekStart: string): QuestFocusTag {
  const ref = new Date('2026-01-05T00:00:00') // Referenz-Montag (beliebig, nur stabil)
  const d = new Date(`${weekStart}T00:00:00`)
  const weeksSinceRef = Math.round((d.getTime() - ref.getTime()) / (7 * 86400000))
  const len = QUEST_FOCUS_ROTATION.length
  const idx = ((weeksSinceRef % len) + len) % len
  return QUEST_FOCUS_ROTATION[idx]
}

/** Rein informell: welche Wochen-Signale diesem Kind diese Woche überhaupt
 *  zur Verfügung stehen — Grundlage für den Machbarkeits-Filter unten. Siehe
 *  lib/questContext.ts (buildFeasibility) für die Ableitung aus Live-Daten. */
export interface QuestFeasibility {
  hasWeekHomework: boolean
  hasDuty: boolean
  hasWeekEvent: boolean
}

function signalFeasible(signal: QuestSignal, f: QuestFeasibility): boolean {
  switch (signal.type) {
    case 'homework':
    case 'homework_days':
    case 'homework_early':
    case 'parent_confirm':
      return f.hasWeekHomework
    case 'duty_done':
      return f.hasDuty
    case 'event_ready':
      return f.hasWeekEvent
    case 'reminder':
    case 'streak_hold':
      return true
  }
}

/** Ob eine Vorlage diese Woche für dieses Kind überhaupt erfüllbar ist.
 *  Solo/Kombi-Quests brauchen JEDES Signal feasible, Wahlpfad-Quests
 *  brauchen mindestens EINEN feasiblen Pfad (die Wahl selbst bleibt frei). */
function templateFeasible(template: QuestTemplate, f: QuestFeasibility): boolean {
  if (template.choices) return template.choices.some(c => signalFeasible(c.signal, f))
  return (template.signals ?? []).every(s => signalFeasible(s, f))
}

/** Wählt deterministisch `count` Vorlagen aus dem Vorrat — abhängig von
 *  Klasse+Woche, damit alle Mitglieder derselben Klasse dieselben Quests
 *  sehen und ein Seitenreload nicht neu würfelt. Garantiert (falls
 *  vorhanden) mindestens eine Quest mit dem Fokus dieser Woche, der Rest
 *  wird deterministisch aus dem gesamten Vorrat aufgefüllt. Kein
 *  Wiederholungsschutz über Wochen hinweg (P1/P2-Grenze).
 *
 *  `feasibility`, falls übergeben: filtert Vorlagen heraus, deren Signal
 *  diese Woche für dieses Kind gar nicht erfüllbar ist (z.B. Dienst-Quest
 *  ohne zugeteilten Dienst), UND Vorlagen mit `soloEligible: false` (zu
 *  leicht für eine alleinstehende Wochen-Quest, siehe questVault.ts). Fällt
 *  auf den ungefilterten (nur soloEligible-gefilterten) Vorrat zurück, falls
 *  sonst weniger als `count` Vorlagen übrig blieben — Determinismus/
 *  Mindestanzahl haben Vorrang vor perfekter Machbarkeit. */
export function defaultWeeklyTemplateKeys(classId: string, weekStart: string, count = 3, feasibility?: QuestFeasibility): string[] {
  const seed = `${classId}-${weekStart}`
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  let h = hash
  function nextIndex(len: number): number {
    // Math.imul() ist Pflicht hier: normale Multiplikation überschreitet bei
    // h nahe 2^32 die 53-Bit-Genauigkeit von JS-Zahlen und "friert" den
    // Generator auf einen falschen Fixpunkt ein (immer derselbe Index) —
    // dadurch fand die Auswahl in der Praxis manchmal nur 2 statt 3 Quests.
    h = (Math.imul(h, 1103515245) + 12345) >>> 0
    return h % len
  }

  const soloEligibleVault = QUEST_VAULT.filter(t => t.soloEligible !== false)
  const feasibleVault = feasibility ? soloEligibleVault.filter(t => templateFeasible(t, feasibility)) : soloEligibleVault
  const vault = feasibleVault.length >= count ? feasibleVault : soloEligibleVault

  const focus = weeklyFocusTag(weekStart)
  const focusedKeys = vault.filter(t => t.focusTag === focus).map(t => t.key)
  const pool = vault.map(t => t.key)

  const picked: string[] = []
  if (focusedKeys.length > 0) picked.push(focusedKeys[nextIndex(focusedKeys.length)])

  let guard = 0
  while (picked.length < Math.min(count, pool.length) && guard < 100) {
    const key = pool[nextIndex(pool.length)]
    if (!picked.includes(key)) picked.push(key)
    guard++
  }
  return picked
}
