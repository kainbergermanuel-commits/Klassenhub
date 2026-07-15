/** Season-Journey: rein visuelles Narrativ über dem Klassenziel-Fortschritt.
 *  Nutzt Material-Symbols-Icons (msym) statt eigener Assets. Das Thema
 *  rotiert monatlich, damit es über die Zeit abwechslungsreich bleibt. */

export interface JourneyStage {
  label: string
  icon: string
  /** Kurzer Erzähltext (1–2 Sätze), der aufklappt, sobald die Klasse diese
   *  Etappe gemeinsam erreicht hat. Stimme des jeweiligen Guides. */
  story: string
}

export interface JourneyTheme {
  name: string
  icon: string
  /** Name der Guide-Figur, deren Stimme Kapitel-Texte und Nudges trägt. */
  guide: string
  /** Story-Überschrift der Klassenziel-Card (reskint pro Arc, der interne
   *  Begriff "Klassenziel" bleibt daneben als stabiler Anker sichtbar). */
  goalTitle: string
  /** Wie die gezählten Beiträge in dieser Welt heißen (Dativ Plural, für
   *  "X von Y …"): Schritte auf dem Berg, Systemchecks im All, Spuren im
   *  Dschungel. 1 eltern-bestätigte HÜ = 1 davon. */
  stepNoun: string
  stages: JourneyStage[]
  /** Kurzer Nudge-Satz in der Guide-Stimme (z. B. Streak-Banner). `remaining`
   *  = Aufgaben bis zum nächsten Meilenstein. Bittet, befiehlt nicht. */
  nudge: (remaining: number) => string
}

