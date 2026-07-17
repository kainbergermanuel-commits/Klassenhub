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
      { label: 'Basislager', icon: 'cottage', story: 'Willkommen im Basislager! Die Zelte stehen, der Proviant ist verstaut, die Route auf der Karte eingezeichnet. Von hier aus seht ihr den Gipfel nur als winzigen weißen Punkt, kaum vorstellbar, dass ihr da hinaufkommt. Aber jede erledigte Hausübung ist ein Schritt auf dem Weg dorthin, und ich habe schon ganz andere Klassen den Berg hinaufgeführt. Packt eure Sachen, morgen früh geht’s los.' },
      { label: 'Waldpfad', icon: 'park', story: 'Der Wald lichtet sich langsam, zwischen den Bäumen blitzt schon das Weiß der höheren Hänge hindurch. Ein paar von euch mussten über umgestürzte Stämme klettern, andere haben den Trampelpfad eines Rudels Steinböcke entdeckt, der Berg zeigt sich von seiner wilden Seite. Der Weg wird spürbar steiler, aber eure Schritte sind sicher. Weiter so, das nächste Stück Wald wartet schon hinter der Kuppe.' },
      { label: 'Steiler Aufstieg', icon: 'hiking', story: 'Jetzt wird es anstrengend, kein Weg drumherum. Die Luft wird dünner, jeder Atemzug zählt ein bisschen mehr als der davor, und die Sonne brennt auf den nackten Fels. Aber schaut zurück: Das Basislager ist nur noch ein Punkt tief unter euch, und die halbe Strecke liegt bereits hinter der Klasse. Ich habe ein Seil gespannt, für die Stellen, wo es eng wird. Da müsst ihr nicht allein durch.' },
      { label: 'Fels & Grat', icon: 'terrain', story: 'Fels und ein schmaler Grat, links und rechts geht es steil hinunter, hier zählt jeder einzelne, sichere Schritt. Der Wind pfeift kalt um die Ecken, aber die Sicht ist grandios: Man sieht bis zu den Tälern, aus denen ihr aufgebrochen seid. Ihr seid näher am Gipfel, als es sich gerade anfühlt, glaubt mir. Noch eine letzte Anstrengung, dann liegt der schwerste Teil hinter euch.' },
      { label: 'Gipfel', icon: 'flag', story: 'Geschafft, der Gipfel! Die Fahne der Klasse steht jetzt oben im Wind, und der Blick von hier reicht über Wolken und Täler, so weit das Auge reicht. Das war kein Weg, den einer allein geschafft hätte. Jede Hausübung, jeder Tag Dranbleiben hat einen Schritt dazu beigetragen. Und ganz weit draußen am Horizont, seht ihr das? Ein warmes Licht, das zu keiner meiner Karten passt. Merkt es euch gut, ich habe so ein Leuchten noch nie gesehen. Und wenn ihr herausfinden wollt, woher es kommt, kenne ich jemanden, der euch weiterführen wird: den Bordcomputer ARI. Nächsten Monat hebt ihr mit ihm ins All ab.' },
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
      { label: 'Startrampe', icon: 'rocket', story: 'Triebwerke bereit. Alle Systeme grün, Treibstofftanks voll, die Bodencrew hat den letzten Check abgeschlossen. Ich zähle schon die Sekunden bis zum Start, aber ohne euch geht hier gar nichts. Jede erledigte Aufgabe ist ein Häkchen auf meiner Checkliste. Sobald genug davon abgehakt sind, zünde ich die Triebwerke. Bereit machen zum Countdown.' },
      { label: 'Erdumlaufbahn', icon: 'satellite_alt', story: 'Wir haben Orbit erreicht! Durch das Bullauge seht ihr die Erde jetzt als blauen Ball, kleiner als ein Fußball auf Armlänge, dabei ist da unten eure ganze Schule drauf. Von hier oben wirkt vieles winzig, aber eure Fortschritte messe ich in ganz anderen Größenordnungen. Die Bahn ist stabil, die nächste Etappe wartet schon in der Dunkelheit vor uns.' },
      { label: 'Mondvorbeiflug', icon: 'nights_stay', story: 'Der Mond zieht grau und narbenübersät am Fenster vorbei, näher, als ich es je aus einem Lehrbuch kannte. Für ein paar Sekunden reißt der Funkkontakt zur Erde ab, Funkstille, nur das leise Summen der Systeme. Doch da ist noch etwas anderes, ein Summen, das aus keinem System an Bord kommt und zu keinem Sternsystem passt, das ich kenne. Ich zeichne es auf. Dann meldet sich alles zurück, und die Reise geht weiter, tiefer ins All als je zuvor.' },
      { label: 'Asteroidenfeld', icon: 'blur_circular', story: 'Vorsicht, Asteroidenfeld! Überall blitzen Gesteinsbrocken im Scheinwerferlicht auf, manche so groß wie ein Schulgebäude. Meine Sensoren piepsen im Sekundentakt, aber keine Sorge, mit jeder erledigten Aufgabe berechne ich einen sichereren Kurs zwischen den Trümmern hindurch. Bleibt konzentriert, dann bringen wir dieses Schiff heil auf die andere Seite.' },
      { label: 'Zielplanet', icon: 'flag_circle', story: 'Landung geglückt! Staub wirbelt auf, als die Landebeine den fremden Boden berühren, der Zielplanet ist erreicht. Durch die Scheibe seht ihr eine Landschaft, die noch niemand von euch je gesehen hat. Diese Mission wäre ohne jede einzelne Aufgabe, die ihr erledigt habt, nicht möglich gewesen, reines Teamwerk, von der Startrampe bis hierher. Das seltsame Summen von vorhin habe ich gespeichert. Irgendwann finden wir heraus, woher es kam. Ich kenne übrigens jemanden, der jeder Spur nachgeht wie keine Zweite: Kartografin Isla. Sie führt euch als Nächstes weiter.' },
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
      { label: 'Alte Landkarte', icon: 'map', story: 'Die Karte ist vergilbt und an den Rändern brüchig, aber lesbar. Ich habe sie auf einem Flohmarkt gefunden, versteckt im Deckel eines alten Atlas. Eine dünne, gestrichelte Spur führt mitten hinein in den Dschungel, markiert mit einem Symbol, das ich noch nie gesehen habe. Folgt ihr mir? Ich warne euch: Die Karte verrät nicht alles, was uns dort erwartet.' },
      { label: 'Dschungelpfad', icon: 'forest', story: 'Dichtes Grün schließt sich über euren Köpfen, Lianen hängen wie Vorhänge zwischen den Bäumen, und irgendwo kreischt ein Vogel, den keiner von uns kennt. Der Pfad selbst ist zum Glück klar, jemand ist ihn vor langer Zeit schon einmal gegangen. Jede erledigte Aufgabe schlägt ein Stück Dickicht mehr frei und bringt uns dem nächsten Wegweiser näher. Bleibt auf dem Pfad, dann verirren wir uns nicht.' },
      { label: 'Verborgene Höhle', icon: 'explore', story: 'Eine Höhle, tief und stockdunkel, mit einem Eingang, der fast vollständig von Ranken überwuchert war. Ohne eure Fackeln wäre hier drinnen nichts zu erkennen außer tropfendem Wasser und dem Echo unserer eigenen Schritte. An den Wänden entdecke ich Zeichen, die zu unserer Karte passen, die Spur wird eindeutig wärmer. Vorsichtig weiter, Schritt für Schritt.' },
      { label: 'Letzte Spur', icon: 'travel_explore', story: 'Nur noch eine einzige Spur bis zum Ziel, frisch in den weichen Boden gedrückt, jemand oder etwas war hier, nicht lange vor uns. Die Luft riecht nach altem Stein und, ich schwöre, ein bisschen nach Gold. Mein Kompass dreht sich unruhig, als würde er selbst spüren, wie nah wir dran sind. Noch ein letztes Stück, dann wissen wir es.' },
      { label: 'Schatzkammer', icon: 'celebration', story: 'Die Schatzkammer! Golden schimmert es im Licht unserer Fackeln, Truhen und Münzen, so weit man blicken kann, doch geöffnet hat sie nur die ganze Klasse gemeinsam, kein Einzelner allein hätte das Rätsel an der Tür gelöst. Und seht nur, dort zwischen den Münzen: ein kleiner, warm leuchtender Splitter, über und über bedeckt mit feinen Zeichen. Ich bin Kartografin, und ich schwöre euch, das ist eine Art Karte. Nur lesen kann ich sie noch nicht. Nehmt ihn vorsichtig mit, ich habe das Gefühl, seine Reise hat gerade erst begonnen. Und ich kenne jemanden, der jedes noch so tote Land zum Blühen bringt und euch weiterführen wird: die kleine Ranger-Drohne Sprout.' },
    ],
    nudge: n => `Isla deutet auf die Karte: noch ${n} ${n === 1 ? 'Schritt' : 'Schritte'} bis zur nächsten Spur.`,
  },
]

