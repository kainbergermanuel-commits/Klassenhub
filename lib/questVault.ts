/** Quest-Vorrat: bewusst als Code statt DB-Tabelle (siehe supabase/feature-quests.sql).
 *  Jede Vorlage misst ein oder mehrere bereits vorhandene Signale — nichts wird
 *  extra für Quests getrackt. `{guide}` in `narrative` wird zur Laufzeit durch
 *  den Namen des aktuellen Season-Guides ersetzt (siehe lib/seasonTheme.ts). */

export type QuestFocusTag = 'puenktlichkeit' | 'ausdauer' | 'verantwortung' | 'zusammenhalt' | 'aufmerksamkeit'

export type QuestSignal =
  | { type: 'homework'; targetCount: number }
  /** Hausübung erledigt, bevor sie fällig war. */
  | { type: 'homework_early'; targetCount: number }
  | { type: 'reminder'; targetCount: number }
  /** Termin diese Woche, der den Schüler betrifft (target_student_ids). */
  | { type: 'event_ready'; targetCount: number }
  | { type: 'duty_assigned'; targetCount: number }
  /** Kein Hausübungs-Ausfall diese Woche (Streak nicht gerissen). */
  | { type: 'streak_hold'; targetCount: number }
  | { type: 'parent_confirm'; targetCount: number }

export interface QuestChoice {
  key: string
  label: string
  narrative: string
  signal: QuestSignal
}

export interface QuestTemplate {
  key: string
  title: string
  narrative: string
  focusTag: QuestFocusTag
  /** Solo/Kombi: alle Signale müssen erfüllt sein. Nicht kombinierbar mit `choices`. */
  signals?: QuestSignal[]
  /** Wahlpfad: genau ein gewählter Pfad zählt. Nicht kombinierbar mit `signals`. */
  choices?: QuestChoice[]
}

export const QUEST_VAULT: QuestTemplate[] = [
  {
    key: 'hw_x3',
    title: 'Fleißige Woche',
    narrative: '{guide} zählt mit: 3 Hausübungen diese Woche erledigt.',
    focusTag: 'ausdauer',
    signals: [{ type: 'homework', targetCount: 3 }],
  },
  {
    key: 'reminder_seen',
    title: 'Funkspruch gelesen',
    narrative: '{guide} hat dir gefunkt — schau in deinen Erinnerungen nach.',
    focusTag: 'aufmerksamkeit',
    signals: [{ type: 'reminder', targetCount: 1 }],
  },
  {
    key: 'duty_done',
    title: 'Dienst der Woche',
    narrative: '{guide} zählt auf dich: dein Dienst diese Woche.',
    focusTag: 'verantwortung',
    signals: [{ type: 'duty_assigned', targetCount: 1 }],
  },
  {
    key: 'streak_hold',
    title: 'Flamme am Leben halten',
    narrative: '{guide} passt auf deine Flamme auf — halte deinen Streak diese Woche.',
    focusTag: 'ausdauer',
    signals: [{ type: 'streak_hold', targetCount: 1 }],
  },
  {
    key: 'parent_ally',
    title: 'Verbündete rufen',
    narrative: '{guide}: deine Verbündeten helfen mit — 2 Bestätigungen diese Woche.',
    focusTag: 'zusammenhalt',
    signals: [{ type: 'parent_confirm', targetCount: 2 }],
  },
  {
    key: 'weekly_bundle',
    title: 'Wochenpaket',
    narrative: '{guide}: schnür dein Wochenpaket — Hausübungen, Dienst und ein Funkspruch.',
    focusTag: 'verantwortung',
    signals: [
      { type: 'homework', targetCount: 2 },
      { type: 'duty_assigned', targetCount: 1 },
      { type: 'reminder', targetCount: 1 },
    ],
  },
  {
    key: 'vorbereitung_wahlpfad',
    title: 'Vorbereitung — wähle deinen Weg',
    narrative: '{guide}: zwei Wege liegen vor dir — welchen gehst du?',
    focusTag: 'ausdauer',
    choices: [
      {
        key: 'chronist',
        label: 'Pfad des Chronisten',
        narrative: 'Reiche eine Hausübung vor der Fälligkeit ein.',
        signal: { type: 'homework_early', targetCount: 1 },
      },
      {
        key: 'bote',
        label: 'Pfad des Boten',
        narrative: 'Denk an deinen nächsten Termin.',
        signal: { type: 'event_ready', targetCount: 1 },
      },
    ],
  },
]

export function findQuestTemplate(key: string): QuestTemplate | undefined {
  return QUEST_VAULT.find(t => t.key === key)
}