const THEMES: JourneyTheme[] = [
  {
    name: 'Bergexpedition',
    icon: 'landscape',
    guide: 'Bergführerin Vala',
    goalTitle: 'Der Aufstieg der Klasse',
    stepNoun: 'Schritten',
    stages: [
      { label: 'Basislager', icon: 'cottage', story: 'Willkommen im Basislager! Die Zelte stehen, der Proviant ist verstaut, die Route auf der Karte eingezeichnet. Von hier oben seht ihr den Gipfel nur als winzigen weißen Punkt — kaum vorstellbar, dass ihr da hinaufkommt. Aber jede erledigte Hausübung ist ein Schritt auf dem Weg dorthin, und ich habe schon ganz andere Klassen den Berg hinaufgeführt. Packt eure Sachen, morgen früh geht’s los.' },
      { label: 'Waldpfad', icon: 'park', story: 'Der Wald lichtet sich langsam, zwischen den Bäumen blitzt schon das Weiß der höheren Hänge hindurch. Ein paar von euch mussten über umgestürzte Stämme klettern, andere haben den Trampelpfad eines Rudels Steinböcke entdeckt — der Berg zeigt sich von seiner wilden Seite. Der Weg wird spürbar steiler, aber eure Schritte sind sicher. Weiter so, das nächste Stück Wald wartet schon hinter der Kuppe.' },
      { label: 'Steiler Aufstieg', icon: 'hiking', story: 'Jetzt wird es anstrengend, kein Weg drumherum. Die Luft wird dünner, jeder Atemzug zählt ein bisschen mehr als der davor, und die Sonne brennt auf den nackten Fels. Aber schaut zurück: das Basislager ist nur noch ein Punkt tief unter euch, und die halbe Strecke liegt bereits hinter der Klasse. Ich habe ein Seil gespannt, für die Stellen, wo es eng wird — ihr müsst da nicht allein durch.' },
      { label: 'Fels & Grat', icon: 'terrain', story: 'Fels und ein schmaler Grat, links und rechts geht es steil hinunter — hier zählt jeder einzelne, sichere Schritt. Der Wind pfeift kalt um die Ecken, aber die Sicht ist grandios: man sieht bis zu den Tälern, aus denen ihr aufgebrochen seid. Ihr seid näher am Gipfel, als es sich gerade anfühlt, glaubt mir. Noch eine letzte Anstrengung, dann liegt der schwerste Teil hinter euch.' },
      { label: 'Gipfel', icon: 'flag', story: 'Geschafft — der Gipfel! Die Fahne der Klasse steht jetzt oben im Wind, und der Blick von hier reicht über Wolken und Täler, so weit das Auge reicht. Das war kein Weg, den einer allein geschafft hätte — jede Hausübung, jeder Tag Dranbleiben hat einen Schritt dazu beigetragen. Setzt euch kurz hin, genießt die Aussicht. Der nächste Berg wartet erst nächsten Monat.' },
    ],
    nudge: n => `Vala winkt von oben: noch ${n} ${n === 1 ? 'Schritt' : 'Schritte'} bis zum nächsten Lager!`,
  },
  {
    name: 'Weltraummission',
    icon: 'rocket_launch',
    guide: 'Bordcomputer ARI',
    goalTitle: 'Die Mission der Klasse',
    stepNoun: 'Systemchecks',
    stages: [
      { label: 'Startrampe', icon: 'rocket', story: 'Triebwerke bereit. Alle Systeme grün, Treibstofftanks voll, die Bodencrew hat den letzten Check abgeschlossen. Ich zähle schon die Sekunden bis zum Start, aber ohne euch geht hier gar nichts — jede erledigte Aufgabe ist ein Häkchen auf meiner Checkliste. Sobald genug davon abgehakt sind, zünde ich die Triebwerke. Bereit machen zum Countdown.' },
      { label: 'Erdumlaufbahn', icon: 'satellite_alt', story: 'Wir haben Orbit erreicht! Durch das Bullauge seht ihr die Erde jetzt als blauen Ball, kleiner als ein Fußball auf Armlänge — dabei ist da unten eure ganze Schule drauf. Von hier oben wirkt vieles winzig, aber eure Fortschritte messe ich in ganz anderen Größenordnungen. Die Bahn ist stabil, die nächste Etappe wartet schon in der Dunkelheit vor uns.' },
      { label: 'Mondvorbeiflug', icon: 'nights_stay', story: 'Der Mond zieht grau und narbenübersät am Fenster vorbei, näher, als ich es je aus einem Lehrbuch kannte. Für ein paar Sekunden reißt der Funkkontakt zur Erde ab — Funkstille, nur das leise Summen der Systeme. Dann meldet sich alles zurück, und die Reise geht weiter, tiefer ins All als je zuvor. Genießt den Ausblick, er wiederholt sich nicht.' },
      { label: 'Asteroidenfeld', icon: 'blur_circular', story: 'Vorsicht, Asteroidenfeld! Überall blitzen Gesteinsbrocken im Scheinwerferlicht auf, manche so groß wie ein Schulgebäude. Meine Sensoren piepsen im Sekundentakt, aber keine Sorge — mit jeder erledigten Aufgabe berechne ich einen sichereren Kurs zwischen den Trümmern hindurch. Bleibt konzentriert, dann bringen wir dieses Schiff heil auf die andere Seite.' },
      { label: 'Zielplanet', icon: 'flag_circle', story: 'Landung geglückt! Staub wirbelt auf, als die Landebeine den fremden Boden berühren — der Zielplanet ist erreicht. Durch die Scheibe seht ihr eine Landschaft, die noch niemand von euch je gesehen hat. Diese Mission wäre ohne jede einzelne Aufgabe, die ihr erledigt habt, nicht möglich gewesen — reines Teamwerk, von der Startrampe bis hierher. Ich speichere die Koordinaten für die nächste Mission.' },
    ],
    nudge: n => `ARI meldet: noch ${n} ${n === 1 ? 'Aufgabe' : 'Aufgaben'} bis zur nächsten Kontrollstation.`,
  },
  {
    name: 'Schatzsuche',
    icon: 'map',
    guide: 'Kartografin Isla',
    goalTitle: 'Die Schatzsuche der Klasse',
    stepNoun: 'Spuren',
    stages: [
      { label: 'Alte Landkarte', icon: 'map', story: 'Die Karte ist vergilbt und an den Rändern brüchig, aber lesbar — ich habe sie auf einem Flohmarkt gefunden, versteckt im Deckel eines alten Atlas. Eine dünne, gestrichelte Spur führt mitten hinein in den Dschungel, markiert mit einem Symbol, das ich noch nie gesehen habe. Folgt ihr mir? Ich warne euch: die Karte verrät nicht alles, was uns dort erwartet.' },
      { label: 'Dschungelpfad', icon: 'forest', story: 'Dichtes Grün schließt sich über euren Köpfen, Lianen hängen wie Vorhänge zwischen den Bäumen, und irgendwo kreischt ein Vogel, den keiner von uns kennt. Der Pfad selbst ist zum Glück klar — jemand ist ihn vor langer Zeit schon einmal gegangen. Jede erledigte Aufgabe schlägt ein Stück Dickicht mehr frei und bringt uns dem nächsten Wegweiser näher. Bleibt auf dem Pfad, dann verirren wir uns nicht.' },
      { label: 'Verborgene Höhle', icon: 'explore', story: 'Eine Höhle, tief und stockdunkel, mit einem Eingang, der fast vollständig von Ranken überwuchert war. Ohne eure Fackeln wäre hier drinnen nichts zu erkennen außer tropfendem Wasser und dem Echo unserer eigenen Schritte. An den Wänden entdecke ich Zeichen, die zu unserer Karte passen — die Spur wird eindeutig wärmer. Vorsichtig weiter, Schritt für Schritt.' },
      { label: 'Letzte Spur', icon: 'travel_explore', story: 'Nur noch eine einzige Spur bis zum Ziel, frisch in den weichen Boden gedrückt — jemand oder etwas war hier, nicht lange vor uns. Die Luft riecht nach altem Stein und, ich schwöre, ein bisschen nach Gold. Mein Kompass dreht sich unruhig, als würde er selbst spüren, wie nah wir dran sind. Noch ein letztes Stück, dann wissen wir es.' },
      { label: 'Schatzkammer', icon: 'celebration', story: 'Die Schatzkammer! Golden schimmert es im Licht unserer Fackeln, Truhen und Münzen, so weit man blicken kann — doch geöffnet hat sie nur die ganze Klasse gemeinsam, kein Einzelner allein hätte das Rätsel an der Tür gelöst. Der wahre Schatz, das sage ich euch als alte Schatzsucherin, war die Ausdauer, die es gebraucht hat, hierher zu finden. Rollt die Karte wieder ein — die nächste Expedition wartet schon irgendwo da draußen.' },
    ],
    nudge: n => `Isla deutet auf die Karte: noch ${n} ${n === 1 ? 'Schritt' : 'Schritte'} bis zur nächsten Spur.`,
  },
]

