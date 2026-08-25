/** Season-Journey: rein visuelles Narrativ über dem Klassenziel-Fortschritt.
 *  Nutzt Material-Symbols-Icons (msym) statt eigener Assets. Das Thema
 *  rotiert monatlich, damit es über die Zeit abwechslungsreich bleibt. */

export interface JourneyStage {
  label: string
  icon: string
  /** Kurzer Erzähltext (1–2 Sätze), der aufklappt, sobald die Klasse diese
   *  Etappe gemeinsam erreicht hat. Stimme des jeweiligen Guides. Bleibt die
   *  Fassung für die kompakten Karten (StoryHeroCard, AdventureHero). */
  story: string
  /** Voller Kapiteltext (~220 Wörter) für die Lese-Ansicht auf /streaks/reise:
   *  dieselbe Szene ausgespielt statt zusammengefasst. Fehlt das Feld, fällt
   *  die Lese-Ansicht auf `story` zurück. */
  chapter?: string
  /** Ein-Satz-Ausblick, der auf der NÄCHSTEN, noch gesperrten Etappe als
   *  Vorschau erscheint (statt „der Guide verrät noch nichts"). Macht
   *  neugierig, ohne zu verraten, was die Klasse noch nicht erreicht hat. */
  cliffhanger?: string
  /** Nur an der letzten Etappe einer Welt: Übergabe an die nächste Guide-
   *  Figur. Macht den Weltenwechsel als Moment spürbar. */
  handover?: string
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
  /** 0-basierter Etappen-Index, an dem das Splitter-Zeichen dieser Welt
   *  erwacht (siehe SPLITTER_SIGNS + docs/story-welten.html, Abschnitt 00).
   *  Muss zu der Etappe passen, deren Text das Erwachen erzählt. Fehlt das
   *  Feld, erwacht das Zeichen erst an der letzten Etappe. */
  signStage?: number
  /** Epilog-Welt ohne Aufgaben (Sonnenhafen, Juli/August): eine einzige
   *  Etappe, kein Klassenziel, keine Fortschrittsleiste. Die Story-Bibel sieht
   *  hier bewusst einen Ort zum Ankommen vor statt eines weiteren Monats mit
   *  Zielwert. Aufrufer müssen die Etappen-Leiste dafür überspringen. */
  isEpilogue?: boolean
}

