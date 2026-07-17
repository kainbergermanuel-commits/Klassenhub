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

/** Drei Kadenzen/Formen, bewusst alle im Pool (Manuels Entscheidung):
 *  - multiple_choice: antippen, barrierearm (jüngere Kinder, Legasthenie).
 *  - password: freies Tippen, wo das Zusammensetzen selbst der Reiz ist
 *    (Eltern dürfen helfen). Server-seitig großzügig normalisiert.
 *  - fragment_order: Fragment-Chips in die richtige Reihenfolge tippen —
 *    barrierearme Variante des "Passwort aus Fragmenten"-Gedankens (kein
 *    Freitext nötig, aber echtes Nochmal-Lesen über mehrere Welten hinweg). */
export type RiddleKind = 'multiple_choice' | 'password' | 'fragment_order'

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
  /** Nur bei kind='fragment_order': Fragmente, die in eine bestimmte
   *  Reihenfolge gebracht werden müssen. Die Reihenfolge HIER im Array ist
   *  NICHT die korrekte Lösung (die steht server-only) — sie wird beim
   *  Anzeigen deterministisch gemischt (siehe shuffledFragments). */
  fragments?: RiddleOption[]
  /** Nur bei kind='password': Platzhalter im Eingabefeld. */
  placeholder?: string
  /** Auflösungs-/Feier-Text nach korrekter Lösung (feiert, steuert nicht). */
  reward: string
  /** Mehrstufige Rätsel (Teil1→Teil2): dieses Rätsel erscheint erst, wenn das
   *  Rätsel mit diesem Key bereits gelöst ist — Neugier/Spannung ohne Zwang,
   *  da es einfach still erscheint, sobald man bereit ist (kein "gesperrt"-
   *  Zustand, kein Timer). `undefined` = sofort sichtbar (kein Vorgänger). */
  requires?: string
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
 *  „besonderer Moment" statt wöchentliches Häppchen) — zweistufig, wie
 *  Manuels Idee "Teil 1 in Welt A, Teil 2 in Welt B, zusammensetzen":
 *
 *  Teil 1 (fragment_order, barrierearm): drei Spur-Zitate aus den drei
 *  gebauten Welten in der Reihenfolge antippen, in der die Klasse sie
 *  durchlebt hat — zwingt zum Nochmal-Lesen aller drei Etappen auf
 *  /streaks/reise, nicht nur Erinnern.
 *  Teil 2 (password, `requires: splitter_teil1`): erscheint erst nach Teil 1,
 *  fragt nach dem Namen des Dings, das alle drei Spuren verbindet. */
export const SPLITTER_TEIL1: Riddle = {
  key: 'splitter_teil1',
  arcIcon: null,
  kind: 'fragment_order',
  itemLabel: 'Der Splitter — Spurensuche',
  itemIcon: 'travel_explore',
  intro: 'Drei Spuren ziehen sich leuchtend durch eure Reise. In welcher Reihenfolge seid ihr ihnen begegnet?',
  prompt: 'Bringt die drei Spuren in die Reihenfolge, in der die Klasse sie erlebt hat — zuerst, zweitens, zuletzt.',
  fragments: [
    { key: 'berg', label: '„…ein warmes Licht, das zu keiner meiner Karten passt." (Vala, Gipfel)' },
    { key: 'all', label: '„…ein Summen, das aus keinem System an Bord kommt." (ARI, Mondvorbeiflug)' },
    { key: 'dschungel', label: '„…ein warm leuchtender Splitter, über und über bedeckt mit feinen Zeichen." (Isla, Schatzkammer)' },
  ],
  reward: 'Richtig! Erst das Licht am Gipfel, dann das Summen im All, zuletzt der Splitter selbst in der Schatzkammer. Aber was verbindet diese drei Spuren eigentlich? Vielleicht weißt du jetzt, wie das leuchtende Ding heißt …',
}

export const SPLITTER_TEIL2: Riddle = {
  key: 'splitter_teil2',
  arcIcon: null,
  kind: 'password',
  itemLabel: 'Der Splitter — Auflösung',
  itemIcon: 'auto_awesome',
  requires: 'splitter_teil1',
  intro: 'Du hast die drei Spuren richtig geordnet. Jetzt fehlt nur noch ein Wort.',
  prompt: 'Licht am Gipfel, Summen im All, ein leuchtender Stein voller Zeichen in der Schatzkammer — alle drei gehören zu ein und demselben Ding. Wie heißt es?',
  placeholder: 'Lösungswort eingeben …',
  reward: 'Genau — der Splitter. Licht, Summen und Zeichen sind alle Teil von ihm. Du hast den roten Faden eurer ganzen Reise erkannt.',
}

const ALL_RIDDLES: Riddle[] = [...RIDDLES, SPLITTER_TEIL1, SPLITTER_TEIL2]

/** Das Arc-Item-Rätsel der aktuell aktiven Welt (falls es eines gibt). */
export function riddleForArc(arcIcon: string): Riddle | undefined {
  return RIDDLES.find(r => r.arcIcon === arcIcon)
}

export function findRiddle(key: string): Riddle | undefined {
  return ALL_RIDDLES.find(r => r.key === key)
}

/** Deterministisch gemischte Reihenfolge der Fragmente eines fragment_order-
 *  Rätsels — stabil je Rätsel-Key (kein Neumischen bei jedem Render), aber
 *  KEIN Hinweis auf die korrekte Lösung (die liegt server-only). Gleicher
 *  Hash-Ansatz wie defaultWeeklyTemplateKeys (lib/quests.ts). */
export function shuffledFragments(riddle: Riddle): RiddleOption[] {
  const fragments = riddle.fragments ?? []
  let h = 0
  for (let i = 0; i < riddle.key.length; i++) h = (h * 31 + riddle.key.charCodeAt(i)) >>> 0
  const arr = [...fragments]
  for (let i = arr.length - 1; i > 0; i--) {
    h = (Math.imul(h, 1103515245) + 12345) >>> 0
    const j = h % (i + 1)
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/** Alle aktuell sichtbaren Rätsel: das Arc-Item der aktiven Welt + die
 *  freigeschalteten Stufen des Splitter-Rätsels (nur wenn ihr `requires`
 *  bereits gelöst ist oder sie keins haben). Zentral hier statt in jeder
 *  Server-Component dupliziert (Start + /streaks). */
export function activeRiddles(arcIcon: string, splitterUnlocked: boolean, solvedKeys: Set<string>): Riddle[] {
  const arc = riddleForArc(arcIcon)
  const splitterChain = splitterUnlocked
    ? [SPLITTER_TEIL1, SPLITTER_TEIL2].filter(r => !r.requires || solvedKeys.has(r.requires))
    : []
  return [arc, ...splitterChain].filter((r): r is Riddle => !!r)
}