/** Guide-Portraits je Theme-Icon. Themen ohne Eintrag haben noch keine
 *  Illustration — Aufrufer fallen dann auf einen Platzhalter zurück.
 *  Illustrationen werden nach und nach ergänzt. */
export const GUIDE_PORTRAIT: Partial<Record<string, string>> = {
  landscape: '/images/characters/vala.webp', // Bergführerin Vala, Bergexpedition
}

/** Wählt ein Thema anhand des Season-Keys ('YYYY-MM'), rotierend pro Monat. */
export function getSeasonTheme(season: string): JourneyTheme {
  const monthIndex = Number(season.slice(5, 7)) - 1
  return THEMES[monthIndex % THEMES.length]
}

/** Ein Eintrag im Schuljahres-Fahrplan (siehe SCHOOL_YEAR_ARCS). Welten ohne
 *  volle Etappen-Story (built: false) tragen nur die Teaser-Angaben aus dem
 *  Konzeptdoc — Name, Guide, Kurzbeschreibung, Fokus. */
export interface SchoolYearArc {
  name: string
  icon: string
  guide: string
  tagline: string
  focus: string
  monthLabel: string
  built: boolean
  /** Individuelle Teaser-Zeile für die Jahresübersicht (nicht generisch —
   *  jede Welt bekommt ihre eigene Stimme statt eines Textbausteins). */
  teaser: string
}

/** Der geplante Schuljahres-Fahrplan (Reihenfolge aus dem Konzeptdoc,
 *  September bis August). Nur die ersten drei Welten sind aktuell voll
 *  gebaut (siehe THEMES) — der Rest ist bewusst nur als Teaser hinterlegt,
 *  bis Guide-Texte + Etappen dafür geschrieben werden (Prinzip 4: Story
 *  lädt ein, sie zwingt nicht — kein Vorab-Content-Berg nötig).
 *  Sommer (Juli–August) ist keine reguläre Welt, sondern das gemeinsame
 *  Ziel aller Guides — der Ort, zu dem am Ende jede Reise zurückführt. */
