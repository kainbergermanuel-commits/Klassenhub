/** Interaktive Rätsel-Quests (Idee: Quests, die eine echte Interaktion +
 *  Neugier/Lesen verlangen, kein bloßes Mechanik-Häkchen).
 *
 *  Wie der Quest-Vorrat (lib/questVault.ts) lebt der Rätsel-INHALT als Code,
 *  nur der Gelöst-Zustand in der DB (quest_riddle_solutions). Die RICHTIGE
 *  Antwort steht bewusst NICHT hier, sondern server-only in lib/riddles.server.ts
 *  — sonst könnten neugierige Kids sie im Client-Quelltext lesen statt in der
 *  Story. Dieses Modul ist client-sicher (nur Frage + Optionen, keine Lösung).
 *
 *  Kadenz "Arc-Item" (siehe Design "beides je nach Rätselart"): pro gebauter
 *  Welt ein leichtes Story-Verständnis-Rätsel, das zum Nochmal-Lesen der
 *  aktuellen Welt einlädt. Das seltene, welten-übergreifende Splitter-Rätsel
 *  kommt später als eigene, standalone Kadenz. */

/** Zwei Kadenzen/Formen, bewusst beide im Pool (Manuels Entscheidung):
 *  - multiple_choice: antippen, barrierearm (jüngere Kinder, Legasthenie).
 *  - password: freies Tippen, wo das Zusammensetzen selbst der Reiz ist
 *    (Eltern dürfen helfen). Server-seitig großzügig normalisiert. */
export type RiddleKind = 'multiple_choice' | 'password'

export interface RiddleOption {
  key: string
  label: string
}

export interface Riddle {
  key: string
  /** Theme-Icon der Welt, zu der ein Arc-Item-Rätsel gehört (siehe
   *  SCHOOL_YEAR_ARCS / seasonTheme.ts) — bestimmt, wann das Item auftaucht.
   *  `null` = nicht an eine einzelne Welt gebunden (z.B. das welten-
   *  übergreifende Splitter-Rätsel). */
  arcIcon: string | null
  kind: RiddleKind
  /** Name des temporären Rätsel-Gegenstands im Rucksack/auf der Karte —
   *  welt-thematisch (Werkzeug/Gefäß fürs Rätsel, KEIN Sammel-/Deko-Item). */
  itemLabel: string
  /** Material-Symbol des Items. */
  itemIcon: string
  /** Kurze Einleitung in der Stimme des Welt-Guides (Flavour). */
  intro: string
  prompt: string
  /** Nur bei kind='multiple_choice'. Bei 'password' zeigt die UI ein Textfeld. */
  options?: RiddleOption[]
  /** Nur bei kind='password': Platzhalter im Eingabefeld. */
  placeholder?: string
  /** Auflösungs-/Feier-Text nach korrekter Lösung (feiert, steuert nicht). */
  reward: string
}

/** Ein Story-Verständnis-Rätsel je gebauter Welt. Jede Frage zielt bewusst auf
 *  die Splitter-Enthüllung der jeweiligen Welt (den roten Faden) — wer die
 *  letzte Etappe gelesen hat, kennt die Antwort. */
