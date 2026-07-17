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
  /** Generischer Text mit `{guide}`-Platzhalter — Fallback für Guides ohne
   *  eigene Stimme (siehe narrativeByGuide) und für noch nicht gebaute Welten. */
  narrative: string
  /** Guide-eigene Formulierung (kein `{guide}`-Platzhalter, direkt fertig) —
   *  nur für Guides mit voller Stimme (siehe lib/heldenbuch.ts GUIDE_VOICES:
   *  aktuell Vala/landscape, ARI/rocket_launch, Isla/map). Fehlt ein Eintrag,
   *  greift der generische `narrative`-Text mit Namens-Einsetzung — siehe
   *  resolveQuestNarrative(). */
  narrativeByGuide?: Partial<Record<string, string>>
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

// Guide-Icon-Schlüssel (siehe lib/seasonTheme.ts SCHOOL_YEAR_ARCS):
// landscape = Vala, rocket_launch = ARI, map = Isla.

export const QUEST_VAULT: QuestTemplate[] = [
  {
    key: 'hw_early',
    title: 'Vor der Zeit',
    narrative: '{guide}: reiche eine Hausübung ab, bevor sie fällig ist.',
    narrativeByGuide: {
      landscape: 'Ich sehe das gern früh am Tag: reich eine Hausübung ab, bevor sie überhaupt fällig ist — wie ein Aufstieg vor Sonnenaufgang.',
      rocket_launch: 'Frühwarnsystem aktiv: reiche eine Hausübung ab, bevor die Frist überhaupt beginnt. Effizienz, Crew-Mitglied.',
      map: 'Wer früh aufbricht, findet die Spur zuerst — reiche eine Hausübung ab, bevor sie überhaupt fällig ist.',
    },
    focusTag: 'puenktlichkeit',
    signals: [{ type: 'homework_early', targetCount: 1 }],
    soloEligible: false, // einzelne Handlung — nicht als alleinstehende Wochen-Quest
  },
  {
    key: 'hw_x3',
    title: 'Fleißige Woche',
    narrative: '{guide} zählt mit: an 3 verschiedenen Tagen diese Woche eine Hausübung erledigt.',
    narrativeByGuide: {
      landscape: 'Drei verschiedene Tage, drei kleine Etappen — genau so kommt man den Berg hoch, nicht alles auf einmal.',
      rocket_launch: 'Drei Systemchecks an drei verschiedenen Tagen diese Woche — verteilte Last statt Überlastung auf einen Schlag.',
      map: 'Drei Spuren an drei verschiedenen Tagen diese Woche — so liest man eine Karte, Stück für Stück, nicht alles auf einmal.',
    },
    focusTag: 'ausdauer',
    signals: [{ type: 'homework_days', targetCount: 3 }],
  },
  {
    key: 'reminder_seen',
    title: 'Funkspruch gelesen',
    narrative: '{guide} hat dir gefunkt — schau in deinen Erinnerungen nach.',
    narrativeByGuide: {
      landscape: 'Ein Ruf hallt vom Basislager zu dir herüber — schau in deinen Erinnerungen nach, was ich dir hinterlassen habe.',
      rocket_launch: 'Eingehende Übertragung erkannt — sieh in deinen Erinnerungen nach, was ich gesendet habe.',
      map: 'Eine Nachricht wartet, am Rand meiner Karte markiert — schau in deinen Erinnerungen nach.',
    },
    focusTag: 'aufmerksamkeit',
    signals: [{ type: 'reminder', targetCount: 1 }],
    soloEligible: false, // 10-Sekunden-Handlung — nicht als alleinstehende Wochen-Quest
  },
  {
    key: 'duty_done',
    title: 'Dienst der Woche',
    narrative: '{guide} zählt auf dich: bestätige deinen Dienst an 3 Tagen diese Woche.',
    narrativeByGuide: {
      landscape: 'Auf dich ist Verlass wie auf ein gutes Seil — bestätige deinen Dienst an 3 Tagen diese Woche.',
      rocket_launch: 'Wartungsprotokoll: bestätige deinen Dienst an 3 Tagen diese Woche. Systeme laufen nur zuverlässig, wenn jemand sie pflegt.',
      map: 'Auf gute Kundschafter ist Verlass — bestätige deinen Dienst an 3 Tagen diese Woche.',
    },
    focusTag: 'verantwortung',
    signals: [{ type: 'duty_done', targetCount: 3 }],
  },
  {
    key: 'streak_hold',
    title: 'Flamme am Leben halten',
    narrative: '{guide} passt auf deine Flamme auf — halte deine Streak 3 HÜ in Folge.',
    narrativeByGuide: {
      landscape: 'Ich passe auf deine Flamme auf — halte sie 3 HÜ in Folge am Brennen, dann trage ich sie sicher über den Grat.',
      rocket_launch: 'Ich überwache deine Flamme wie einen Reaktorkern — halte sie 3 HÜ in Folge stabil, kein Ausfall.',
      map: 'Ich behalte deine Flamme im Blick wie einen Kompass — halte sie 3 HÜ in Folge am Leuchten.',
    },
    focusTag: 'ausdauer',
    signals: [{ type: 'streak_hold', targetCount: 3 }],
  },
  {
    key: 'parent_ally',
    title: 'Verbündete rufen',
    narrative: '{guide}: deine Verbündeten helfen mit — 2 Bestätigungen diese Woche.',
    narrativeByGuide: {
      landscape: 'Auch am Berg braucht man ein gutes Team im Basislager — hol dir 2 Bestätigungen deiner Verbündeten diese Woche.',
      rocket_launch: 'Bodenkontrolle einholen: 2 Bestätigungen deiner Verbündeten diese Woche.',
      map: 'Selbst die beste Kartografin braucht ein Basislager — hol dir 2 Bestätigungen deiner Verbündeten diese Woche.',
    },
    focusTag: 'zusammenhalt',
    signals: [{ type: 'parent_confirm', targetCount: 2 }],
  },
  {
    key: 'weekly_bundle',
    title: 'Wochenpaket',
    narrative: '{guide}: schnür dein Wochenpaket — Hausübungen, Dienst und ein Funkspruch.',
    narrativeByGuide: {
      landscape: 'Schnür dein Wochenpaket wie einen Rucksack vor dem Aufstieg — Hausübungen, Dienst und ein Funkspruch, alles verstaut.',
      rocket_launch: 'Checkliste komplett: Hausübungen, Dienst und ein Funkspruch — schnür dein Wochenpaket, Punkt für Punkt.',
      map: 'Schnür dein Wochenpaket wie eine Expeditionstasche — Hausübungen, Dienst und ein Funkspruch, alles griffbereit.',
    },
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
    narrativeByGuide: {
      landscape: 'Fünf HÜ in Folge, ohne eine einzige zu vergessen — das ist Ausdauer, wie man sie nur am steilsten Hang lernt. Ich bin beeindruckt.',
      rocket_launch: 'Fünf HÜ in Folge, null Ausfälle — diese Fehlerquote ist außergewöhnlich niedrig. Beeindruckend, Crew-Mitglied.',
      map: 'Fünf HÜ in Folge, ohne eine einzige Spur zu verlieren — das ist echtes Entdeckerinnen-Talent. Ich bin beeindruckt.',
    },
    focusTag: 'ausdauer',
    tier: 'meister',
    signals: [{ type: 'streak_hold', targetCount: 5 }],
  },
  {
    key: 'vorbereitung_wahlpfad',
    title: 'Vorbereitung — wähle deinen Weg',
    narrative: '{guide}: zwei Wege liegen vor dir — welchen gehst du?',
    narrativeByGuide: {
      landscape: 'Zwei Pfade liegen vor dir am Hang — welchen gehst du?',
      rocket_launch: 'Zwei Flugbahnen berechnet — welche wählst du?',
      map: 'Zwei Pfade zweigen auf meiner Karte ab — welchen gehst du?',
    },
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
  {
    key: 'verantwortung_wahlpfad',
    title: 'Verantwortung — wähle deinen Weg',
    narrative: '{guide}: zwei Aufgaben warten — welche übernimmst du?',
    narrativeByGuide: {
      landscape: 'Zwei Aufgaben warten am Hang — welche übernimmst du?',
      rocket_launch: 'Zwei Aufgaben in der Warteschlange — welche priorisierst du?',
      map: 'Zwei Spuren warten auf meiner Karte — welcher folgst du?',
    },
    focusTag: 'verantwortung',
    choices: [
      {
        key: 'huter',
        label: 'Pfad des Hüters',
        narrative: 'Bestätige deinen Dienst an 3 Tagen diese Woche.',
        signal: { type: 'duty_done', targetCount: 3 },
      },
      {
        key: 'sammler',
        label: 'Pfad des Sammlers',
        narrative: 'Erledige 2 Hausübungen diese Woche.',
        signal: { type: 'homework', targetCount: 2 },
      },
    ],
  },
  {
    key: 'zusammenhalt_wahlpfad',
    title: 'Zusammenhalt — wähle deinen Weg',
    narrative: '{guide}: zwei Wege der Verbundenheit — welchen gehst du?',
    narrativeByGuide: {
      landscape: 'Zwei Wege der Verbundenheit liegen vor dir — welchen gehst du?',
      rocket_launch: 'Zwei Verbindungen stehen zur Wahl — welche stellst du her?',
      map: 'Zwei Wege der Verbundenheit zweigen ab — welchen gehst du?',
    },
    focusTag: 'zusammenhalt',
    choices: [
      {
        key: 'verbuendete',
        label: 'Pfad der Verbündeten',
        narrative: 'Hol dir 2 Bestätigungen deiner Eltern.',
        signal: { type: 'parent_confirm', targetCount: 2 },
      },
      {
        key: 'ausdauernd',
        label: 'Pfad des Ausdauernden',
        narrative: 'Halte deine Streak 3 HÜ in Folge.',
        signal: { type: 'streak_hold', targetCount: 3 },
      },
    ],
  },
  {
    key: 'aufmerksamkeit_wahlpfad',
    title: 'Aufmerksamkeit — wähle deinen Weg',
    narrative: '{guide}: zwei Dinge verdienen deinen Blick — worauf achtest du?',
    narrativeByGuide: {
      landscape: 'Zwei Dinge verdienen deinen Blick vom Grat aus — worauf achtest du?',
      rocket_launch: 'Zwei Signale eingegangen — welches verfolgst du?',
      map: 'Zwei Zeichen am Wegesrand — worauf achtest du?',
    },
    focusTag: 'aufmerksamkeit',
    choices: [
      {
        key: 'funker',
        label: 'Pfad des Funkers',
        narrative: 'Sieh dir eine Erinnerung an.',
        signal: { type: 'reminder', targetCount: 1 },
      },
      {
        key: 'planer',
        label: 'Pfad des Planers',
        narrative: 'Behalte deinen nächsten Termin im Blick.',
        signal: { type: 'event_ready', targetCount: 1 },
      },
    ],
  },
]

export function findQuestTemplate(key: string): QuestTemplate | undefined {
  return QUEST_VAULT.find(t => t.key === key)
}

/** Liefert den anzuzeigenden Quest-Text: die guide-eigene Formulierung, falls
 *  vorhanden, sonst der generische Text mit eingesetztem Guide-Namen. Geteilt
 *  zwischen Solo-Quests (QuestTemplate) und der Gilden-Quest
 *  (GuildQuestTemplate in lib/guilds.ts) — beide haben dieselbe Form
 *  {narrative, narrativeByGuide}. */
export function resolveQuestNarrative(narrative: string, narrativeByGuide: Partial<Record<string, string>> | undefined, guideIcon: string, guideName: string): string {
  return narrativeByGuide?.[guideIcon] ?? narrative.replace('{guide}', guideName)
}