/** Story-Entwurf einer noch nicht live geschalteten Welt. Gleiche Bausteine wie
 *  ein JourneyTheme (Etappen mit Story), aber bewusst NICHT in THEMES: Drafts
 *  sollen die aktive Klassenwelt nicht beeinflussen, nur die Admin-Vorschau
 *  „Alle Welten" auf /streaks/reise befüllen. Beim Scharfschalten wandert der
 *  Inhalt hier nach THEMES (+ built:true in SCHOOL_YEAR_ARCS). */
export interface ArcStoryDraft {
  goalTitle: string
  stepNoun: string
  stages: JourneyStage[]
}

/** Fertig geschriebene Stories für alle noch nicht gebauten Welten (Terra Nova
 *  bis Sonnenhafen), inkl. Guide-Übergängen am Ende jeder Welt. Schlüssel =
 *  Theme-Icon (wie GUIDE_PORTRAIT/SCHOOL_YEAR_ARCS). Siehe docs/story-welten.html. */
export const ARC_STORY_DRAFTS: Partial<Record<string, ArcStoryDraft>> = {
  eco: {
    goalTitle: 'Das Erwachen des Ödlands',
    stepNoun: 'Trieben',
    stages: [
      { label: 'Das graue Ödland', icon: 'terrain', story: 'Willkommen im Ödland. Hier wächst seit langer Zeit kein einziger Halm mehr, der Boden ist rissig und grau, so weit ihr sehen könnt. Sprout schwirrt aufgeregt um euch herum und deutet auf den Splitter in eurer Hand, der hier fast erloschen wirkt. „Dieser Ort war einmal voller Leben, das spüre ich. Bringen wir es zurück, dann wacht vielleicht auch euer seltsamer Stein wieder auf." Packt an, jeder erledigte Auftrag ist ein Samen im trockenen Boden.' },
      { label: 'Die ersten Sprossen', icon: 'grass', story: 'Habt ihr das gesehen? Zwischen den Rissen schiebt sich das erste zarte Grün ans Licht, winzig und mutig. Und im selben Moment beginnt eines der Zeichen auf dem Splitter ganz leise zu glimmen, warm wie eine kleine Flamme. Sprout kommt so abrupt zum Stehen, dass es fast einen Purzelbaum macht. „Der Stein antwortet dem Leben! Das erste Zeichen ist erwacht. Aber was bedeutet es nur?"' },
      { label: 'Der Wurzelteppich', icon: 'forest', story: 'Aus den ersten Sprossen ist ein dichter Teppich aus Wurzeln und Blättern geworden, der sich über das ganze Ödland legt. Doch etwas ist merkwürdig: Die Wurzeln wachsen nicht kreuz und quer, sondern alle in dieselbe Richtung, als würden sie etwas suchen, das tief unter der Erde verborgen liegt. Sprout legt lauschend ein Blatt-Ohr auf den Boden. „Da unten ist etwas. Etwas sehr, sehr Altes. Grabt vorsichtig weiter."' },
      { label: 'Der schlafende Setzling', icon: 'park', story: 'Unter dem Wurzelteppich findet ihr ihn: einen uralten Setzling, halb zu Stein geworden, der hier seit unzähligen Jahren wartet. Als das Licht des Splitters ihn berührt, zittern seine winzigen Blätter, als würde er aus einem langen Schlaf erwachen. Ganz langsam neigt sich der Setzling zur Seite und zeigt mit seiner Spitze in die Ferne, dorthin, wo am Horizont ein tiefblaues Meer schimmert. Sprout flüstert: „Er zeigt uns den Weg. Aber wohin nur?"' },
      { label: 'Das blühende Tal', icon: 'local_florist', story: 'Geschafft! Aus dem grauen Ödland ist ein blühendes Tal geworden, voller Farben, Summen und Leben. Das erwachte Zeichen auf dem Splitter leuchtet jetzt klar und deutlich: ein kleines Blatt, gefolgt von einer geschwungenen Welle. „Diese Welt ist nur ein einziger Ast von etwas viel Größerem, das ahne ich jetzt. Und der Splitter zeigt zum Wasser, hinunter in die Tiefe. Ich kenne jemanden, der euch dort weiterführen wird: Dr. Coralie und ihren Tintenfisch Nauto. Folgt dem Wasser, ein Tauchboot wartet schon, und tief unten schläft das nächste Zeichen."' },
    ],
  },
  water: {
    goalTitle: 'Die Tauchfahrt der Klasse',
    stepNoun: 'Leuchtspuren',
    stages: [
      { label: 'Das wartende Tauchboot', icon: 'scuba_diving', story: 'An der Wasseroberfläche schaukelt euer Tauchboot, bereit zum Abtauchen. Dr. Coralie prüft ruhig jeden Hebel, während Nauto neugierig gegen die Scheibe tupft und in fröhlichem Blaugrün leuchtet. „Willkommen an Bord", sagt Coralie. „Da unten ist es dunkel und still, aber wunderschön. Und euer Splitter, seht nur, er glüht schon, als wüsste er, dass wir uns dem nächsten Zeichen nähern." Luken dicht, es geht hinab.' },
      { label: 'Die Dämmerzone', icon: 'water_drop', story: 'Immer tiefer sinkt das Boot, und das Licht der Sonne wird über euch zu einem blassen, fernen Schimmer. Um euch herum blinken plötzlich hunderte winzige Lichter auf, Quallen und Fische, die selbst leuchten wie Sterne unter Wasser. Nauto wird ganz aufgeregt und blinkt in genau demselben Muster wie ein Zeichen, das jetzt auf dem Splitter aufwacht. Coralie beugt sich vor. „Diese Lichter formen ein Muster. Und euer Stein antwortet ihnen."' },
      { label: 'Der leuchtende Graben', icon: 'waves', story: 'Vor euch öffnet sich ein tiefer Graben, an dessen Wänden uraltes Gestein in sanftem Licht glimmt. Nauto tastet mit einem Arm über eine alte, versunkene Säule und leuchtet plötzlich alarmiert auf: In den Stein sind dieselben Zeichen gemeißelt wie auf eurem Splitter. Doch die Botschaft ist nur zur Hälfte da. „Der Rest", sagt Coralie leise, „liegt noch tiefer. Traut ihr euch?"' },
      { label: 'Die stille Tiefe', icon: 'blur_on', story: 'Ganz unten ist es vollkommen still und dunkel, nur eure einzige Lampe wirft einen Kreis aus Licht. Hier findet ihr die zweite Hälfte der gemeißelten Zeichen, und als sie sich in Gedanken mit der ersten verbinden, ergeben sie ein Wort, das noch niemand aussprechen kann. Da beginnt der Splitter zu summen, einen einzigen klaren Ton, den er noch nie zuvor von sich gegeben hat. Der Ton hallt durch den Graben, und eine uralte Strömung erwacht und beginnt, euch sanft nach oben zu tragen.' },
      { label: 'Der Aufstieg', icon: 'arrow_upward', story: 'Die Strömung hebt euch zurück ans Licht, und auf dem Splitter leuchtet nun ein zweites Zeichen: eine Welle, dazu der leise Ton, den ihr in der Tiefe gehört habt. „Diese Zeichen sind älter als jede Seekarte, älter als alles, woran sich das Meer erinnert", sagt Coralie nachdenklich. „Wer sie geschrieben hat, lebte vor unvorstellbar langer Zeit. Aber ich kenne jemanden, der die Zeit selbst lesen kann und euch weiterführen wird: den Chronist in seiner großen Bibliothek." Nauto wickelt den Splitter behutsam ein und bringt euch nach oben.' },
    ],
  },
  history_edu: {
    goalTitle: 'Die Chronik der Klasse',
    stepNoun: 'Seiten',
    stages: [
      { label: 'Die leere Chronik', icon: 'menu_book', story: 'Willkommen in der größten Bibliothek, die ihr je gesehen habt, Regale bis zur Decke und darüber hinaus. In der Mitte liegt ein riesiges, leeres Buch, die Chronik dieses Jahres, die ihr gemeinsam füllen werdet. Der Chronist betrachtet euren Splitter durch seine runde Brille und hebt erstaunt die Augenbrauen. „Diese Schrift ist älter als jede Seite, die ich besitze. Um zu verstehen, wer sie schrieb, müssen wir zurückblättern, nicht in einem Buch, sondern in der Zeit selbst." Jede erledigte Aufgabe schreibt eine neue Seite.' },
      { label: 'Das erste Zeitalter', icon: 'history_edu', story: 'Mit jeder Seite, die ihr schreibt, blättert die Zeit weiter zurück, und plötzlich steht ihr in einem längst vergangenen Zeitalter. Eine Welt, so jung, dass es kaum etwas darauf gibt, nur weite, leere Ebenen und einen Himmel voller unbekannter Sterne. Am Horizont zieht eine Gruppe von Wanderern mit Laternen vorbei. Und einer von ihnen trägt einen Splitter, der genauso leuchtet wie eurer.' },
      { label: 'Der Riss in der Zeit', icon: 'hourglass_empty', story: 'Auf einmal gerät die Zeit ins Wanken, Seiten wirbeln durch die Luft wie Blätter im Sturm, und die Zeitalter drohen durcheinanderzugeraten. „Haltet die Chronik zusammen!", ruft der Chronist gegen den Wind. Ihr müsst zusammenhalten und die Seiten in der richtigen Ordnung festhalten, sonst verliert ihr den roten Faden für immer. Da glüht der Splitter warm auf und beruhigt den Sturm, als würde er selbst zur Zeit gehören.' },
      { label: 'Die Begegnung', icon: 'auto_stories', story: 'Als der Sturm sich legt, seht ihr sie ganz nah: die ersten Wanderer, wie sie behutsam die Samen ganzer Welten in den Boden legen, einen Berg hier, ein Meer dort, einen Himmel darüber. Sie sprechen leise von einer Heimat, zu der am Ende jeder Weg zurückführt, einem Ort aus warmem Licht. Doch bevor der Chronist den Namen dieses Ortes hören kann, verblasst die Vision und reißt euch zurück.' },
      { label: 'Zurück ins Jetzt', icon: 'schedule', story: 'Ihr steht wieder in der Bibliothek, atemlos, und auf dem Splitter leuchtet nun ein drittes Zeichen: eine kleine Sanduhr. „Jetzt weiß ich, wer die Zeichen schrieb", sagt der Chronist und schließt die volle Chronik ehrfürchtig. „Es waren die ersten Wanderer, die alle Welten gepflanzt und diesen Splitter als Botschaft zurückgelassen haben. Doch wo ihre Heimat liegt, verrät die Zeit mir nicht. Aber ich kenne jemanden, der Orte baut und verbindet wie kein Zweiter und euch weiterführen wird: Hafenmeister Finn, weit im Süden auf einer einsamen Sandbank."' },
    ],
  },
  anchor: {
    goalTitle: 'Das Inselreich der Klasse',
    stepNoun: 'Steinen',
    stages: [
      { label: 'Die einsame Sandbank', icon: 'anchor', story: 'Mitten im weiten Meer liegt sie, eine kleine, kahle Sandbank, auf der nichts steht als ein einziger schiefer Pfahl. Finn springt an Land, das Tau über der Schulter, und breitet lachend die Arme aus. „Ich weiß, es sieht nach nicht viel aus. Aber glaubt mir, aus so einer Sandbank kann ein ganzes Reich werden, wenn viele Hände zusammenhelfen." Der Splitter summt kräftiger, sobald die Flut kommt und geht. Jeder Auftrag ist ein Stein für den Aufbau.' },
      { label: 'Der erste Steg', icon: 'construction', story: 'Stein um Stein legt ihr den ersten Steg ins Wasser, dann eine Mauer, dann das erste kleine Haus mit einer Laterne davor. Aus der kahlen Sandbank wird langsam ein winziger Hafen. Und als der Steg fertig ist, erwacht ein weiteres Zeichen auf dem Splitter, klar und fest wie ein Anker. Finn nickt anerkennend. „Seht ihr? Der Stein mag, was wir hier tun."' },
      { label: 'Der große Sturm', icon: 'thunderstorm', story: 'In der Nacht zieht ein gewaltiger Sturm auf, der Wind heult und die Wellen schlagen hoch gegen euren jungen Hafen. „Haltet die Taue!", ruft Finn durch das Tosen, und gemeinsam stemmt ihr euch gegen den Sturm, damit er nicht alles fortreißt. Da leuchtet der Splitter so hell wie nie, und im Licht seht ihr, wie die Wellen etwas freispülen, das tief unter der Sandbank verborgen lag.' },
      { label: 'Das versunkene Tor', icon: 'castle', story: 'Als der Sturm sich legt, liegt es im ersten Morgenlicht vor euch: ein uraltes steinernes Tor, halb im Sand versunken, über und über bedeckt mit denselben Zeichen wie euer Splitter. Vorsichtig hebt ihr den Stein, und er gleitet in eine Vertiefung im Tor, als hätte er immer dorthin gehört. Ein tiefes Summen geht durch den Stein, das Tor beginnt zu leuchten, und für einen Moment zeigt sich dahinter ein Himmel voller Sterne. Doch dann erlischt das Licht wieder, und der Weg bleibt verschlossen.' },
      { label: 'Das leuchtende Reich', icon: 'holiday_village', story: 'Aus der einsamen Sandbank ist ein leuchtendes kleines Inselreich geworden, mit Häusern, Stegen und Laternen, die sich im Wasser spiegeln. Auf dem Splitter glüht nun ein viertes Zeichen: ein Anker. „Jetzt verstehe ich, was ihr da tragt", sagt Finn und legt euch eine schwere Hand auf die Schulter. „Es ist eine Art Schlüssel, der Orte miteinander verbindet, ein Anker zwischen den Welten. Das Tor zeigt zum Nachthimmel, und ich kenne jemanden, der die Sterne liest wie andere ein Buch und euch die Richtung weisen wird: Astronomin Nox in ihrer Sternwarte hoch über dem Meer."' },
    ],
  },
  auto_awesome: {
    goalTitle: 'Die Sternenkarte der Klasse',
    stepNoun: 'Sternen',
    stages: [
      { label: 'Der leere Nachthimmel', icon: 'nights_stay', story: 'Von der Sternwarte aus blickt ihr in einen Nachthimmel, der vollkommen leer ist, kein einziger Stern, nur tiefes, samtenes Schwarz. Nox lächelt und stützt sich auf ihr langes Fernrohr. „Ein leerer Himmel macht vielen Angst. Mir nicht. Denn heute Nacht füllen wir ihn gemeinsam mit Licht." Die Zeichen auf eurem Splitter scheinen den leeren Himmel widerzuspiegeln, als warteten auch sie darauf, vollständig zu werden.' },
      { label: 'Die ersten Sterne', icon: 'star', story: 'Mit jeder erledigten Aufgabe flammt oben ein neuer Stern auf, erst einer, dann drei, dann ein ganzes Feld aus funkelndem Licht. Auf dem Splitter erwacht ein fünftes Zeichen, ein heller Stern, der genauso leuchtet wie die am Himmel. Und die neuen Sterne, bemerkt ihr, ordnen sich nicht zufällig an. Sie beginnen, ein Muster zu bilden.' },
      { label: 'Das Sternbild', icon: 'auto_awesome', story: 'Immer mehr Sterne setzen sich zusammen, bis am Himmel ein großes Sternbild steht, das genau zu den Zeichen auf eurem Splitter passt. Nox hält den Atem an. „So ein Sternbild habe ich noch nie gesehen. Es sieht aus wie ein Baum aus Licht." Doch ein Stern fehlt noch, mitten in der Krone, und ohne ihn bleibt das Bild unvollständig.' },
      { label: 'Die verborgene Bahn', icon: 'travel_explore', story: 'Den fehlenden Stern findet ihr schließlich, versteckt hinter einer Wolkenbank, und als er endlich aufleuchtet, geschieht etwas Wunderbares: Aus dem Sternbild spannt sich eine leuchtende Bahn quer über den ganzen Himmel, ein Weg aus Sternen, der zu einem einzigen warmen Punkt am Horizont führt. „Dorthin", flüstert Nox. „Der Weg führt genau dorthin." Doch die Zeichen auf dem Splitter sind noch immer verstreut und ergeben noch kein Ganzes.' },
      { label: 'Die Karte am Himmel', icon: 'map', story: 'Der volle Sternenweg leuchtet nun von einem Ende des Himmels zum anderen. „Jetzt wissen wir, wohin der Splitter zeigt", sagt Nox leise. „Zu einem warmen Hafen aus Licht, dort am Horizont. Aber die vielen einzelnen Zeichen müssen erst zu einem einzigen zusammengefügt werden, sonst öffnet sich der Weg nicht. Dafür kenne ich die geschicktesten Hände weit und breit, die euch weiterführen werden: Meisterin Tüftel in ihrer Werkstatt."' },
    ],
  },
  precision_manufacturing: {
    goalTitle: 'Die große Maschine der Klasse',
    stepNoun: 'Zahnrädern',
    stages: [
      { label: 'Die stille Werkstatt', icon: 'build', story: 'In Tüftels Werkstatt hängt und liegt und stapelt sich alles, was man sich vorstellen kann: Zahnräder, Federn, Röhren, blinkende Knöpfe. Nur bewegt sich nichts, alles steht still. Tüftel schiebt sich die Schutzbrille auf die Stirn und grinst. „Ihr bringt mir also diesen geheimnisvollen Stein. Wunderbar! Dann bauen wir eben eine Maschine, die endlich liest, was er uns die ganze Zeit verschweigt." Jede Aufgabe ist ein Bauteil.' },
      { label: 'Das erste Zahnrad', icon: 'settings', story: 'Ihr setzt das erste große Zahnrad ein, dann ein zweites, ein drittes, und mit einem Ruck beginnen sie sich zu drehen. Die ganze Werkstatt erwacht ratternd zum Leben, Riemen laufen, Lichter blinken. Auf dem Splitter erwacht das sechste Zeichen, ein feines Zahnrad. „Sie läuft!", jubelt Tüftel und tanzt fast. „Jetzt müssen wir sie nur noch mit eurem Stein verbinden."' },
      { label: 'Die Verbindung', icon: 'link', story: 'Vorsichtig setzt ihr den Splitter in die Mitte der Maschine, und sofort beginnt sie, die verstreuten Zeichen zu ordnen und aneinanderzureihen. Doch dann stockt alles, ein Teil passt einfach nicht, die Maschine stottert und spuckt Funken. Tüftel kaut nachdenklich am Bleistift. „Irgendein Zahnrad fehlt uns noch. Ohne das letzte Teil bleibt die Botschaft ein Rätsel."' },
      { label: 'Der letzte Funke', icon: 'bolt', story: 'Nach langem Suchen und Tüfteln findet ihr das fehlende Zahnrad, und mit einem letzten Funken klickt es an seinen Platz. Die Maschine surrt auf, dreht sich schneller und schneller, und die einzelnen Zeichen des Splitters gleiten zusammen zu einer einzigen Form. Ihr traut euren Augen kaum: Es ist das Wappen eines großen Baumes. Und der Splitter wird plötzlich warm, ganz warm, und pocht leise wie ein kleines Herz. Das ist gar kein Stein. Das ist ein Samen.' },
      { label: 'Das fertige Werk', icon: 'precision_manufacturing', story: 'Die Maschine hat es geschafft: Das ganze Wappen leuchtet nun vollständig, und die Botschaft ist fast entschlüsselt. „Ich habe in meinem Leben viel gebaut", sagt Tüftel und wischt sich die Hände ab, „aber so etwas noch nie. Euer Splitter ist ein Samen, und dieses Wappen gehört zu einem Weltenbaum." Sie legt euch den warmen, pochenden Samen in die Hände. „Ein Samen gehört gepflanzt. Und ich kenne genau die Eine, die den Baum hütet und euch ans Ziel führen wird: die Wächterin des Weltenbaums, auf einem uralten Hügel."' },
    ],
  },
  park: {
    goalTitle: 'Der Weltenbaum der Klasse',
    stepNoun: 'Blättern',
    stages: [
      { label: 'Der uralte Hügel', icon: 'forest', story: 'Auf einem sanften Hügel stehen nur noch die mächtigen Wurzeln eines Baumes, der vor langer Zeit hier gewachsen sein muss. Die Wächterin, in ein Gewand aus Blättern gehüllt, kommt euch entgegen und lächelt, als sie den Samen in euren Händen sieht. „Ihr habt ihn die ganze Reise über getragen und wusstet es nicht. Das ist kein Splitter und war nie einer. Das ist ein Same. Das Herz des Weltenbaums." Jede letzte Aufgabe dieses Jahres lässt ein Blatt wachsen.' },
      { label: 'Das Pflanzen', icon: 'compost', story: 'Gemeinsam legt ihr den Samen behutsam in die alten Wurzeln, und langsam versinkt er in der Erde. Ein sanftes grünes Leuchten breitet sich aus, tief unter dem Boden, und der Hügel scheint zu atmen. Auf dem Wappen, das ihr in Tüftels Werkstatt gesehen habt, fehlt jetzt nur noch ein einziges Zeichen. Etwas Großes ist im Begriff zu erwachen.' },
      { label: 'Die erwachenden Äste', icon: 'account_tree', story: 'Aus der Erde steigt ein Stamm empor, dann recken sich Äste in den Himmel, einer nach dem anderen. Und auf jedem einzelnen Ast erscheint eine der Welten, durch die ihr gereist seid: ein Berg, ein ferner Planet, ein Dschungel, ein blühendes Tal, ein tiefes Meer, eine Bibliothek, ein Inselreich, ein Sternenhimmel, eine Werkstatt. Nur der höchste Ast von allen ist noch kahl und leer. „Es fehlt noch etwas", sagt die Wächterin leise. „Das Letzte und das Schönste."' },
      { label: 'Die letzte Krone', icon: 'park', story: 'Mit der allerletzten Aufgabe schlägt auch der höchste Ast aus, und im selben Moment leuchtet das Wappen vollständig auf, alle Zeichen vereint zu einem einzigen. Der Same singt jetzt seine ganze Melodie, all die Töne der Reise auf einmal. Und endlich könnt ihr die Botschaft lesen, die er das ganze Jahr getragen hat: „Kehrt heim zum Sonnenhafen, von dem jede Reise ausging und zu dem jede zurückführt." Ganz oben in der Krone öffnet sich ein warmes, goldenes Licht wie eine Tür.' },
      { label: 'Der offene Weg', icon: 'door_open', story: 'Der Weltenbaum steht nun vollständig da, gewaltig und leuchtend, seine Äste tragen alle Welten und seine Krone ist eine Tür aus warmem Licht. Alle Zeichen, alle Welten, alle Guides sind in diesem einen Baum miteinander verbunden. „Ihr habt den Weg nach Hause geöffnet", sagt die Wächterin bewegt. „Hinter der goldenen Krone liegt der Sonnenhafen, der Ort, von dem einst jede Reise ausging. Und diesmal führt euch nicht einer weiter, sondern wir alle gemeinsam warten schon dort auf euch, am anderen Ende des Lichts."' },
    ],
  },
  wb_sunny: {
    goalTitle: 'Der Sonnenhafen der Klasse',
    stepNoun: 'Sonnenstrahlen',
    stages: [
      { label: 'Ankunft im Sonnenhafen', icon: 'wb_sunny', story: 'Und dann tretet ihr durch die goldene Krone des Weltenbaums hindurch, und vor euch liegt er endlich: der Sonnenhafen. Warmes Licht auf alten Steinmauern, blaue Segel, ein Leuchtturm mit einer goldenen Sonne, Wimpel im Wind und das ruhige Glucksen des Wassers. Am Kai warten sie alle auf euch, jede einzelne Figur eurer langen Reise: Vala und ARI, Isla und Sprout, Coralie und Nauto, der Chronist, Finn, Nox, Tüftel und die Wächterin. Der Same ist zum Weltenbaum geworden, und sein Herz leuchtet nun warm über dem ganzen Hafen. „Das hier", sagen die Guides gemeinsam, „ist der Ort, von dem wir alle erzählt haben. Ihr seid zu Hause angekommen. Ruht euch aus, genießt die Sonne. Und wenn ein neues Jahr beginnt, wartet schon die nächste Reise irgendwo da draußen." Willkommen im Sonnenhafen.' },
    ],
  },
}

