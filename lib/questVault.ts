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
  /** Guide-eigene Formulierung (kein `{guide}`-Platzhalter, direkt fertig).
   *  Alle elf Guides des Fahrplans sind abgedeckt, passend zu GUIDE_VOICES in
   *  lib/heldenbuch.ts. Fehlt ein Eintrag, greift der generische
   *  `narrative`-Text mit Namens-Einsetzung (siehe resolveQuestNarrative) —
   *  das bleibt der Sicherheitsnetz-Pfad für künftige Welten. */
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

// Guide-Icon-Schlüssel (siehe lib/seasonTheme.ts SCHOOL_YEAR_ARCS), in
// Fahrplan-Reihenfolge: landscape = Vala, rocket_launch = ARI, map = Isla,
// eco = Sprout, water = Coralie & Nauto, history_edu = Der Chronist,
// anchor = Finn, auto_awesome = Nox, precision_manufacturing = Tüftel,
// park = Wächterin, wb_sunny = alle gemeinsam.

export const QUEST_VAULT: QuestTemplate[] = [
  {
    key: 'hw_early',
    title: 'Vor der Zeit',
    narrative: '{guide}: reiche eine Hausübung ab, bevor sie fällig ist.',
    narrativeByGuide: {
      landscape: 'Ich sehe das gern früh am Tag: reich eine Hausübung ab, bevor sie überhaupt fällig ist — wie ein Aufstieg vor Sonnenaufgang.',
      rocket_launch: 'Frühwarnsystem aktiv: reiche eine Hausübung ab, bevor die Frist überhaupt beginnt. Effizienz, Crew-Mitglied.',
      map: 'Wer früh aufbricht, findet die Spur zuerst — reiche eine Hausübung ab, bevor sie überhaupt fällig ist.',
      eco: 'Wer früh sät, erntet zuerst: reich eine Hausübung ab, bevor sie überhaupt fällig ist.',
      water: 'Wir tauchen ab, bevor die Strömung dreht: reich eine Hausübung ab, bevor sie fällig ist.',
      history_edu: 'Eine Seite, die vor ihrer Zeit geschrieben wird, liest sich am schönsten: reich eine Hausübung ab, bevor sie fällig ist.',
      anchor: 'Der beste Steg entsteht bei ruhiger See: reich eine Hausübung ab, bevor sie fällig ist.',
      auto_awesome: 'Manche Sterne gehen auf, bevor es ganz dunkel ist: reich eine Hausübung ab, bevor sie fällig ist.',
      precision_manufacturing: 'Fertig, bevor die Glocke läutet: reich eine Hausübung ab, bevor sie überhaupt fällig ist.',
      park: 'Die erste Knospe öffnet sich immer ein wenig zu früh: reich eine Hausübung ab, bevor sie fällig ist.',
      wb_sunny: 'Auch im Hafen läuft ein Schiff manchmal früher ein: reich eine Hausübung ab, bevor sie fällig ist.',
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
      eco: 'Drei Tage gießen, nicht alles auf einmal: an 3 verschiedenen Tagen diese Woche eine Hausübung erledigt.',
      water: 'Drei Tauchgänge an drei Tagen, so hält der Druckausgleich: an 3 verschiedenen Tagen eine Hausübung erledigt.',
      history_edu: 'Drei Seiten an drei Tagen, so entsteht jede Chronik: an 3 verschiedenen Tagen diese Woche eine Hausübung erledigt.',
      anchor: 'Drei Tage, drei Steine, so wächst ein Hafen: an 3 verschiedenen Tagen diese Woche eine Hausübung erledigt.',
      auto_awesome: 'Drei Nächte, drei Lichter: an 3 verschiedenen Tagen diese Woche eine Hausübung erledigt.',
      precision_manufacturing: 'Drei Handgriffe an drei Tagen statt einer Nachtschicht: an 3 verschiedenen Tagen eine Hausübung erledigt.',
      park: 'Drei Tage, drei Blätter. Bäume haben es nie eilig: an 3 verschiedenen Tagen eine Hausübung erledigt.',
      wb_sunny: 'Drei ruhige Tage, drei kleine Schritte: an 3 verschiedenen Tagen diese Woche eine Hausübung erledigt.',
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
      eco: 'Ich habe dir was hinterlassen, ganz aufgeregt: schau in deinen Erinnerungen nach.',
      water: 'Eine Nachricht kommt aus der Tiefe herauf: sieh in deinen Erinnerungen nach.',
      history_edu: 'Ich habe dir eine Notiz zwischen die Seiten gelegt: schau in deinen Erinnerungen nach.',
      anchor: 'Vom Leuchtturm wurde dir gewinkt: schau in deinen Erinnerungen nach.',
      auto_awesome: 'Ein Signal steht am Rand deines Himmels: schau in deinen Erinnerungen nach.',
      precision_manufacturing: 'Auf deiner Werkbank klebt ein Zettel von mir: schau in deinen Erinnerungen nach.',
      park: 'Etwas raschelt in deinem Ast: schau in deinen Erinnerungen nach.',
      wb_sunny: 'Am Kai liegt eine Nachricht für dich: schau in deinen Erinnerungen nach.',
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
      eco: 'Auf dich ist Verlass wie auf den Regen: bestätige deinen Dienst an 3 Tagen diese Woche.',
      water: 'An Bord macht jeder seinen Handgriff: bestätige deinen Dienst an 3 Tagen diese Woche.',
      history_edu: 'Ich trage es in die Chronik ein: bestätige deinen Dienst an 3 Tagen diese Woche.',
      anchor: 'Ohne verlässliche Hände steht kein Hafen: bestätige deinen Dienst an 3 Tagen diese Woche.',
      auto_awesome: 'Verlässlich wie ein Stern, der jede Nacht am selben Platz steht: bestätige deinen Dienst an 3 Tagen diese Woche.',
      precision_manufacturing: 'Wartung ist die halbe Maschine: bestätige deinen Dienst an 3 Tagen diese Woche.',
      park: 'Wurzeln arbeiten still und jeden Tag: bestätige deinen Dienst an 3 Tagen diese Woche.',
      wb_sunny: 'Auch im Hafen wird der Steg gefegt: bestätige deinen Dienst an 3 Tagen diese Woche.',
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
      eco: 'Ich passe auf dein kleines Licht auf: halte deine Flamme 3 HÜ in Folge am Brennen.',
      water: 'Wir halten die Leuchtspur zusammen: halte deine Flamme 3 HÜ in Folge am Brennen.',
      history_edu: 'Ich führe Buch über deine Flamme: halte sie 3 HÜ in Folge am Brennen.',
      anchor: 'Ich sichere die Laterne gegen den Wind: halte deine Flamme 3 HÜ in Folge am Brennen.',
      auto_awesome: 'Ich behalte dein Licht am Himmel im Blick: halte es 3 HÜ in Folge am Leuchten.',
      precision_manufacturing: 'Ich halte die Zündung stabil: halte deine Flamme 3 HÜ in Folge am Brennen.',
      park: 'Ich hüte dein Licht wie einen jungen Trieb: halte es 3 HÜ in Folge am Brennen.',
      wb_sunny: 'Wir alle halten hier ein Licht für dich bereit: halte deine Flamme 3 HÜ in Folge am Brennen.',
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
      eco: 'Auch ein Trieb braucht jemanden, der gießt: hol dir 2 Bestätigungen deiner Verbündeten diese Woche.',
      water: 'Kein Tauchgang ohne Leute an der Oberfläche: hol dir 2 Bestätigungen deiner Verbündeten diese Woche.',
      history_edu: 'Jede Chronik braucht einen zweiten Zeugen: hol dir 2 Bestätigungen deiner Verbündeten diese Woche.',
      anchor: 'Ein Tau hält nur, wenn zwei daran ziehen: hol dir 2 Bestätigungen deiner Verbündeten diese Woche.',
      auto_awesome: 'Zwei Augenpaare sehen mehr am Himmel als eines: hol dir 2 Bestätigungen deiner Verbündeten diese Woche.',
      precision_manufacturing: 'Vier Hände sind an der Werkbank besser als zwei: hol dir 2 Bestätigungen deiner Verbündeten diese Woche.',
      park: 'Kein Baum wächst ohne Boden, der ihn trägt: hol dir 2 Bestätigungen deiner Verbündeten diese Woche.',
      wb_sunny: 'Niemand kommt allein im Hafen an: hol dir 2 Bestätigungen deiner Verbündeten diese Woche.',
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
      eco: 'Pack deine Wochentasche: Hausübungen, Dienst und ein Funkspruch, alles beisammen.',
      water: 'Ausrüstungscheck vor dem Abtauchen: Hausübungen, Dienst und ein Funkspruch.',
      history_edu: 'Ein vollständiges Kapitel braucht alle Teile: Hausübungen, Dienst und ein Funkspruch.',
      anchor: 'Alles an Bord vor dem Ablegen: Hausübungen, Dienst und ein Funkspruch.',
      auto_awesome: 'Drei Punkte ergeben erst zusammen ein Bild: Hausübungen, Dienst und ein Funkspruch.',
      precision_manufacturing: 'Die Maschine braucht alle drei Teile: Hausübungen, Dienst und ein Funkspruch.',
      park: 'Ein Ast trägt erst mit allen Blättern: Hausübungen, Dienst und ein Funkspruch.',
      wb_sunny: 'Alles verstaut für die Heimfahrt: Hausübungen, Dienst und ein Funkspruch.',
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
      eco: 'Fünf HÜ in Folge, ohne eine zu vergessen. So etwas sehe ich selten wachsen, ehrlich!',
      water: 'Fünf HÜ in Folge, ohne einmal aufzutauchen. Nauto leuchtet gerade sehr aufgeregt.',
      history_edu: 'Fünf HÜ in Folge, lückenlos. Ich habe diese Zeile doppelt unterstrichen.',
      anchor: 'Fünf HÜ in Folge, ohne dass ein Brett gefehlt hätte. Darauf baue ich gern weiter.',
      auto_awesome: 'Fünf HÜ in Folge, ohne dass ein Licht ausging. So etwas hält man in einer Sternkarte fest.',
      precision_manufacturing: 'Fünf HÜ in Folge, ohne einmal zu stocken. Diese Laufruhe ist Handwerk.',
      park: 'Fünf HÜ in Folge, ohne Unterbrechung. Das ist ein guter Jahresring.',
      wb_sunny: 'Fünf HÜ in Folge, bis hierher. Alle am Kai heben kurz den Kopf.',
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
      eco: 'Zwei Beete liegen vor dir. Welches legst du an?',
      water: 'Zwei Strömungen, zwei Wege nach unten. Welchem folgst du?',
      history_edu: 'Zwei Seiten schlagen sich auf. Welche liest du zuerst?',
      anchor: 'Zwei Stege führen aufs Wasser hinaus. Welchen nimmst du?',
      auto_awesome: 'Zwei Bahnen zeichnen sich am Himmel ab. Welcher folgst du?',
      precision_manufacturing: 'Zwei Baupläne liegen auf der Werkbank. Welchen ziehst du dir heran?',
      park: 'Zwei Wurzeln wachsen in verschiedene Richtungen. Welcher folgst du?',
      wb_sunny: 'Zwei ruhige Wege durch den Hafen. Welchen gehst du?',
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
      eco: 'Zwei Aufgaben liegen im Beet. Welche übernimmst du?',
      water: 'Zwei Handgriffe warten an Bord. Welchen machst du?',
      history_edu: 'Zwei Aufträge stehen im Buch. Welchen erfüllst du?',
      anchor: 'Zwei Arbeiten warten am Kai. Welche packst du an?',
      auto_awesome: 'Zwei Beobachtungen stehen an. Welche übernimmst du?',
      precision_manufacturing: 'Zwei Reparaturen warten. Welche nimmst du dir vor?',
      park: 'Zwei Äste brauchen dich. Welchen pflegst du?',
      wb_sunny: 'Zwei kleine Aufgaben im Hafen. Welche übernimmst du?',
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
      eco: 'Zwei Wege, auf denen man nicht allein ist. Welchen gehst du?',
      water: 'Zwei Arten, verbunden zu bleiben. Welche wählst du?',
      history_edu: 'Zwei Wege der Verbundenheit. Welchen schreibst du auf?',
      anchor: 'Zwei Taue führen zu anderen. Welches nimmst du?',
      auto_awesome: 'Zwei Lichter, die zu anderen gehören. Welchem folgst du?',
      precision_manufacturing: 'Zwei Verbindungen lassen sich löten. Welche nimmst du?',
      park: 'Zwei Wurzeln greifen nach anderen. Welcher folgst du?',
      wb_sunny: 'Zwei Wege zu den anderen am Kai. Welchen gehst du?',
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
      eco: 'Zwei Dinge rascheln im Grün. Worauf achtest du?',
      water: 'Zwei Signale im dunklen Wasser. Welchem gehst du nach?',
      history_edu: 'Zwei Randnotizen verdienen deinen Blick. Welche liest du?',
      anchor: 'Zwei Zeichen am Horizont. Worauf achtest du?',
      auto_awesome: 'Zwei Lichter flackern kurz auf. Welches verfolgst du?',
      precision_manufacturing: 'Zwei Anzeigen blinken. Welche siehst du dir an?',
      park: 'Zwei Geräusche im Blätterdach. Worauf hörst du?',
      wb_sunny: 'Zwei Dinge im Hafen wollen bemerkt werden. Worauf achtest du?',
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