export const RIDDLES: Riddle[] = [
  {
    key: 'arc_landscape_gipfel',
    arcIcon: 'landscape', // Bergexpedition, Bergführerin Vala
    kind: 'multiple_choice',
    itemLabel: 'Valas Fernrohr',
    itemIcon: 'search',
    intro: 'Vala reicht dir ihr Fernrohr: „Erinnerst du dich noch an den Gipfel?"',
    prompt: 'Ganz oben am Gipfel entdeckt die Klasse etwas weit draußen am Horizont, das zu keiner von Valas Karten passt. Was ist es?',
    options: [
      { key: 'licht', label: 'Ein warmes Licht, das zu keiner Karte passt' },
      { key: 'berg', label: 'Ein noch höherer, zweiter Berg' },
      { key: 'sturm', label: 'Ein aufziehender Schneesturm' },
      { key: 'lager', label: 'Das Basislager tief unten im Tal' },
    ],
    reward: 'Genau. Dieses seltsame Leuchten war der allererste Hinweis auf eure lange Reise — ein Zeichen des Splitters flackert kurz auf.',
  },
  {
    key: 'arc_rocket_launch_summen',
    arcIcon: 'rocket_launch', // Weltraummission, Bordcomputer ARI
    kind: 'multiple_choice',
    itemLabel: 'ARIs Aufzeichnung',
    itemIcon: 'graphic_eq',
    intro: 'ARI spielt eine gespeicherte Aufnahme ab: „Analyse gefragt, Crew-Mitglied."',
    prompt: 'Beim Mondvorbeiflug reißt der Funkkontakt zur Erde ab. In der Stille zeichnet ARI etwas Merkwürdiges auf. Was?',
    options: [
      { key: 'summen', label: 'Ein Summen, das aus keinem System an Bord kommt' },
      { key: 'funk', label: 'Einen Funkspruch von der Bodencrew' },
      { key: 'asteroid', label: 'Das Aufprallgeräusch eines Asteroiden' },
      { key: 'motor', label: 'Ein Stottern der Triebwerke' },
    ],
    reward: 'Korrekt. Dasselbe Summen, das später der Splitter von sich gibt — ein Zeichen flackert kurz auf.',
  },
  {
    key: 'arc_map_splitter',
    arcIcon: 'map', // Schatzsuche, Kartografin Isla
    kind: 'multiple_choice',
    itemLabel: 'Islas Lupe',
    itemIcon: 'zoom_in',
    intro: 'Isla hält dir ihre Lupe hin: „Schau noch mal genau in die Schatzkammer."',
    prompt: 'In der Schatzkammer glänzt Gold, doch zwischen den Münzen liegt etwas viel Wichtigeres. Was nimmt die Klasse vorsichtig mit?',
    options: [
      { key: 'splitter', label: 'Einen kleinen, warm leuchtenden Splitter mit feinen Zeichen' },
      { key: 'krone', label: 'Eine goldene Krone' },
      { key: 'karte', label: 'Eine zweite, größere Schatzkarte' },
      { key: 'kompass', label: 'Islas verlorenen Kompass' },
    ],
    reward: 'Ja! Dieser Splitter ist der rote Faden eurer ganzen Reise — ein Zeichen darauf leuchtet kurz auf.',
  },
]

/** Das seltene, welten-übergreifende Splitter-Rätsel (die zweite Kadenz:
 *  „besonderer Moment" statt wöchentliches Häppchen). Freitext, weil das
 *  Zusammenführen der Hinweise aus drei Welten selbst der Reiz ist. Erscheint
 *  erst, wenn der Splitter in der Story aufgetaucht ist (ab Schatzsuche) — dann
 *  hat das Kind alle nötigen Hinweise gelesen. */
export const SPLITTER_RIDDLE: Riddle = {
  key: 'splitter_verbindet',
  arcIcon: null,
  kind: 'password',
  itemLabel: 'Der Splitter',
  itemIcon: 'auto_awesome',
  intro: 'Etwas zieht sich leuchtend durch alle Welten. Kannst du es benennen?',
  prompt: 'In Valas Bergwelt seht ihr am Gipfel ein rätselhaftes Licht. In ARIs Weltraum zeichnet der Bordcomputer ein seltsames Summen auf. In Islas Schatzkammer findet ihr schließlich einen kleinen, warm leuchtenden Stein voller feiner Zeichen — und Licht wie Summen gehören zu ihm. Wie heißt dieser Stein, der eure ganze Reise verbindet?',
  placeholder: 'Lösungswort eingeben …',
  reward: 'Genau — der Splitter. Licht, Summen und Zeichen sind alle Teil von ihm. Du hast den roten Faden eurer ganzen Reise erkannt.',
}

const ALL_RIDDLES: Riddle[] = [...RIDDLES, SPLITTER_RIDDLE]

/** Das Arc-Item-Rätsel der aktuell aktiven Welt (falls es eines gibt). */
export function riddleForArc(arcIcon: string): Riddle | undefined {
  return RIDDLES.find(r => r.arcIcon === arcIcon)
}

export function findRiddle(key: string): Riddle | undefined {
  return ALL_RIDDLES.find(r => r.key === key)
}