/** Guide-Portraits je Theme-Icon. Themen ohne Eintrag haben noch keine
 *  Illustration — Aufrufer fallen dann auf einen Platzhalter zurück.
 *  Illustrationen werden nach und nach ergänzt. */
export const GUIDE_PORTRAIT: Partial<Record<string, string>> = {
  landscape: '/images/characters/vala.webp', // Bergführerin Vala, Bergexpedition
  rocket_launch: '/images/characters/ari.webp', // Bordcomputer ARI, Weltraummission
  map: '/images/characters/isla.webp', // Kartografin Isla, Schatzsuche
  eco: '/images/characters/sprout.webp', // Ranger-Drohne „Sprout“, Terra Nova
  water: '/images/characters/nauto.webp', // Tintenfisch Nauto, Tiefsee-Expedition
  history_edu: '/images/characters/chronicler.webp', // Der Chronist, Chroniken der Zeit
  anchor: '/images/characters/finn.webp', // Hafenmeister Finn, Inselreich
  auto_awesome: '/images/characters/nox.webp', // Astronomin Nox, Sternenkarte
  precision_manufacturing: '/images/characters/tueftel.webp', // Meisterin Tüftel, Werkstatt der Erfinder
  park: '/images/characters/weltenbaum-waechterin.webp', // Wächterin des Weltenbaums, Der Weltenbaum
}

