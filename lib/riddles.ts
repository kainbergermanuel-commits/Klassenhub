import { isArcUnlocked } from '@/lib/seasonTheme'

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
  /** Welt-Gate: erscheint erst, wenn diese Welt im Fahrplan erreicht ist
   *  (Theme-Icon, geprüft über isArcUnlocked). Für Rätsel, deren Antwort erst
   *  in einer späteren Welt enthüllt wird — sonst stünde ein unlösbares Rätsel
   *  monatelang offen. `undefined` = kein Welt-Gate. */
  requiresArc?: string
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
      { key: 'berg', label: 'Ein zweiter Gipfel, deutlich höher als dieser hier' },
      { key: 'sturm', label: 'Ein Schneesturm, der von Osten aufzieht' },
      { key: 'lager', label: 'Das Basislager, winzig tief unten im Tal' },
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
      { key: 'funk', label: 'Einen späten Funkspruch der Bodencrew von der Erde' },
      { key: 'asteroid', label: 'Das Aufprallgeräusch eines sehr kleinen Asteroiden' },
      { key: 'motor', label: 'Ein Stottern der Triebwerke beim Kurswechsel' },
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
      { key: 'splitter', label: 'Einen kleinen Stein voller feiner Zeichen' },
      { key: 'krone', label: 'Eine goldene Krone mit sieben eingelassenen Edelsteinen' },
      { key: 'karte', label: 'Eine zweite Schatzkarte, viel größer als die erste' },
      { key: 'kompass', label: 'Islas alten Messingkompass, den sie seit Jahren vermisst' },
    ],
    reward: 'Ja! Dieser Splitter ist der rote Faden eurer ganzen Reise — ein Zeichen darauf leuchtet kurz auf.',
  },
  {
    key: 'arc_eco_erstes_zeichen',
    arcIcon: 'eco', // Terra Nova, Ranger-Drohne „Sprout“
    kind: 'multiple_choice',
    itemLabel: 'Sprouts Fundkiste',
    itemIcon: 'grass',
    intro: 'Sprout schwirrt aufgeregt heran: „Weißt du noch, wann er das erste Mal geantwortet hat?"',
    prompt: 'Im Ödland erwacht das erste Zeichen auf dem Splitter. In welchem Moment passiert das?',
    options: [
      { key: 'halm', label: 'Als der erste grüne Halm aus einem Riss wächst' },
      { key: 'regen', label: 'Als über dem Ödland der erste Regen niedergeht' },
      { key: 'nacht', label: 'In der ersten Nacht, die ihr dort draußen verbringt' },
      { key: 'wurzel', label: 'Als ihr den steinernen Setzling im Boden ausgrabt' },
    ],
    reward: 'Richtig. Der Splitter antwortet dem Leben, nicht dem Wetter. Sprout hat es zuerst gemerkt.',
  },
  {
    key: 'arc_water_saeule',
    arcIcon: 'water', // Tiefsee-Expedition, Dr. Coralie & Nauto
    kind: 'multiple_choice',
    itemLabel: 'Nautos Leuchtprobe',
    itemIcon: 'water_drop',
    intro: 'Nauto blinkt dir ein Muster zu, das du schon einmal gesehen hast.',
    prompt: 'Im leuchtenden Graben findet ihr eine versunkene Säule mit gemeißelten Zeichen. Warum bringt sie euch nicht sofort weiter?',
    options: [
      { key: 'haelfte', label: 'Die Zeichenreihe bricht an der Bruchkante ab' },
      { key: 'dunkel', label: 'Es ist zu dunkel, um die Zeichen zu erkennen' },
      { key: 'sprache', label: 'Coralie kennt die Sprache der Zeichen nicht' },
      { key: 'strom', label: 'Die Strömung treibt euch zu schnell daran vorbei' },
    ],
    reward: 'Genau. Die zweite Hälfte lag noch viel tiefer, in der Stille, wo nur euer eigenes Licht hinkam.',
  },
  {
    key: 'arc_history_edu_wanderer',
    arcIcon: 'history_edu', // Chroniken der Zeit, Der Chronist
    kind: 'multiple_choice',
    itemLabel: 'Die volle Chronik',
    itemIcon: 'menu_book',
    intro: 'Der Chronist schlägt das Buch noch einmal auf: „Eine Frage zur Sicherheit."',
    prompt: 'In der Vision seht ihr die ersten Wanderer bei ihrer Arbeit. Was genau tun sie dort?',
    options: [
      { key: 'pflanzen', label: 'Sie pflanzen die Samen ganzer Welten in den Boden' },
      { key: 'zeichnen', label: 'Sie zeichnen die ersten Karten aller Welten auf' },
      { key: 'bauen', label: 'Sie bauen die Tore, die die Welten verbinden' },
      { key: 'suchen', label: 'Sie suchen einen Splitter, den sie verloren haben' },
    ],
    reward: 'So ist es. Berge, Meere, ein Himmel darüber: alles gepflanzt. Und einen Samen haben sie zurückgelassen.',
  },
  {
    key: 'arc_anchor_tor',
    arcIcon: 'anchor', // Inselreich, Hafenmeister Finn
    kind: 'multiple_choice',
    itemLabel: 'Finns Sturmlaterne',
    itemIcon: 'construction',
    intro: 'Finn stellt die Laterne auf den Steg: „Kurze Frage, dann hast du Ruhe."',
    prompt: 'Nach dem großen Sturm liegt am Nordrand der Sandbank etwas frei. Was passiert, als ihr den Splitter hineinsetzt?',
    options: [
      { key: 'sterne', label: 'Für drei Sekunden steht ein fremder Nachthimmel darin' },
      { key: 'wasser', label: 'Das Wasser rundherum beginnt hell zu leuchten' },
      { key: 'stimme', label: 'Aus dem Stein spricht eine sehr leise Stimme' },
      { key: 'nichts', label: 'Zuerst passiert gar nichts, dann bricht das Tor' },
    ],
    reward: 'Ja. Ein Himmel, der nicht zu diesem Ort gehört. Da war klar: Der Stein verbindet Orte miteinander.',
  },
  {
    key: 'arc_auto_awesome_sternbild',
    arcIcon: 'auto_awesome', // Sternenkarte, Astronomin Nox
    kind: 'multiple_choice',
    itemLabel: 'Nox’ Notizbuch',
    itemIcon: 'star',
    intro: 'Nox schiebt dir ihr Notizbuch hin: „Sag mir, was du gesehen hast."',
    prompt: 'Die neuen Sterne fügen sich zu einem Sternbild zusammen, das Nox nicht kennt. Was stellt es dar?',
    options: [
      { key: 'baum', label: 'Einen Baum mit einer weit ausladenden Krone' },
      { key: 'schiff', label: 'Ein Segelschiff mit zwei hohen Masten' },
      { key: 'schluessel', label: 'Einen Schlüssel mit sieben feinen Zacken' },
      { key: 'welle', label: 'Eine Welle, die sich über den Himmel legt' },
    ],
    reward: 'Richtig. Ein Baum aus Licht, und mitten in der Krone fehlte lange ein einziger Stern.',
  },
  {
    key: 'arc_precision_manufacturing_wappen',
    arcIcon: 'precision_manufacturing', // Werkstatt der Erfinder, Meisterin Tüftel
    kind: 'multiple_choice',
    itemLabel: 'Tüftels Lupe',
    itemIcon: 'settings',
    intro: 'Tüftel schiebt die Schutzbrille hoch: „Eine Frage, dann darfst du weiter."',
    prompt: 'Tüftels Maschine fügt die verstreuten Zeichen endlich zusammen. Was zeigt sich dabei, und was merkt ihr im selben Moment?',
    options: [
      { key: 'wappen', label: 'Ein Wappen mit einem Baum, und der Stein pocht' },
      { key: 'karte', label: 'Eine Karte des Meeres, und der Stein wird kalt' },
      { key: 'name', label: 'Ein einzelner Name, und die Maschine bleibt stehen' },
      { key: 'tuer', label: 'Eine offene Tür, und im Raum wird es sehr hell' },
    ],
    reward: 'Genau. Ein pochender Stein ist kein Stein. Tüftel hat es als Erste ausgesprochen.',
  },
  {
    key: 'arc_park_hoechster_ast',
    arcIcon: 'park', // Der Weltenbaum, Wächterin des Weltenbaums
    kind: 'multiple_choice',
    itemLabel: 'Ein Blatt vom Weltenbaum',
    itemIcon: 'forest',
    intro: 'Die Wächterin reicht dir ein Blatt: „Erinnerst du dich an den letzten Ast?"',
    prompt: 'Auf jedem Ast des Weltenbaums erscheint eine der bereisten Welten. Nur der höchste Ast bleibt lange kahl. Wann schlägt er aus?',
    options: [
      { key: 'letzte', label: 'Mit der allerletzten Aufgabe des Schuljahres' },
      { key: 'samen', label: 'In dem Moment, in dem ihr den Samen einpflanzt' },
      { key: 'sofort', label: 'Sofort, gemeinsam mit allen anderen Ästen' },
      { key: 'nie', label: 'Er bleibt kahl, das gehört zur Geschichte dazu' },
    ],
    reward: 'So ist es. Der schönste Ast wartete bis zum Schluss, und mit ihm ging die Tür in der Krone auf.',
  },
  {
    key: 'arc_wb_sunny_ankunft',
    arcIcon: 'wb_sunny', // Sonnenhafen, alle Guides gemeinsam
    kind: 'multiple_choice',
    itemLabel: 'Ein Wimpel vom Kai',
    itemIcon: 'sailing',
    intro: 'Am Kai weht ein Wimpel. Jemand hat etwas darauf geschrieben.',
    prompt: 'Im Sonnenhafen wartet am Ende der Reise jemand auf euch. Wer?',
    options: [
      { key: 'alle', label: 'Alle Guide-Figuren der Reise, gemeinsam am Kai' },
      { key: 'waechterin', label: 'Nur die Wächterin, die euch hergeführt hat' },
      { key: 'vala', label: 'Vala allein, so wie ganz am Anfang im Basislager' },
      { key: 'niemand', label: 'Niemand, der Hafen liegt still in der Sonne' },
    ],
    reward: 'Genau. Vala, ARI, Isla, Sprout, Coralie und Nauto, der Chronist, Finn, Nox, Tüftel und die Wächterin. Alle.',
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
  reward: 'Richtig! Erst das Licht am Gipfel, dann das Summen im All, zuletzt der leuchtende Stein in der Schatzkammer. Drei Spuren, ein Ding. Was es wirklich ist, weiß bisher niemand, nicht einmal Isla. Am Ende der Reise wird es dir jemand sagen.',
}