export const SCHOOL_YEAR_ARCS: SchoolYearArc[] = [
  { name: 'Bergexpedition', icon: 'landscape', guide: 'Bergführerin Vala', tagline: 'Schroffe Gipfelwelt, dünne Luft, weiter Blick.', focus: 'Durchhalten & die Flamme', monthLabel: 'September', built: true, teaser: 'Der Aufstieg hat begonnen — Vala führt euch Schritt für Schritt zum Gipfel.' },
  { name: 'Weltraummission', icon: 'rocket_launch', guide: 'Bordcomputer ARI', tagline: 'Raumschiff, Funkstille, ferne Planeten.', focus: 'Präzision & Pünktlichkeit', monthLabel: 'Oktober', built: true, teaser: 'Irgendwo im All blinkt schon ein Signal auf ARIs Bildschirm — bereit zum Start?' },
  { name: 'Schatzsuche', icon: 'map', guide: 'Kartografin Isla', tagline: 'Dschungel, Ruinen, vergilbte Karten.', focus: 'Neugier & Rätsel', monthLabel: 'November', built: true, teaser: 'Isla hat schon eine Karte ausgerollt, verrät aber noch keine Route.' },
  { name: 'Terra Nova', icon: 'eco', guide: 'Ranger-Drohne „Sprout“', tagline: 'Ödland, das die Klasse gemeinsam begrünt.', focus: 'Gemeinsam aufbauen', monthLabel: 'Dezember', built: false, teaser: 'Ein Ödland wartet still darauf, von euch zum Blühen gebracht zu werden.' },
  { name: 'Tiefsee-Expedition', icon: 'water', guide: 'Dr. Coralie & Tintenfisch Nauto', tagline: 'Ein U-Boot sinkt Schicht um Schicht ins Blau.', focus: 'Mut & Erkundung', monthLabel: 'Jänner', built: false, teaser: 'Tief unten im Dunkeln liegt schon ein U-Boot bereit für seine Crew.' },
  { name: 'Chroniken der Zeit', icon: 'history_edu', guide: 'Der Chronist', tagline: 'Zeitreise durch die Epochen.', focus: 'Wissen sammeln', monthLabel: 'Februar', built: false, teaser: 'Der Chronist blättert schon in Epochen, die noch niemand von euch gesehen hat.' },
  { name: 'Inselreich', icon: 'anchor', guide: 'Hafenmeister Finn', tagline: 'Aus einer Sandbank wächst ein Reich.', focus: 'Dienste & Aufbau', monthLabel: 'März', built: false, teaser: 'Aus einer einsamen Sandbank soll bald ein ganzes Reich wachsen.' },
  { name: 'Sternenkarte', icon: 'auto_awesome', guide: 'Astronomin Nox', tagline: 'Ein leerer Nachthimmel füllt sich mit Licht.', focus: 'Aufmerksamkeit', monthLabel: 'April', built: false, teaser: 'Noch ist der Himmel leer — Nox wartet darauf, die ersten Sterne mit euch zu setzen.' },
  { name: 'Werkstatt der Erfinder', icon: 'precision_manufacturing', guide: 'Meisterin Tüftel', tagline: 'Zahnrad um Zahnrad erwacht eine Maschine.', focus: 'Aufgaben kombinieren', monthLabel: 'Mai', built: false, teaser: 'In der Werkstatt liegen die Einzelteile schon bereit — nur drehen tut sich noch nichts.' },
  { name: 'Der Weltenbaum', icon: 'park', guide: 'Wächterin des Weltenbaums', tagline: 'Ein uralter Baum, der alle bereisten Welten miteinander verwebt.', focus: 'Rückblick & Verbindung', monthLabel: 'Juni', built: false, teaser: 'Am Ende des Jahres wachsen alle bisherigen Welten zu einem einzigen Baum zusammen.' },
  { name: 'Sonnenhafen', icon: 'wb_sunny', guide: 'Alle Guides gemeinsam', tagline: 'Der Ort, von dem jede Guide-Figur erzählt — und zu dem am Ende alle zurückkehren.', focus: 'Ankommen & Feiern', monthLabel: 'Juli – August', built: false, teaser: 'Dorthin, erzählt jede Guide-Figur, führt am Ende jede Reise.' },
]

/** Index der aktuell erreichten Etappe (0-basiert) für einen Fortschritt in %. */
export function currentStageIndex(pct: number, stageCount: number): number {
  const idx = Math.floor((pct / 100) * (stageCount - 1))
  return Math.min(stageCount - 1, Math.max(0, idx))
}