/** Orts-Illustrationen je Theme-Icon — anders als GUIDE_PORTRAIT keine
 *  Charakter-Portraits, sondern der Ort selbst (z.B. Sonnenhafen, an den
 *  am Ende jede Reise zurückführt). Getrennte Map, weil Orte in der UI
 *  anders dargestellt werden (größeres Bild statt rundem Avatar). */
export const LOCATION_ART: Partial<Record<string, string>> = {
  wb_sunny: '/images/locations/sonnenhafen.webp', // Sonnenhafen, gemeinsames Sommerziel
}

/** Position im Schuljahres-Fahrplan (0=September … 10=Juli/August) für einen
 *  0-basierten Kalendermonat (0=Januar … 11=Dezember). Muss zu SCHOOL_YEAR_ARCS
 *  passen (weiter unten in dieser Datei) — eine Sequenz, keine zwei. */
function schoolYearArcIndex(monthIndex: number): number {
  return Math.min((monthIndex - 8 + 12) % 12, 10) // Juli(10)+August(11) teilen sich Sonnenhafen
}

/** Wählt ein Thema anhand des Season-Keys ('YYYY-MM') — folgt dem echten
 *  Schuljahres-Fahrplan (September → Juli/August), nicht mehr einer reinen
 *  Monats-Rotation. Nur die ersten drei Welten haben volle Etappen-Story
 *  (siehe THEMES); liegt der Fahrplan-Monat auf einer noch nicht gebauten
 *  Welt, bleibt die zuletzt gebaute aktiv (Prinzip 4: kein Monat ganz ohne
 *  Story) — bis mehr Welten Content bekommen, rückt das automatisch nach. */
