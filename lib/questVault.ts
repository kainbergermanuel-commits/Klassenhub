/** Quest-Vorrat: bewusst als Code statt DB-Tabelle (siehe supabase/feature-quests.sql).
 *  Jede Vorlage misst ein oder mehrere bereits vorhandene Signale — nichts wird
 *  extra für Quests getrackt. `{guide}` in `narrative` wird zur Laufzeit durch
 *  den Namen des aktuellen Season-Guides ersetzt (siehe lib/seasonTheme.ts). */

export type QuestFocusTag = 'puenktlichkeit' | 'ausdauer' | 'verantwortung' | 'zusammenhalt' | 'aufmerksamkeit'

export const QUEST_FOCUS_LABELS: Record<QuestFocusTag, string> = {
  puenktlichkeit: 'Pünktlichkeit',
  ausdauer: 'Ausdauer',
  verantwortung: 'Verantwortung',
  zusammenhalt: 'Zusammenhalt',
  aufmerksamkeit: 'Aufmerksamkeit',
}

/** Rotationsreihenfolge für den Wochen-Fokus (gegen den Novelty-Effekt,
 *  siehe Gamification-Plan). Reihenfolge bewusst gewählt: sanfter Einstieg
 *  (Pünktlichkeit) vor anspruchsvolleren Themen (Zusammenhalt). */
export const QUEST_FOCUS_ROTATION: QuestFocusTag[] = ['puenktlichkeit', 'ausdauer', 'verantwortung', 'zusammenhalt', 'aufmerksamkeit']

export type QuestSignal =
  | { type: 'homework'; targetCount: number }
  /** Verschiedene Kalendertage diese Woche mit mind. einer HÜ-Erledigung —
   *  erzwingt echte Streckung über die Woche statt "alles an einem Tag"
   *  (siehe Balance-Fahrplan Phase 1, "N von 5 Schultagen mit Slack"). */
  | { type: 'homework_days'; targetCount: number }
  /** Hausübung erledigt, bevor sie fällig war. */
  | { type: 'homework_early'; targetCount: number }
  | { type: 'reminder'; targetCount: number }
  /** Termin diese Woche, der den Schüler betrifft (target_student_ids). */
  | { type: 'event_ready'; targetCount: number }
  /** Dienst der Woche selbst bestätigt (nicht bloß zugeteilt), siehe
   *  duty_completions/toggleDutyCompletion.ts. */
  | { type: 'duty_done'; targetCount: number }
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
  /** 'meister' = spürbar anspruchsvoller (mehrtägig/hohe Hürde), eigene
   *  Kennzeichnung in der UI. Fehlt das Feld, gilt 'standard'. Beide Stufen
   *  landen im selben Vorrat/Rotation — kein separates Freischalt-System. */
  tier?: 'standard' | 'meister'
  /** `false` = darf nicht als alleinstehende automatische Wochen-Quest
   *  gezogen werden (siehe defaultWeeklyTemplateKeys) — für Vorlagen, die in
   *  einer einzigen Handlung erledigt sind (z.B. eine Erinnerung ansehen)
   *  und dadurch die Schwierigkeit×Zeit-Balance brechen würden (Balance-
   *  Fahrplan Phase 1). Fehlt das Feld, gilt `true`. Der Lehrer-Override
   *  (Regie) ist davon NICHT betroffen — nur die automatische Auswahl. */
  soloEligible?: boolean
}

export const QUEST_VAULT: QuestTemplate[] = [
  {
    key: 'hw_early',
    title: 'Vor der Zeit',
    narrative: '{guide}: reiche eine Hausübung ab, bevor sie fällig ist.',
    focusTag: 'puenktlichkeit',
    signals: [{ type: 'homework_early', targetCount: 1 }],
    soloEligible: false, // einzelne Handlung — nicht als alleinstehende Wochen-Quest
  },
  {
    key: 'hw_x3',
    title: 'Fleißige Woche',
    narrative: '{guide} zählt mit: an 3 verschiedenen Tagen diese Woche eine Hausübung erledigt.',
    focusTag: 'ausdauer',
    signals: [{ type: 'homework_days', targetCount: 3 }],
  },
  {
    key: 'reminder_seen',
    title: 'Funkspruch gelesen',
    narrative: '{guide} hat dir gefunkt — schau in deinen Erinnerungen nach.',
    focusTag: 'aufmerksamkeit',
    signals: [{ type: 'reminder', targetCount: 1 }],
    soloEligible: false, // 10-Sekunden-Handlung — nicht als alleinstehende Wochen-Quest
  },
  {
    key: 'duty_done',
    title: 'Dienst der Woche',
    narrative: '{guide} zählt auf dich: bestätige deinen Dienst an 3 Tagen diese Woche.',
    focusTag: 'verantwortung',
    signals: [{ type: 'duty_done', targetCount: 3 }],
  },
  {
    key: 'streak_hold',
    title: 'Flamme am Leben halten',
    narrative: '{guide} passt auf deine Flamme auf — halte deine Streak 3 HÜ in Folge.',
    focusTag: 'ausdauer',
    signals: [{ type: 'streak_hold', targetCount: 3 }],
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
      { type: 'duty_done', targetCount: 2 },
      { type: 'reminder', targetCount: 1 },
    ],
  },
  {
    key: 'meister_ausdauer',
    title: 'Meisterhafte Ausdauer',
    narrative: '{guide} ist beeindruckt: 5 HÜ in Folge, ohne eine einzige zu vergessen.',
    focusTag: 'ausdauer',
    tier: 'meister',
    signals: [{ type: 'streak_hold', targetCount: 5 }],
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
