import type { QuestSignal, QuestTemplate } from '@/lib/questVault'
import { QUEST_VAULT } from '@/lib/questVault'

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
  dutyAssignedThisWeek: boolean
  streakHeldThisWeek: boolean
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
    case 'homework_early':
      return clamp(ctx.weekHomeworkIds.filter(id => ctx.earlyHomeworkIds.has(id)).length, signal.targetCount)
    case 'reminder':
      return clamp(ctx.weekReminderIds.filter(id => ctx.viewedReminderIds.has(id)).length, signal.targetCount)
    case 'event_ready':
      return clamp(ctx.weekEventIds.length > 0 ? 1 : 0, signal.targetCount)
    case 'duty_assigned':
      return clamp(ctx.dutyAssignedThisWeek ? 1 : 0, signal.targetCount)
    case 'streak_hold':
      return clamp(ctx.streakHeldThisWeek ? 1 : 0, signal.targetCount)
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
}

export function computeQuestProgress(template: QuestTemplate, ctx: QuestContext, chosenChoiceKey?: string): QuestResult {
  if (template.choices) {
    if (!chosenChoiceKey) return { template, done: false, parts: [], needsChoice: true }
    const choice = template.choices.find(c => c.key === chosenChoiceKey)
    if (!choice) return { template, done: false, parts: [], needsChoice: true }
    const progress = computeSignalProgress(choice.signal, ctx)
    return { template, done: progress.done, parts: [{ label: choice.label, progress }], needsChoice: false }
  }
  const parts = (template.signals ?? []).map(s => ({ label: signalLabel(s), progress: computeSignalProgress(s, ctx) }))
  return { template, done: parts.length > 0 && parts.every(p => p.progress.done), parts, needsChoice: false }
}

function signalLabel(signal: QuestSignal): string {
  switch (signal.type) {
    case 'homework': return 'Hausübungen erledigt'
    case 'homework_early': return 'Vorzeitig erledigt'
    case 'reminder': return 'Erinnerung gesehen'
    case 'event_ready': return 'Termin im Blick'
    case 'duty_assigned': return 'Dienst wahrgenommen'
    case 'streak_hold': return 'Streak gehalten'
    case 'parent_confirm': return 'Eltern-Bestätigungen'
  }
}

/** Wählt deterministisch `count` Vorlagen aus dem Vorrat — abhängig von
 *  Klasse+Woche, damit alle Mitglieder derselben Klasse dieselben Quests
 *  sehen und ein Seitenreload nicht neu würfelt. Reiner Zufall ohne
 *  DB-Zustand: kein Wiederholungsschutz über Wochen hinweg (P1-Grenze,
 *  spätere Phase kann History-Tracking ergänzen). */
export function defaultWeeklyTemplateKeys(classId: string, weekStart: string, count = 3): string[] {
  const seed = `${classId}-${weekStart}`
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0

  const pool = QUEST_VAULT.map(t => t.key)
  const picked: string[] = []
  let h = hash
  let guard = 0
  while (picked.length < Math.min(count, pool.length) && guard < 100) {
    h = (h * 1103515245 + 12345) >>> 0
    const key = pool[h % pool.length]
    if (!picked.includes(key)) picked.push(key)
    guard++
  }
  return picked
}

/** Aktive Vorlagen-Schlüssel für Klasse+Woche: Lehrer-Override (aus der
 *  `quests`-Tabelle) hat Vorrang vor der deterministischen Standardauswahl. */
export function resolveWeeklyTemplateKeys(classId: string, weekStart: string, overrideKeys: string[], count = 3): string[] {
  return overrideKeys.length > 0 ? overrideKeys : defaultWeeklyTemplateKeys(classId, weekStart, count)
}