const THEMES: JourneyTheme[] = [
  {
    name: 'Bergexpedition',
    icon: 'landscape',
    guide: 'Bergführerin Vala',
    goalTitle: 'Der Aufstieg der Klasse',
    stepNoun: 'Schritten',
    stages: [
      { label: 'Basislager', icon: 'cottage', story: 'Willkommen im Basislager! Die Zelte stehen, der Proviant ist verstaut, die Route auf der Karte eingezeichnet. Von hier aus seht ihr den Gipfel nur als winzigen weißen Punkt, kaum vorstellbar, dass ihr da hinaufkommt. Aber jede erledigte Hausübung ist ein Schritt auf dem Weg dorthin, und ich habe schon ganz andere Klassen den Berg hinaufgeführt. Packt eure Sachen, morgen früh geht’s los.', chapter: 'Das Basislager riecht nach nassem Zeltstoff und nach dem Tee, den Vala über dem kleinen Kocher warm hält. Rundherum stehen eure Rucksäcke im Halbkreis, halb ausgepackt, und irgendwo klappert eine Schnalle im Wind. Vala kniet über der Karte, streicht sie mit der flachen Hand glatt und legt einen Stein auf die Ecke, damit sie liegen bleibt. „Da oben“, sagt sie und tippt auf einen weißen Punkt, so klein wie ein Fingernagel. „Da wollen wir hin.“ Ihr hebt die Köpfe. Zwischen den Wolken steht der Gipfel so weit weg, dass er gar nicht wirklich zu einem Berg zu gehören scheint, sondern eher zum Himmel. Einer von euch sagt leise, das sehe ziemlich hoch aus. Vala lacht, aber nicht spöttisch, sondern so, wie jemand lacht, der die Frage schon hundertmal gehört hat. „Ist es auch. Deshalb gehen wir ja nicht heute hinauf, sondern morgen. Und übermorgen. Und den Tag danach.“ Sie schraubt den Becher zu und steht auf. „Ein Berg ist nichts, was man bezwingt. Ein Berg ist etwas, wohin man geht. Jeden Tag ein Stück.“ Über euch wird der Himmel dunkler, die ersten Sterne kommen heraus, und es ist so still, dass ihr das Wasser im Bach unterhalb des Lagers hören könnt. Morgen früh brecht ihr auf.', cliffhanger: 'Vala hat die Route für morgen schon abgesteckt, aber sie sagt nicht, was hinter der ersten Kuppe liegt.' },
      { label: 'Waldpfad', icon: 'park', story: 'Der Wald lichtet sich langsam, zwischen den Bäumen blitzt schon das Weiß der höheren Hänge hindurch. Ein paar von euch mussten über umgestürzte Stämme klettern, andere haben den Trampelpfad eines Rudels Steinböcke entdeckt, der Berg zeigt sich von seiner wilden Seite. Der Weg wird spürbar steiler, aber eure Schritte sind sicher. Weiter so, das nächste Stück Wald wartet schon hinter der Kuppe.', chapter: 'Der Wald ist anders, als ihr ihn euch vorgestellt habt. Kein finsteres Dickicht, sondern hohe, schlanke Stämme, zwischen denen das Licht in schrägen Streifen bis auf den Boden fällt. Es riecht nach Harz und feuchtem Moos, und unter euren Schuhen federt eine Schicht aus Nadeln, die so dick ist, dass eure Schritte kaum zu hören sind. Zweimal müsst ihr über umgestürzte Stämme klettern, einmal reicht Vala von oben die Hand herunter, ohne etwas dazu zu sagen. An einer Lichtung bleibt sie stehen und deutet auf den Boden. Da läuft ein schmaler, festgetretener Streifen quer durch das Moos, kaum breiter als eine Handfläche. „Steinböcke“, sagt sie. „Die gehen hier seit Generationen entlang. Immer dieselbe Strecke.“ Sie geht in die Hocke und legt die Hand daneben. „Nichts an diesem Pfad wurde geplant. Der ist einfach entstanden, weil so viele ihn gegangen sind.“ Dann richtet sie sich auf und schaut den Hang hinauf. Zwischen den Wipfeln blitzt zum ersten Mal etwas Weißes durch, hell und kalt, weit über euch. Der Wald wird lichter, die Bäume werden kleiner und krummer, und der Boden unter euch wird spürbar steiler. Ihr merkt es nicht an den Augen, sondern an den Waden.', cliffhanger: 'Über der Baumgrenze wartet ein Stück Weg, bei dem Vala das Seil aus dem Rucksack holen wird.' },
      { label: 'Steiler Aufstieg', icon: 'hiking', story: 'Jetzt wird es anstrengend, kein Weg drumherum. Die Luft wird dünner, jeder Atemzug zählt ein bisschen mehr als der davor, und die Sonne brennt auf den nackten Fels. Aber schaut zurück: Das Basislager ist nur noch ein Punkt tief unter euch, und die halbe Strecke liegt bereits hinter der Klasse. Ich habe ein Seil gespannt, für die Stellen, wo es eng wird. Da müsst ihr nicht allein durch.', chapter: 'Jetzt gibt es keine Bäume mehr, keinen Schatten und keine weichen Nadeln. Nur nackten Fels, hell und heiß von der Sonne, und einen Pfad, der sich in engen Kehren nach oben schraubt. Die Luft schmeckt dünner. Ihr merkt es daran, dass Sätze kürzer werden. Nach der vierten Kehre setzt sich jemand hin, und Vala setzt sich einfach daneben, ohne zu drängen. „Schaut mal zurück“, sagt sie. Und da unten, unglaublich weit unten, liegt das Basislager. Ein paar bunte Punkte im Grün, kaum größer als Streichholzköpfe. Dort habt ihr vor ein paar Tagen noch gestanden und den Gipfel für unerreichbar gehalten. „Das“, sagt Vala, „ist die halbe Strecke.“ An der engsten Stelle hat sie ein Seil gespannt, von einem Felshaken zum nächsten, und es liegt da wie ein Handlauf. Ihr geht nacheinander hindurch, eine Hand am Seil, und niemand muss das allein machen. Auf der anderen Seite dreht Vala sich um und zählt euch durch, leise, mit den Lippen. Erst als sie bei der letzten angekommen ist, geht sie weiter. Über euch türmt sich grauer Fels auf, und irgendwo dort oben, hinter einer Kante, hört ihr den Wind pfeifen.', cliffhanger: 'Hinter der nächsten Kante wird der Weg so schmal, dass zwei nicht mehr nebeneinander gehen können.' },
      { label: 'Fels & Grat', icon: 'terrain', story: 'Fels und ein schmaler Grat, links und rechts geht es steil hinunter, hier zählt jeder einzelne, sichere Schritt. Der Wind pfeift kalt um die Ecken, aber die Sicht ist grandios: Man sieht bis zu den Tälern, aus denen ihr aufgebrochen seid. Ihr seid näher am Gipfel, als es sich gerade anfühlt, glaubt mir. Noch eine letzte Anstrengung, dann liegt der schwerste Teil hinter euch.', chapter: 'Der Grat ist schmal. So schmal, dass ihr hintereinander gehen müsst, und links und rechts fällt der Berg so weit ab, dass man den Boden gar nicht mehr sieht, nur Wolken. Der Wind kommt in Stößen um die Felsnasen und zerrt an euren Jacken, kalt und ruppig, und ihr geht deshalb langsam, sehr bewusst, Fuß vor Fuß. Vala geht als Zweite. Sie hat vorne jemanden gehen lassen, weil, wie sie sagt, hier oben niemand mehr geführt werden muss. Auf halber Strecke bleibt ihr stehen, weil man einfach stehen bleiben muss. Die Sicht reicht über Grate und Kämme hinweg bis in die Täler, aus denen ihr aufgebrochen seid, und alles darunter sieht aus wie eine sehr genaue, sehr stille Landkarte. „Von hier“, sagt Vala und muss dabei gegen den Wind reden, „sieht euer ganzer Weg auf einmal aus wie eine einzige Linie.“ Sie zieht den Reißverschluss höher. „Und ihr seid näher dran, als es sich anfühlt. Das ist fast immer so.“ Dann geht es weiter, Schritt für Schritt, über eine letzte Felsstufe. Und als ihr darüber steigt, wird der Wind plötzlich leiser, so als hätte jemand eine Tür geschlossen.', cliffhanger: 'Über der letzten Felsstufe ist es auf einmal still, und vor euch liegt nichts mehr als Himmel.' },
      { label: 'Gipfel', icon: 'flag', story: 'Geschafft, der Gipfel! Die Fahne der Klasse steht jetzt oben im Wind, und der Blick von hier reicht über Wolken und Täler, so weit das Auge reicht. Das war kein Weg, den einer allein geschafft hätte. Jede Hausübung, jeder Tag Dranbleiben hat einen Schritt dazu beigetragen. Und ganz weit draußen am Horizont, seht ihr das? Ein warmes Licht, das zu keiner meiner Karten passt. Merkt es euch gut, ich habe so ein Leuchten noch nie gesehen. Und wenn ihr herausfinden wollt, woher es kommt, kenne ich jemanden, der euch weiterführen wird: den Bordcomputer ARI. Nächsten Monat hebt ihr mit ihm ins All ab.', chapter: 'Ihr steht oben. Es gibt keinen Weg mehr nach oben, das ist das Erste, was ihr begreift: In alle Richtungen geht es nur noch abwärts. Die Fahne der Klasse knattert im Wind, und unter euch liegt eine Decke aus Wolken, durch die stellenweise die Täler durchblitzen wie durch Löcher in einem Teppich. Niemand sagt eine Weile etwas. Vala steht ein Stück abseits, die Hände in den Taschen, und schaut nicht auf den Gipfel, sondern auf euch. „Kein Einzelner hätte das geschafft“, sagt sie schließlich. „Jede Hausübung, jeder Tag, an dem einer von euch drangeblieben ist, war ein Schritt hier herauf. Merkt euch das gut.“ Und dann, mitten in diese Stille hinein, hebt sie den Arm und deutet nach Osten. Ganz weit draußen, dort wo der Horizont eigentlich nur noch Dunst ist, liegt ein warmes Licht. Kein Stern, keine Stadt, keine Sonne. Es ist einfach da und schimmert ruhig vor sich hin. Vala zieht ihre Karte hervor, faltet sie auf, schaut hin, faltet sie wieder zusammen. Zum ersten Mal, seit ihr sie kennt, wirkt sie ratlos. „Auf keiner meiner Karten“, sagt sie leise, „steht da irgendetwas.“', handover: 'Sie sieht dem Licht noch lange nach, dann dreht sie sich zu euch um. „Ich bin Bergführerin, ich kenne Felsen und Wege. Aber das da draußen ist nichts, wohin man laufen kann.“ Sie lächelt schief. „Dafür kenne ich jemanden. Er rechnet schneller, als ich schauen kann, und er hat schon Dinge gesehen, die auf gar keiner Karte stehen: der Bordcomputer ARI. Nächsten Monat hebt ihr mit ihm ab.“' },
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
  {
    name: 'Terra Nova',
    icon: 'eco',
    guide: 'Ranger-Drohne „Sprout“',
    goalTitle: 'Das Erwachen des Ödlands',
    stepNoun: 'Trieben',
    // Etappe, deren Text das Erwachen des Zeichens erzählt (docs/story-welten.html).
    signStage: 1,
    stages: [
      { label: 'Das graue Ödland', icon: 'terrain', story: 'Willkommen im Ödland. Hier wächst seit langer Zeit kein einziger Halm mehr, der Boden ist rissig und grau, so weit ihr sehen könnt. Sprout schwirrt aufgeregt um euch herum und deutet auf den Splitter in eurer Hand, der hier fast erloschen wirkt. „Dieser Ort war einmal voller Leben, das spüre ich. Bringen wir es zurück, dann wacht vielleicht auch euer seltsamer Stein wieder auf." Packt an, jeder erledigte Auftrag ist ein Samen im trockenen Boden.' },
      { label: 'Die ersten Sprossen', icon: 'grass', story: 'Habt ihr das gesehen? Zwischen den Rissen schiebt sich das erste zarte Grün ans Licht, winzig und mutig. Und im selben Moment beginnt eines der Zeichen auf dem Splitter ganz leise zu glimmen, warm wie eine kleine Flamme. Sprout kommt so abrupt zum Stehen, dass es fast einen Purzelbaum macht. „Der Stein antwortet dem Leben! Das erste Zeichen ist erwacht. Aber was bedeutet es nur?"' },
      { label: 'Der Wurzelteppich', icon: 'forest', story: 'Aus den ersten Sprossen ist ein dichter Teppich aus Wurzeln und Blättern geworden, der sich über das ganze Ödland legt. Doch etwas ist merkwürdig: Die Wurzeln wachsen nicht kreuz und quer, sondern alle in dieselbe Richtung, als würden sie etwas suchen, das tief unter der Erde verborgen liegt. Sprout legt lauschend ein Blatt-Ohr auf den Boden. „Da unten ist etwas. Etwas sehr, sehr Altes. Grabt vorsichtig weiter."' },
      { label: 'Der schlafende Setzling', icon: 'park', story: 'Unter dem Wurzelteppich findet ihr ihn: einen uralten Setzling, halb zu Stein geworden, der hier seit unzähligen Jahren wartet. Als das Licht des Splitters ihn berührt, zittern seine winzigen Blätter, als würde er aus einem langen Schlaf erwachen. Ganz langsam neigt sich der Setzling zur Seite und zeigt mit seiner Spitze in die Ferne, dorthin, wo am Horizont ein tiefblaues Meer schimmert. Sprout flüstert: „Er zeigt uns den Weg. Aber wohin nur?"' },
      { label: 'Das blühende Tal', icon: 'local_florist', story: 'Geschafft! Aus dem grauen Ödland ist ein blühendes Tal geworden, voller Farben, Summen und Leben. Das erwachte Zeichen auf dem Splitter leuchtet jetzt klar und deutlich: ein kleines Blatt, gefolgt von einer geschwungenen Welle. „Diese Welt ist nur ein einziger Ast von etwas viel Größerem, das ahne ich jetzt. Und der Splitter zeigt zum Wasser, hinunter in die Tiefe. Ich kenne jemanden, der euch dort weiterführen wird: Dr. Coralie und ihren Tintenfisch Nauto. Folgt dem Wasser, ein Tauchboot wartet schon, und tief unten schläft das nächste Zeichen."' },
    ],
    nudge: n => `Sprout schwirrt aufgeregt um euch herum: noch ${n} ${n === 1 ? 'Trieb' : 'Triebe'} bis zum nächsten Grün!`,
  },
  {
    name: 'Tiefsee-Expedition',
    icon: 'water',
    guide: 'Dr. Coralie & Tintenfisch Nauto',
    goalTitle: 'Die Tauchfahrt der Klasse',
    stepNoun: 'Leuchtspuren',
    // Etappe, deren Text das Erwachen des Zeichens erzählt (docs/story-welten.html).
    signStage: 1,
    stages: [
      { label: 'Das wartende Tauchboot', icon: 'scuba_diving', story: 'An der Wasseroberfläche schaukelt euer Tauchboot, bereit zum Abtauchen. Dr. Coralie prüft ruhig jeden Hebel, während Nauto neugierig gegen die Scheibe tupft und in fröhlichem Blaugrün leuchtet. „Willkommen an Bord", sagt Coralie. „Da unten ist es dunkel und still, aber wunderschön. Und euer Splitter, seht nur, er glüht schon, als wüsste er, dass wir uns dem nächsten Zeichen nähern." Luken dicht, es geht hinab.' },
      { label: 'Die Dämmerzone', icon: 'water_drop', story: 'Immer tiefer sinkt das Boot, und das Licht der Sonne wird über euch zu einem blassen, fernen Schimmer. Um euch herum blinken plötzlich hunderte winzige Lichter auf, Quallen und Fische, die selbst leuchten wie Sterne unter Wasser. Nauto wird ganz aufgeregt und blinkt in genau demselben Muster wie ein Zeichen, das jetzt auf dem Splitter aufwacht. Coralie beugt sich vor. „Diese Lichter formen ein Muster. Und euer Stein antwortet ihnen."' },
      { label: 'Der leuchtende Graben', icon: 'waves', story: 'Vor euch öffnet sich ein tiefer Graben, an dessen Wänden uraltes Gestein in sanftem Licht glimmt. Nauto tastet mit einem Arm über eine alte, versunkene Säule und leuchtet plötzlich alarmiert auf: In den Stein sind dieselben Zeichen gemeißelt wie auf eurem Splitter. Doch die Botschaft ist nur zur Hälfte da. „Der Rest", sagt Coralie leise, „liegt noch tiefer. Traut ihr euch?"' },
      { label: 'Die stille Tiefe', icon: 'blur_on', story: 'Ganz unten ist es vollkommen still und dunkel, nur eure einzige Lampe wirft einen Kreis aus Licht. Hier findet ihr die zweite Hälfte der gemeißelten Zeichen, und als sie sich in Gedanken mit der ersten verbinden, ergeben sie ein Wort, das noch niemand aussprechen kann. Da beginnt der Splitter zu summen, einen einzigen klaren Ton, den er noch nie zuvor von sich gegeben hat. Der Ton hallt durch den Graben, und eine uralte Strömung erwacht und beginnt, euch sanft nach oben zu tragen.' },
      { label: 'Der Aufstieg', icon: 'arrow_upward', story: 'Die Strömung hebt euch zurück ans Licht, und auf dem Splitter leuchtet nun ein zweites Zeichen: eine Welle, dazu der leise Ton, den ihr in der Tiefe gehört habt. „Diese Zeichen sind älter als jede Seekarte, älter als alles, woran sich das Meer erinnert", sagt Coralie nachdenklich. „Wer sie geschrieben hat, lebte vor unvorstellbar langer Zeit. Aber ich kenne jemanden, der die Zeit selbst lesen kann und euch weiterführen wird: den Chronist in seiner großen Bibliothek." Nauto wickelt den Splitter behutsam ein und bringt euch nach oben.' },
    ],
    nudge: n => `Nauto blinkt ruhig blaugrün: noch ${n} ${n === 1 ? 'Leuchtspur' : 'Leuchtspuren'} bis zur nächsten Tiefe.`,
  },
  {
    name: 'Chroniken der Zeit',
    icon: 'history_edu',
    guide: 'Der Chronist',
    goalTitle: 'Die Chronik der Klasse',
    stepNoun: 'Seiten',
    // Etappe, deren Text das Erwachen des Zeichens erzählt (docs/story-welten.html).
    signStage: 4,
    stages: [
      { label: 'Die leere Chronik', icon: 'menu_book', story: 'Willkommen in der größten Bibliothek, die ihr je gesehen habt, Regale bis zur Decke und darüber hinaus. In der Mitte liegt ein riesiges, leeres Buch, die Chronik dieses Jahres, die ihr gemeinsam füllen werdet. Der Chronist betrachtet euren Splitter durch seine runde Brille und hebt erstaunt die Augenbrauen. „Diese Schrift ist älter als jede Seite, die ich besitze. Um zu verstehen, wer sie schrieb, müssen wir zurückblättern, nicht in einem Buch, sondern in der Zeit selbst." Jede erledigte Aufgabe schreibt eine neue Seite.' },
      { label: 'Das erste Zeitalter', icon: 'history_edu', story: 'Mit jeder Seite, die ihr schreibt, blättert die Zeit weiter zurück, und plötzlich steht ihr in einem längst vergangenen Zeitalter. Eine Welt, so jung, dass es kaum etwas darauf gibt, nur weite, leere Ebenen und einen Himmel voller unbekannter Sterne. Am Horizont zieht eine Gruppe von Wanderern mit Laternen vorbei. Und einer von ihnen trägt einen Splitter, der genauso leuchtet wie eurer.' },
      { label: 'Der Riss in der Zeit', icon: 'hourglass_empty', story: 'Auf einmal gerät die Zeit ins Wanken, Seiten wirbeln durch die Luft wie Blätter im Sturm, und die Zeitalter drohen durcheinanderzugeraten. „Haltet die Chronik zusammen!", ruft der Chronist gegen den Wind. Ihr müsst zusammenhalten und die Seiten in der richtigen Ordnung festhalten, sonst verliert ihr den roten Faden für immer. Da glüht der Splitter warm auf und beruhigt den Sturm, als würde er selbst zur Zeit gehören.' },
      { label: 'Die Begegnung', icon: 'auto_stories', story: 'Als der Sturm sich legt, seht ihr sie ganz nah: die ersten Wanderer, wie sie behutsam die Samen ganzer Welten in den Boden legen, einen Berg hier, ein Meer dort, einen Himmel darüber. Sie sprechen leise von einer Heimat, zu der am Ende jeder Weg zurückführt, einem Ort aus warmem Licht. Doch bevor der Chronist den Namen dieses Ortes hören kann, verblasst die Vision und reißt euch zurück.' },
      { label: 'Zurück ins Jetzt', icon: 'schedule', story: 'Ihr steht wieder in der Bibliothek, atemlos, und auf dem Splitter leuchtet nun ein drittes Zeichen: eine kleine Sanduhr. „Jetzt weiß ich, wer die Zeichen schrieb", sagt der Chronist und schließt die volle Chronik ehrfürchtig. „Es waren die ersten Wanderer, die alle Welten gepflanzt und diesen Splitter als Botschaft zurückgelassen haben. Doch wo ihre Heimat liegt, verrät die Zeit mir nicht. Aber ich kenne jemanden, der Orte baut und verbindet wie kein Zweiter und euch weiterführen wird: Hafenmeister Finn, weit im Süden auf einer einsamen Sandbank."' },
    ],
    nudge: n => `Der Chronist tunkt die Feder ein: noch ${n} ${n === 1 ? 'Seite' : 'Seiten'} bis zum nächsten Zeitalter.`,
  },
  {
    name: 'Inselreich',
    icon: 'anchor',
    guide: 'Hafenmeister Finn',
    goalTitle: 'Das Inselreich der Klasse',
    stepNoun: 'Steinen',
    // Etappe, deren Text das Erwachen des Zeichens erzählt (docs/story-welten.html).
    signStage: 1,
    stages: [
      { label: 'Die einsame Sandbank', icon: 'anchor', story: 'Mitten im weiten Meer liegt sie, eine kleine, kahle Sandbank, auf der nichts steht als ein einziger schiefer Pfahl. Finn springt an Land, das Tau über der Schulter, und breitet lachend die Arme aus. „Ich weiß, es sieht nach nicht viel aus. Aber glaubt mir, aus so einer Sandbank kann ein ganzes Reich werden, wenn viele Hände zusammenhelfen." Der Splitter summt kräftiger, sobald die Flut kommt und geht. Jeder Auftrag ist ein Stein für den Aufbau.' },
      { label: 'Der erste Steg', icon: 'construction', story: 'Stein um Stein legt ihr den ersten Steg ins Wasser, dann eine Mauer, dann das erste kleine Haus mit einer Laterne davor. Aus der kahlen Sandbank wird langsam ein winziger Hafen. Und als der Steg fertig ist, erwacht ein weiteres Zeichen auf dem Splitter, klar und fest wie ein Anker. Finn nickt anerkennend. „Seht ihr? Der Stein mag, was wir hier tun."' },
      { label: 'Der große Sturm', icon: 'thunderstorm', story: 'In der Nacht zieht ein gewaltiger Sturm auf, der Wind heult und die Wellen schlagen hoch gegen euren jungen Hafen. „Haltet die Taue!", ruft Finn durch das Tosen, und gemeinsam stemmt ihr euch gegen den Sturm, damit er nicht alles fortreißt. Da leuchtet der Splitter so hell wie nie, und im Licht seht ihr, wie die Wellen etwas freispülen, das tief unter der Sandbank verborgen lag.' },
      { label: 'Das versunkene Tor', icon: 'castle', story: 'Als der Sturm sich legt, liegt es im ersten Morgenlicht vor euch: ein uraltes steinernes Tor, halb im Sand versunken, über und über bedeckt mit denselben Zeichen wie euer Splitter. Vorsichtig hebt ihr den Stein, und er gleitet in eine Vertiefung im Tor, als hätte er immer dorthin gehört. Ein tiefes Summen geht durch den Stein, das Tor beginnt zu leuchten, und für einen Moment zeigt sich dahinter ein Himmel voller Sterne. Doch dann erlischt das Licht wieder, und der Weg bleibt verschlossen.' },
      { label: 'Das leuchtende Reich', icon: 'holiday_village', story: 'Aus der einsamen Sandbank ist ein leuchtendes kleines Inselreich geworden, mit Häusern, Stegen und Laternen, die sich im Wasser spiegeln. Auf dem Splitter glüht nun ein viertes Zeichen: ein Anker. „Jetzt verstehe ich, was ihr da tragt", sagt Finn und legt euch eine schwere Hand auf die Schulter. „Es ist eine Art Schlüssel, der Orte miteinander verbindet, ein Anker zwischen den Welten. Das Tor zeigt zum Nachthimmel, und ich kenne jemanden, der die Sterne liest wie andere ein Buch und euch die Richtung weisen wird: Astronomin Nox in ihrer Sternwarte hoch über dem Meer."' },
    ],
    nudge: n => `Finn legt das Tau zurecht: noch ${n} ${n === 1 ? 'Stein' : 'Steine'} bis der nächste Steg steht.`,
  },
  {
    name: 'Sternenkarte',
    icon: 'auto_awesome',
    guide: 'Astronomin Nox',
    goalTitle: 'Die Sternenkarte der Klasse',
    stepNoun: 'Sternen',
    // Etappe, deren Text das Erwachen des Zeichens erzählt (docs/story-welten.html).
    signStage: 1,
    stages: [
      { label: 'Der leere Nachthimmel', icon: 'nights_stay', story: 'Von der Sternwarte aus blickt ihr in einen Nachthimmel, der vollkommen leer ist, kein einziger Stern, nur tiefes, samtenes Schwarz. Nox lächelt und stützt sich auf ihr langes Fernrohr. „Ein leerer Himmel macht vielen Angst. Mir nicht. Denn heute Nacht füllen wir ihn gemeinsam mit Licht." Die Zeichen auf eurem Splitter scheinen den leeren Himmel widerzuspiegeln, als warteten auch sie darauf, vollständig zu werden.' },
      { label: 'Die ersten Sterne', icon: 'star', story: 'Mit jeder erledigten Aufgabe flammt oben ein neuer Stern auf, erst einer, dann drei, dann ein ganzes Feld aus funkelndem Licht. Auf dem Splitter erwacht ein fünftes Zeichen, ein heller Stern, der genauso leuchtet wie die am Himmel. Und die neuen Sterne, bemerkt ihr, ordnen sich nicht zufällig an. Sie beginnen, ein Muster zu bilden.' },
      { label: 'Das Sternbild', icon: 'auto_awesome', story: 'Immer mehr Sterne setzen sich zusammen, bis am Himmel ein großes Sternbild steht, das genau zu den Zeichen auf eurem Splitter passt. Nox hält den Atem an. „So ein Sternbild habe ich noch nie gesehen. Es sieht aus wie ein Baum aus Licht." Doch ein Stern fehlt noch, mitten in der Krone, und ohne ihn bleibt das Bild unvollständig.' },
      { label: 'Die verborgene Bahn', icon: 'travel_explore', story: 'Den fehlenden Stern findet ihr schließlich, versteckt hinter einer Wolkenbank, und als er endlich aufleuchtet, geschieht etwas Wunderbares: Aus dem Sternbild spannt sich eine leuchtende Bahn quer über den ganzen Himmel, ein Weg aus Sternen, der zu einem einzigen warmen Punkt am Horizont führt. „Dorthin", flüstert Nox. „Der Weg führt genau dorthin." Doch die Zeichen auf dem Splitter sind noch immer verstreut und ergeben noch kein Ganzes.' },
      { label: 'Die Karte am Himmel', icon: 'map', story: 'Der volle Sternenweg leuchtet nun von einem Ende des Himmels zum anderen. „Jetzt wissen wir, wohin der Splitter zeigt", sagt Nox leise. „Zu einem warmen Hafen aus Licht, dort am Horizont. Aber die vielen einzelnen Zeichen müssen erst zu einem einzigen zusammengefügt werden, sonst öffnet sich der Weg nicht. Dafür kenne ich die geschicktesten Hände weit und breit, die euch weiterführen werden: Meisterin Tüftel in ihrer Werkstatt."' },
    ],
    nudge: n => `Nox richtet das Fernrohr aus: noch ${n} ${n === 1 ? 'Stern' : 'Sterne'} bis das Bild am Himmel weiterwächst.`,
  },
  {
    name: 'Werkstatt der Erfinder',
    icon: 'precision_manufacturing',
    guide: 'Meisterin Tüftel',
    goalTitle: 'Die große Maschine der Klasse',
    stepNoun: 'Zahnrädern',
    // Etappe, deren Text das Erwachen des Zeichens erzählt (docs/story-welten.html).
    signStage: 1,
    stages: [
      { label: 'Die stille Werkstatt', icon: 'build', story: 'In Tüftels Werkstatt hängt und liegt und stapelt sich alles, was man sich vorstellen kann: Zahnräder, Federn, Röhren, blinkende Knöpfe. Nur bewegt sich nichts, alles steht still. Tüftel schiebt sich die Schutzbrille auf die Stirn und grinst. „Ihr bringt mir also diesen geheimnisvollen Stein. Wunderbar! Dann bauen wir eben eine Maschine, die endlich liest, was er uns die ganze Zeit verschweigt." Jede Aufgabe ist ein Bauteil.' },
      { label: 'Das erste Zahnrad', icon: 'settings', story: 'Ihr setzt das erste große Zahnrad ein, dann ein zweites, ein drittes, und mit einem Ruck beginnen sie sich zu drehen. Die ganze Werkstatt erwacht ratternd zum Leben, Riemen laufen, Lichter blinken. Auf dem Splitter erwacht das sechste Zeichen, ein feines Zahnrad. „Sie läuft!", jubelt Tüftel und tanzt fast. „Jetzt müssen wir sie nur noch mit eurem Stein verbinden."' },
      { label: 'Die Verbindung', icon: 'link', story: 'Vorsichtig setzt ihr den Splitter in die Mitte der Maschine, und sofort beginnt sie, die verstreuten Zeichen zu ordnen und aneinanderzureihen. Doch dann stockt alles, ein Teil passt einfach nicht, die Maschine stottert und spuckt Funken. Tüftel kaut nachdenklich am Bleistift. „Irgendein Zahnrad fehlt uns noch. Ohne das letzte Teil bleibt die Botschaft ein Rätsel."' },
      { label: 'Der letzte Funke', icon: 'bolt', story: 'Nach langem Suchen und Tüfteln findet ihr das fehlende Zahnrad, und mit einem letzten Funken klickt es an seinen Platz. Die Maschine surrt auf, dreht sich schneller und schneller, und die einzelnen Zeichen des Splitters gleiten zusammen zu einer einzigen Form. Ihr traut euren Augen kaum: Es ist das Wappen eines großen Baumes. Und der Splitter wird plötzlich warm, ganz warm, und pocht leise wie ein kleines Herz. Das ist gar kein Stein. Das ist ein Samen.' },
      { label: 'Das fertige Werk', icon: 'precision_manufacturing', story: 'Die Maschine hat es geschafft: Das ganze Wappen leuchtet nun vollständig, und die Botschaft ist fast entschlüsselt. „Ich habe in meinem Leben viel gebaut", sagt Tüftel und wischt sich die Hände ab, „aber so etwas noch nie. Euer Splitter ist ein Samen, und dieses Wappen gehört zu einem Weltenbaum." Sie legt euch den warmen, pochenden Samen in die Hände. „Ein Samen gehört gepflanzt. Und ich kenne genau die Eine, die den Baum hütet und euch ans Ziel führen wird: die Wächterin des Weltenbaums, auf einem uralten Hügel."' },
    ],
    nudge: n => `Tüftel wischt sich die Hände ab: noch ${n} ${n === 1 ? 'Zahnrad' : 'Zahnräder'}, dann läuft die Maschine weiter.`,
  },
  {
    name: 'Der Weltenbaum',
    icon: 'park',
    guide: 'Wächterin des Weltenbaums',
    goalTitle: 'Der Weltenbaum der Klasse',
    stepNoun: 'Blättern',
    // Etappe, deren Text das Erwachen des Zeichens erzählt (docs/story-welten.html).
    signStage: 3,
    stages: [
      { label: 'Der uralte Hügel', icon: 'forest', story: 'Auf einem sanften Hügel stehen nur noch die mächtigen Wurzeln eines Baumes, der vor langer Zeit hier gewachsen sein muss. Die Wächterin, in ein Gewand aus Blättern gehüllt, kommt euch entgegen und lächelt, als sie den Samen in euren Händen sieht. „Ihr habt ihn die ganze Reise über getragen und wusstet es nicht. Das ist kein Splitter und war nie einer. Das ist ein Same. Das Herz des Weltenbaums." Jede letzte Aufgabe dieses Jahres lässt ein Blatt wachsen.' },
      { label: 'Das Pflanzen', icon: 'compost', story: 'Gemeinsam legt ihr den Samen behutsam in die alten Wurzeln, und langsam versinkt er in der Erde. Ein sanftes grünes Leuchten breitet sich aus, tief unter dem Boden, und der Hügel scheint zu atmen. Auf dem Wappen, das ihr in Tüftels Werkstatt gesehen habt, fehlt jetzt nur noch ein einziges Zeichen. Etwas Großes ist im Begriff zu erwachen.' },
      { label: 'Die erwachenden Äste', icon: 'account_tree', story: 'Aus der Erde steigt ein Stamm empor, dann recken sich Äste in den Himmel, einer nach dem anderen. Und auf jedem einzelnen Ast erscheint eine der Welten, durch die ihr gereist seid: ein Berg, ein ferner Planet, ein Dschungel, ein blühendes Tal, ein tiefes Meer, eine Bibliothek, ein Inselreich, ein Sternenhimmel, eine Werkstatt. Nur der höchste Ast von allen ist noch kahl und leer. „Es fehlt noch etwas", sagt die Wächterin leise. „Das Letzte und das Schönste."' },
      { label: 'Die letzte Krone', icon: 'park', story: 'Mit der allerletzten Aufgabe schlägt auch der höchste Ast aus, und im selben Moment leuchtet das Wappen vollständig auf, alle Zeichen vereint zu einem einzigen. Der Same singt jetzt seine ganze Melodie, all die Töne der Reise auf einmal. Und endlich könnt ihr die Botschaft lesen, die er das ganze Jahr getragen hat: „Kehrt heim zum Sonnenhafen, von dem jede Reise ausging und zu dem jede zurückführt." Ganz oben in der Krone öffnet sich ein warmes, goldenes Licht wie eine Tür.' },
      { label: 'Der offene Weg', icon: 'door_open', story: 'Der Weltenbaum steht nun vollständig da, gewaltig und leuchtend, seine Äste tragen alle Welten und seine Krone ist eine Tür aus warmem Licht. Alle Zeichen, alle Welten, alle Guides sind in diesem einen Baum miteinander verbunden. „Ihr habt den Weg nach Hause geöffnet", sagt die Wächterin bewegt. „Hinter der goldenen Krone liegt der Sonnenhafen, der Ort, von dem einst jede Reise ausging. Und diesmal führt euch nicht einer weiter, sondern wir alle gemeinsam warten schon dort auf euch, am anderen Ende des Lichts."' },
    ],
    nudge: n => `Die Wächterin legt eine Hand an den Stamm: noch ${n} ${n === 1 ? 'Blatt' : 'Blätter'} bis der nächste Ast ausschlägt.`,
  },
  {
    name: 'Sonnenhafen',
    icon: 'wb_sunny',
    guide: 'Alle Guides gemeinsam',
    goalTitle: 'Der Sonnenhafen der Klasse',
    stepNoun: 'Sonnenstrahlen',
    // Sommerferien: kein Klassenziel, keine Etappen, nur ankommen.
    isEpilogue: true,
    stages: [
      { label: 'Ankunft im Sonnenhafen', icon: 'wb_sunny', story: 'Und dann tretet ihr durch die goldene Krone des Weltenbaums hindurch, und vor euch liegt er endlich: der Sonnenhafen. Warmes Licht auf alten Steinmauern, blaue Segel, ein Leuchtturm mit einer goldenen Sonne, Wimpel im Wind und das ruhige Glucksen des Wassers. Am Kai warten sie alle auf euch, jede einzelne Figur eurer langen Reise: Vala und ARI, Isla und Sprout, Coralie und Nauto, der Chronist, Finn, Nox, Tüftel und die Wächterin. Der Same ist zum Weltenbaum geworden, und sein Herz leuchtet nun warm über dem ganzen Hafen. „Das hier", sagen die Guides gemeinsam, „ist der Ort, von dem wir alle erzählt haben. Ihr seid zu Hause angekommen. Ruht euch aus, genießt die Sonne. Und wenn ein neues Jahr beginnt, wartet schon die nächste Reise irgendwo da draußen." Willkommen im Sonnenhafen.' },
    ],
    nudge: () => 'Im Sonnenhafen gibt es nichts mehr zu erreichen. Ruht euch aus, die Reise ist angekommen.',
  },
]

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

/** Ein Eintrag im Schuljahres-Fahrplan (siehe SCHOOL_YEAR_ARCS). `built: false`
 *  markiert eine Welt, für die es noch keine Etappen-Story in THEMES gibt: dann
 *  tragen nur die Teaser-Angaben (Name, Guide, Kurzbeschreibung, Fokus). Aktuell
 *  sind alle elf Welten gebaut, das Feld bleibt für künftige Welten erhalten. */
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

/** Der Schuljahres-Fahrplan (Reihenfolge aus dem Konzeptdoc, September bis
 *  August). Alle elf Welten sind gebaut (siehe THEMES) — bis August 2026 waren
 *  es nur drei, wodurch getSeasonTheme() ab Dezember dauerhaft auf der
 *  Schatzsuche stehen blieb und im ganzen Schuljahr kein einziges Splitter-
 *  Zeichen erwachte. `built` bleibt als Feld erhalten, damit eine künftige
 *  Welt wieder als reiner Teaser vorgemerkt werden kann.
 *  Sommer (Juli–August) ist keine reguläre Welt, sondern das gemeinsame
 *  Ziel aller Guides — der Ort, zu dem am Ende jede Reise zurückführt. */
export const SCHOOL_YEAR_ARCS: SchoolYearArc[] = [
  { name: 'Bergexpedition', icon: 'landscape', guide: 'Bergführerin Vala', tagline: 'Schroffe Gipfelwelt, dünne Luft, weiter Blick.', focus: 'Durchhalten & die Flamme', monthLabel: 'September', built: true, teaser: 'Der Aufstieg hat begonnen. Vala führt euch Schritt für Schritt zum Gipfel.' },
  { name: 'Weltraummission', icon: 'rocket_launch', guide: 'Bordcomputer ARI', tagline: 'Raumschiff, Funkstille, ferne Planeten.', focus: 'Präzision & Pünktlichkeit', monthLabel: 'Oktober', built: true, teaser: 'Irgendwo im All blinkt schon ein Signal auf ARIs Bildschirm. Bereit zum Start?' },
  { name: 'Schatzsuche', icon: 'map', guide: 'Kartografin Isla', tagline: 'Dschungel, Ruinen, vergilbte Karten.', focus: 'Neugier & Rätsel', monthLabel: 'November', built: true, teaser: 'Isla hat schon eine Karte ausgerollt, verrät aber noch keine Route.' },
  { name: 'Terra Nova', icon: 'eco', guide: 'Ranger-Drohne „Sprout“', tagline: 'Ödland, das die Klasse gemeinsam begrünt.', focus: 'Gemeinsam aufbauen', monthLabel: 'Dezember', built: true, teaser: 'Ein graues Ödland wartet auf sein erstes Grün. Und Sprout spürt, dass der Splitter, den ihr aus der Schatzkammer tragt, hier zum ersten Mal erwachen will.' },
  { name: 'Tiefsee-Expedition', icon: 'water', guide: 'Dr. Coralie & Tintenfisch Nauto', tagline: 'Ein U-Boot sinkt Schicht um Schicht ins Blau.', focus: 'Mut & Erkundung', monthLabel: 'Jänner', built: true, teaser: 'Tief im dunklen Blau wartet ein Tauchboot. Nauto sagt, die Zeichen auf eurem Splitter seien älter als jedes Meer.' },
  { name: 'Chroniken der Zeit', icon: 'history_edu', guide: 'Der Chronist', tagline: 'Zeitreise durch die Epochen.', focus: 'Wissen sammeln', monthLabel: 'Februar', built: true, teaser: 'Der Chronist blättert die Zeit selbst zurück, um endlich herauszufinden, wer die Zeichen einst schrieb, die ihr bei euch tragt.' },
  { name: 'Inselreich', icon: 'anchor', guide: 'Hafenmeister Finn', tagline: 'Aus einer Sandbank wächst ein Reich.', focus: 'Dienste & Aufbau', monthLabel: 'März', built: true, teaser: 'Aus einer Sandbank soll ein ganzes Reich wachsen. Und tief im Sand wartet ein Tor, in das euer Splitter passt wie ein Schlüssel.' },
  { name: 'Sternenkarte', icon: 'auto_awesome', guide: 'Astronomin Nox', tagline: 'Ein leerer Nachthimmel füllt sich mit Licht.', focus: 'Aufmerksamkeit', monthLabel: 'April', built: true, teaser: 'Nox will mit euch den leeren Himmel füllen, bis die Sterne genau jenes Zeichen bilden, das auf eurem Splitter schimmert.' },
  { name: 'Werkstatt der Erfinder', icon: 'precision_manufacturing', guide: 'Meisterin Tüftel', tagline: 'Zahnrad um Zahnrad erwacht eine Maschine.', focus: 'Aufgaben kombinieren', monthLabel: 'Mai', built: true, teaser: 'In Tüftels Werkstatt steht schon eine Maschine bereit, die endlich lesen soll, was euer Splitter die ganze Reise verschwiegen hat.' },
  { name: 'Der Weltenbaum', icon: 'park', guide: 'Wächterin des Weltenbaums', tagline: 'Ein uralter Baum, der alle bereisten Welten miteinander verwebt.', focus: 'Rückblick & Verbindung', monthLabel: 'Juni', built: true, teaser: 'Am Ende des Jahres zeigt euch die Wächterin, was ihr wirklich tragt. Keinen Splitter, sondern einen Samen.' },
  { name: 'Sonnenhafen', icon: 'wb_sunny', guide: 'Alle Guides gemeinsam', tagline: 'Der Ort, von dem jede Guide-Figur erzählt, und zu dem am Ende alle zurückkehren.', focus: 'Ankommen & Feiern', monthLabel: 'Juli – August', built: true, teaser: 'Dorthin, sagt jede Guide-Figur, führt am Ende jede Reise. Und der Weltenbaum weist euch endlich den Weg.' },
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

/** Wie viele der 7 Zeichen bereits erwacht sind.
 *
 *  Zeichen vergangener Welten zählen vollständig. Das Zeichen der LAUFENDEN
 *  Welt erwacht, sobald die Klasse die Etappe erreicht hat, deren Text das
 *  Erwachen erzählt (`signStage`) — nicht erst mit dem nächsten Monatswechsel.
 *  Vorher zählte die laufende Welt gar nicht mit, wodurch ein Kind im Text
 *  „Das erste Zeichen ist erwacht" las, während der Rucksack „0 von 7" zeigte.
 *
 *  `currentStage` = 0-basierter Etappen-Index der laufenden Welt, wie ihn
 *  `currentStageIndex(pct, stages.length)` liefert. Der Default -1 bedeutet
 *  „noch keine Etappe erreicht" und ist damit die sichere Annahme für
 *  Aufrufer ohne Fortschrittsdaten. Monoton wachsend, nie rückläufig. */
export function awakenedSignCount(currentThemeName: string, currentStage = -1): number {
  const currentIndex = SCHOOL_YEAR_ARCS.findIndex(arc => arc.name === currentThemeName)
  if (currentIndex < 0) return 0

  const past = SPLITTER_SIGNS.filter(s => schoolYearIndex(s.worldIcon) < currentIndex).length

  const currentIcon = SCHOOL_YEAR_ARCS[currentIndex].icon
  if (!SPLITTER_SIGNS.some(s => s.worldIcon === currentIcon)) return past

  const theme = findBuiltTheme(currentIcon)
  if (!theme) return past
  // Ohne ausdrückliches signStage erwacht das Zeichen an der letzten Etappe.
  const signStage = theme.signStage ?? theme.stages.length - 1
  return currentStage >= signStage ? past + 1 : past
}