export function getSeasonTheme(season: string): JourneyTheme {
  const monthIndex = Number(season.slice(5, 7)) - 1
  const arcIndex = schoolYearArcIndex(monthIndex)
  for (let i = arcIndex; i >= 0; i--) {
    const theme = THEMES.find(t => t.icon === SCHOOL_YEAR_ARCS[i].icon)
    if (theme) return theme
  }
  return THEMES[0]
}

/** Volles Thema (inkl. Etappen-Story) für einen Theme-Icon-Key, falls die
 *  Welt bereits gebaut ist — sonst `undefined`. Für Admin-Vorschauen (z.B.
 *  „Alle Welten" auf /streaks/reise), die unabhängig von der aktuell
 *  laufenden Season auf einzelne Welten zugreifen wollen. */
export function findBuiltTheme(icon: string): JourneyTheme | undefined {
  return THEMES.find(t => t.icon === icon)
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
  { name: 'Bergexpedition', icon: 'landscape', guide: 'Bergführerin Vala', tagline: 'Schroffe Gipfelwelt, dünne Luft, weiter Blick.', focus: 'Durchhalten & die Flamme', monthLabel: 'September', built: true, teaser: 'Der Aufstieg hat begonnen. Vala führt euch Schritt für Schritt zum Gipfel.' },
  { name: 'Weltraummission', icon: 'rocket_launch', guide: 'Bordcomputer ARI', tagline: 'Raumschiff, Funkstille, ferne Planeten.', focus: 'Präzision & Pünktlichkeit', monthLabel: 'Oktober', built: true, teaser: 'Irgendwo im All blinkt schon ein Signal auf ARIs Bildschirm. Bereit zum Start?' },
  { name: 'Schatzsuche', icon: 'map', guide: 'Kartografin Isla', tagline: 'Dschungel, Ruinen, vergilbte Karten.', focus: 'Neugier & Rätsel', monthLabel: 'November', built: true, teaser: 'Isla hat schon eine Karte ausgerollt, verrät aber noch keine Route.' },
  { name: 'Terra Nova', icon: 'eco', guide: 'Ranger-Drohne „Sprout“', tagline: 'Ödland, das die Klasse gemeinsam begrünt.', focus: 'Gemeinsam aufbauen', monthLabel: 'Dezember', built: false, teaser: 'Ein graues Ödland wartet auf sein erstes Grün. Und Sprout spürt, dass der Splitter, den ihr aus der Schatzkammer tragt, hier zum ersten Mal erwachen will.' },
  { name: 'Tiefsee-Expedition', icon: 'water', guide: 'Dr. Coralie & Tintenfisch Nauto', tagline: 'Ein U-Boot sinkt Schicht um Schicht ins Blau.', focus: 'Mut & Erkundung', monthLabel: 'Jänner', built: false, teaser: 'Tief im dunklen Blau wartet ein Tauchboot. Nauto sagt, die Zeichen auf eurem Splitter seien älter als jedes Meer.' },
  { name: 'Chroniken der Zeit', icon: 'history_edu', guide: 'Der Chronist', tagline: 'Zeitreise durch die Epochen.', focus: 'Wissen sammeln', monthLabel: 'Februar', built: false, teaser: 'Der Chronist blättert die Zeit selbst zurück, um endlich herauszufinden, wer die Zeichen einst schrieb, die ihr bei euch tragt.' },
  { name: 'Inselreich', icon: 'anchor', guide: 'Hafenmeister Finn', tagline: 'Aus einer Sandbank wächst ein Reich.', focus: 'Dienste & Aufbau', monthLabel: 'März', built: false, teaser: 'Aus einer Sandbank soll ein ganzes Reich wachsen. Und tief im Sand wartet ein Tor, in das euer Splitter passt wie ein Schlüssel.' },
  { name: 'Sternenkarte', icon: 'auto_awesome', guide: 'Astronomin Nox', tagline: 'Ein leerer Nachthimmel füllt sich mit Licht.', focus: 'Aufmerksamkeit', monthLabel: 'April', built: false, teaser: 'Nox will mit euch den leeren Himmel füllen, bis die Sterne genau jenes Zeichen bilden, das auf eurem Splitter schimmert.' },
  { name: 'Werkstatt der Erfinder', icon: 'precision_manufacturing', guide: 'Meisterin Tüftel', tagline: 'Zahnrad um Zahnrad erwacht eine Maschine.', focus: 'Aufgaben kombinieren', monthLabel: 'Mai', built: false, teaser: 'In Tüftels Werkstatt steht schon eine Maschine bereit, die endlich lesen soll, was euer Splitter die ganze Reise verschwiegen hat.' },
  { name: 'Der Weltenbaum', icon: 'park', guide: 'Wächterin des Weltenbaums', tagline: 'Ein uralter Baum, der alle bereisten Welten miteinander verwebt.', focus: 'Rückblick & Verbindung', monthLabel: 'Juni', built: false, teaser: 'Am Ende des Jahres zeigt euch die Wächterin, was ihr wirklich tragt. Keinen Splitter, sondern einen Samen.' },
  { name: 'Sonnenhafen', icon: 'wb_sunny', guide: 'Alle Guides gemeinsam', tagline: 'Der Ort, von dem jede Guide-Figur erzählt, und zu dem am Ende alle zurückkehren.', focus: 'Ankommen & Feiern', monthLabel: 'Juli – August', built: false, teaser: 'Dorthin, sagt jede Guide-Figur, führt am Ende jede Reise. Und der Weltenbaum weist euch endlich den Weg.' },
]