export const SPLITTER_TEIL2: Riddle = {
  key: 'splitter_teil2',
  arcIcon: null,
  kind: 'password',
  // Weder Titel noch Frage dürfen das Lösungswort enthalten. Vorher hieß das
  // Item „Der Splitter — Auflösung" und die Frage endete auf „Wie heißt es?",
  // während das Wort selbst wörtlich in einem Fragment aus Teil 1 stand: der
  // dramaturgische Höhepunkt war ein Abschreib-Feld.
  itemLabel: 'Das letzte Wort',
  itemIcon: 'auto_awesome',
  requires: 'splitter_teil1',
  // Die Antwort fällt erst im Weltenbaum (Juni), wenn die Wächterin den Samen
  // beim Namen nennt. Vorher wäre das Rätsel unlösbar, deshalb das Welt-Gate.
  requiresArc: 'park',
  intro: 'Du hast die drei Spuren richtig geordnet. Jetzt fehlt nur noch ein Wort.',
  prompt: 'Am Ende der Reise zeigt sich, dass das leuchtende Ding nie ein Stein war. Die Wächterin des Weltenbaums nennt es beim richtigen Namen. Wie nennt sie es?',
  placeholder: 'Ein Wort eingeben …',
  reward: 'Genau: ein Same. Kein Splitter, kein Stein, sondern das Herz des Weltenbaums. Licht, Summen und Zeichen gehörten von Anfang an dazu, und du hast es erkannt, bevor der Baum gewachsen ist.',
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
export function activeRiddles(
  arcIcon: string,
  splitterUnlocked: boolean,
  solvedKeys: Set<string>,
  currentThemeName?: string,
): Riddle[] {
  const arc = riddleForArc(arcIcon)
  const gateOpen = (r: Riddle) => {
    if (r.requires && !solvedKeys.has(r.requires)) return false
    // Welt-Gate: ohne currentThemeName (Altaufrufer) bleibt Gegatetes zu.
    if (r.requiresArc) return !!currentThemeName && isArcUnlocked(r.requiresArc, currentThemeName)
    return true
  }
  const splitterChain = splitterUnlocked ? [SPLITTER_TEIL1, SPLITTER_TEIL2].filter(gateOpen) : []
  return [arc, ...splitterChain].filter((r): r is Riddle => !!r)
}