/** Index eines Arcs im Schuljahres-Fahrplan (0-basiert), oder -1 falls
 *  unbekannt. Gemeinsame Basis für "freigeschaltet?"-Prüfungen (Jahres-
 *  übersicht, Guide-Picker) — eine Quelle der Wahrheit statt zweier. */
export function schoolYearIndex(icon: string): number {
  return SCHOOL_YEAR_ARCS.findIndex(arc => arc.icon === icon)
}

/** Ist die Welt/der Guide zu `icon` bereits erreicht (aktuelle oder
 *  vergangene Etappe im Schuljahres-Fahrplan)? `currentThemeName` kommt aus
 *  `getSeasonTheme(currentSeason).name` — derselbe Bezugspunkt wie überall
 *  sonst im Reise-System. */
export function isArcUnlocked(icon: string, currentThemeName: string): boolean {
  const currentIndex = SCHOOL_YEAR_ARCS.findIndex(arc => arc.name === currentThemeName)
  const targetIndex = schoolYearIndex(icon)
  if (currentIndex < 0 || targetIndex < 0) return false
  return targetIndex <= currentIndex
}

/** Index der aktuell erreichten Etappe (0-basiert) für einen Fortschritt in %. */
export function currentStageIndex(pct: number, stageCount: number): number {
  const idx = Math.floor((pct / 100) * (stageCount - 1))
  return Math.min(stageCount - 1, Math.max(0, idx))
}

// ─── DER SPLITTER (roter Faden, siehe docs/2026-07-story-welten.html) ───────
// Der Splitter wird in Islas Schatzkammer (Schatzsuche/November) gefunden und
// trägt sieben Zeichen, die je eines pro Welt von Terra Nova (Dezember) bis
// zum Weltenbaum (Juni) erwachen. Bewusst KEIN neuer Datenbank-Zustand: ob ein
// Zeichen erwacht ist, wird rein aus SCHOOL_YEAR_ARCS + der aktuell laufenden
// Welt abgeleitet (dieselbe Quelle der Wahrheit wie isArcUnlocked) — für noch
// nicht gebaute Welten (Prinzip 4: kein Vorab-Content-Berg) bleibt das
// zugehörige Zeichen einfach ungeöffnet, bis die Welt live geht, und wacht
// automatisch auf, sobald sie es tut.

export interface SplitterSign {
  /** Eigenes Icon für das Zeichen selbst (nicht das Welt-Icon) — z.B. eine
   *  einzelne Sanduhr statt des Bücher-Icons der Chroniken-Welt. */
  icon: string
  label: string
  worldName: string
  /** Theme-Icon der Welt, in der dieses Zeichen erwacht (Schlüssel in
   *  SCHOOL_YEAR_ARCS) — bestimmt, wann es "erwacht" ist. */
  worldIcon: string
}

export const SPLITTER_SIGNS: SplitterSign[] = [
  { icon: 'eco', label: 'Das Blatt', worldName: 'Terra Nova', worldIcon: 'eco' },
  { icon: 'water', label: 'Die Welle', worldName: 'Tiefsee-Expedition', worldIcon: 'water' },
  { icon: 'hourglass_empty', label: 'Die Sanduhr', worldName: 'Chroniken der Zeit', worldIcon: 'history_edu' },
  { icon: 'anchor', label: 'Der Anker', worldName: 'Inselreich', worldIcon: 'anchor' },
  { icon: 'star', label: 'Der Stern', worldName: 'Sternenkarte', worldIcon: 'auto_awesome' },
  { icon: 'settings', label: 'Das Zahnrad', worldName: 'Werkstatt der Erfinder', worldIcon: 'precision_manufacturing' },
  { icon: 'park', label: 'Der Baum', worldName: 'Der Weltenbaum', worldIcon: 'park' },
]

/** Ob der Splitter selbst schon gefunden ist (ab Schatzsuche/November, siehe
 *  Story-Bibel: Isla findet ihn in ihrer Schatzkammer). */
export function splitterFound(currentThemeName: string): boolean {
  return isArcUnlocked('map', currentThemeName)
}

/** Wie viele der 7 Zeichen bereits erwacht sind: ein Zeichen erwacht, sobald
 *  seine Welt im Fahrplan bereits vollständig hinter der Klasse liegt (die
 *  aktuell laufende Welt selbst zählt noch nicht — ihr Zeichen erwacht erst,
 *  wenn die NÄCHSTE Welt beginnt). Monoton wachsend, nie rückläufig. */
export function awakenedSignCount(currentThemeName: string): number {
  const currentIndex = SCHOOL_YEAR_ARCS.findIndex(arc => arc.name === currentThemeName)
  if (currentIndex < 0) return 0
  return SPLITTER_SIGNS.filter(s => schoolYearIndex(s.worldIcon) < currentIndex).length
}
