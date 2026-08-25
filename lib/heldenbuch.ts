import { VETERAN_MILESTONE } from '@/lib/streak'
import { findQuestTemplate } from '@/lib/questVault'
import { findGuildQuestTemplate } from '@/lib/guilds'
import { findRiddle } from '@/lib/riddles'
import { WEEKLY_SEAL_KEY, SIGN_AWAKENED_KEY, WORLD_DONE_KEY } from '@/lib/achievements'
import { addDaysISO } from '@/lib/date'
import { SCHOOL_YEAR_ARCS, SPLITTER_SIGNS } from '@/lib/seasonTheme'
import type { AchievementKind } from '@/lib/types'

/** Datenbausteine für das Heldenbuch, die aus Roh-Signalen abgeleitet werden —
 *  bewusst als reine Funktionen (kein DB-Zugriff), damit Startseite und
 *  Abenteuerseite exakt dieselbe Logik teilen (analog lib/questContext.ts). */

// ─── Stille Anerkennung (Guide-Notiz) ────────────────────────────────────────
// Eine kurze, private Beobachtung des Guides in Ich-Form ("ich habe gesehen,
// dass du…") — nie ein Vergleich mit anderen (Prinzip 1), mal Lob, mal ein
// sanfter Hinweis. Priorität wählt das gerade Relevanteste aus.

export interface GuideNote {
  icon: string
  text: string
}

export interface GuideNoteSignals {
  openHomeworkCount: number
  dutyName: string | null
  dutyKeptUp: boolean
  confirmedStreak: number
  broken: boolean
  questsDone: number
  questsTotal: number
}

type GuideNoteVoice = (s: GuideNoteSignals) => GuideNote

/** Einheit der Flamme. computeStreak() zählt HAUSÜBUNGEN in Folge, nicht
 *  Kalendertage (zwei am selben Tag fällige HÜ zählen doppelt, siehe
 *  lib/streak.ts). Die Guide-Stimmen sagten früher „Tage in Folge" und führten
 *  Kinder damit in die Irre: wer drei HÜ an einem Nachmittag erledigt, las
 *  „3 Tage in Folge". Gleiche Formulierung wie in HeldenbuchCard. */
function huLabel(streak: number): string {
  return streak === 1 ? 'Hausübung' : 'Hausübungen'
}

/** Neutrale Standard-Stimme — greift für jeden Guide, der noch keine eigenen
 *  Formulierungen hat (Mein Guide: Prinzip 4, kein Vorab-Content-Berg). */
const GENERIC_VOICE: GuideNoteVoice = s => {
  if (s.dutyKeptUp && s.dutyName) {
    return { icon: 'volunteer_activism', text: `Danke, dass du dich so zuverlässig um „${s.dutyName}“ kümmerst — die Klasse verlässt sich auf dich.` }
  }
  if (s.broken) {
    return { icon: 'self_improvement', text: 'Deine Flamme ist gerade aus — kein Weltuntergang. Morgen zündest du sie einfach neu an.' }
  }
  if (s.openHomeworkCount > 0) {
    const hw = s.openHomeworkCount === 1 ? 'Hausübung' : 'Hausübungen'
    return { icon: 'visibility', text: `Ich sehe, du hast noch ${s.openHomeworkCount} ${hw} offen — du schaffst das, Schritt für Schritt.` }
  }
  if (s.confirmedStreak >= 5) {
    return { icon: 'local_fire_department', text: `Ich habe gesehen, wie beständig du dranbleibst: ${s.confirmedStreak} ${huLabel(s.confirmedStreak)} in Folge. Beeindruckend.` }
  }
  if (s.questsTotal > 0 && s.questsDone === s.questsTotal) {
    return { icon: 'military_tech', text: 'Alle deine Quests diese Woche geschafft — stark!' }
  }
  if (s.questsDone > 0) {
    return { icon: 'trending_up', text: `Schon ${s.questsDone} von ${s.questsTotal} Quests diese Woche — du bist gut unterwegs.` }
  }
  return { icon: 'waving_hand', text: 'Schön, dass du da bist. Ich sehe jeden Schritt, den du gehst — und jeder zählt.' }
}

/** Vala-Stimme (Bergführerin) — dieselben 7 Situationen, aber in ihrem
 *  Bergexpeditions-Ton. Erste ausformulierte Persönlichkeit für "Mein Guide";
 *  weitere Guides bekommen ihre eigene Stimme erst, sobald sie wählbar sind. */
const VALA_VOICE: GuideNoteVoice = s => {
  if (s.dutyKeptUp && s.dutyName) {
    return { icon: 'volunteer_activism', text: `Auf dich ist Verlass, wie auf ein gutes Seil: „${s.dutyName}“ hast du zuverlässig übernommen — die Klasse kann sich auf dich stützen.` }
  }
  if (s.broken) {
    return { icon: 'self_improvement', text: 'Deine Flamme ist gerade aus — auch auf dem Berg geht mal eine Rast nicht wie geplant. Morgen brechen wir einfach neu auf.' }
  }
  if (s.openHomeworkCount > 0) {
    const hw = s.openHomeworkCount === 1 ? 'Hausübung' : 'Hausübungen'
    return { icon: 'visibility', text: `Ich seh von hier oben noch ${s.openHomeworkCount} ${hw} vor dir liegen — ein Schritt nach dem anderen, du schaffst das.` }
  }
  if (s.confirmedStreak >= 5) {
    return { icon: 'local_fire_department', text: `${s.confirmedStreak} ${huLabel(s.confirmedStreak)} in Folge dabeigeblieben, das ist echte Ausdauer, wie bei einer guten Bergtour. Ich hab's gesehen.` }
  }
  if (s.questsTotal > 0 && s.questsDone === s.questsTotal) {
    return { icon: 'military_tech', text: 'Alle Etappen dieser Woche gemeistert — stark erklommen!' }
  }
  if (s.questsDone > 0) {
    return { icon: 'trending_up', text: `Schon ${s.questsDone} von ${s.questsTotal} Quests diese Woche geschafft — guter Fortschritt am Hang.` }
  }
  return { icon: 'waving_hand', text: 'Schön, dass du mit dabei bist. Ich behalte jeden deiner Schritte im Blick — und jeder bringt dich weiter.' }
}

/** ARI-Stimme (Bordcomputer) — dieselben 7 Situationen, aber knapp, technisch,
 *  in Systemmeldungen ("Status: …") statt warmer Bergführerin-Ansprache. */
const ARI_VOICE: GuideNoteVoice = s => {
  if (s.dutyKeptUp && s.dutyName) {
    return { icon: 'volunteer_activism', text: `Systemcheck „${s.dutyName}“: durchgehend grün. Verlässlichkeit dieser Größenordnung sehe ich selten, Crew-Mitglied.` }
  }
  if (s.broken) {
    return { icon: 'self_improvement', text: 'Statusmeldung: Kontrollleuchte erloschen. Kein Systemausfall, nur eine Unterbrechung — nächster Countdown startet, wann du willst.' }
  }
  if (s.openHomeworkCount > 0) {
    const hw = s.openHomeworkCount === 1 ? 'Aufgabe' : 'Aufgaben'
    return { icon: 'visibility', text: `Scanner zeigt noch ${s.openHomeworkCount} offene ${hw} an. Checkliste Punkt für Punkt — ich berechne bereits den Kurs danach.` }
  }
  if (s.confirmedStreak >= 5) {
    return { icon: 'local_fire_department', text: `${s.confirmedStreak} ${huLabel(s.confirmedStreak)} in Folge ohne Systemausfall protokolliert. Diese Werte, Crew-Mitglied, sind außergewöhnlich stabil.` }
  }
  if (s.questsTotal > 0 && s.questsDone === s.questsTotal) {
    return { icon: 'military_tech', text: 'Alle Missionsziele dieser Woche erfüllt. Log-Eintrag: einwandfreie Ausführung.' }
  }
  if (s.questsDone > 0) {
    return { icon: 'trending_up', text: `${s.questsDone} von ${s.questsTotal} Missionszielen abgeschlossen. Kurs stimmt, weiter so.` }
  }
  return { icon: 'waving_hand', text: 'Willkommen an Bord. Alle deine Schritte laufen über meine Sensoren — jeder einzelne zählt für die Mission.' }
}

/** Isla-Stimme (Kartografin) — dieselben 7 Situationen, neugierig-abenteuerlich,
 *  in Karten-/Spuren-Metaphern statt Berg- oder Bordcomputer-Sprache. */
const ISLA_VOICE: GuideNoteVoice = s => {
  if (s.dutyKeptUp && s.dutyName) {
    return { icon: 'volunteer_activism', text: `„${s.dutyName}“ hast du zuverlässig wie ein guter Kompass gehalten — auf so jemanden verlässt sich die ganze Expedition.` }
  }
  if (s.broken) {
    return { icon: 'self_improvement', text: 'Deine Spur ist gerade verweht — passiert selbst erfahrenen Schatzsucherinnen. Morgen zeichnen wir sie einfach neu.' }
  }
  if (s.openHomeworkCount > 0) {
    const hw = s.openHomeworkCount === 1 ? 'Spur' : 'Spuren'
    return { icon: 'visibility', text: `Auf meiner Karte sehe ich noch ${s.openHomeworkCount} unentdeckte ${hw} — folg ihnen einfach der Reihe nach, du bist näher dran, als du denkst.` }
  }
  if (s.confirmedStreak >= 5) {
    return { icon: 'local_fire_department', text: `${s.confirmedStreak} ${huLabel(s.confirmedStreak)} in Folge der Spur gefolgt, ohne abzubrechen, das ist echtes Entdeckerinnen-Talent. Ich hab's notiert.` }
  }
  if (s.questsTotal > 0 && s.questsDone === s.questsTotal) {
    return { icon: 'military_tech', text: 'Alle Spuren dieser Woche gefunden — die Schatzkammer steht euch offen!' }
  }
  if (s.questsDone > 0) {
    return { icon: 'trending_up', text: `Schon ${s.questsDone} von ${s.questsTotal} Spuren dieser Woche entdeckt — die Karte füllt sich.` }
  }
  return { icon: 'waving_hand', text: 'Schön, dass du mit auf Expedition bist. Ich behalte jede deiner Spuren im Blick — und jede führt uns weiter.' }
}

/** Guide-Stimmen nach Theme-Icon — derselbe Schlüssel wie GUIDE_PORTRAIT/
 *  SEASON_ART. Fehlt ein Eintrag, greift GENERIC_VOICE. */
/** Sprout-Stimme (Ranger-Drohne, Terra Nova) — kurz, aufgeregt, summend, alles
 *  in Wachstums-Bildern. Die jüngste Figur im Ensemble, redet schnell. */
const SPROUT_VOICE: GuideNoteVoice = s => {
  if (s.dutyKeptUp && s.dutyName) {
    return { icon: 'volunteer_activism', text: `„${s.dutyName}“, jeden Tag, ohne dass dich jemand erinnern muss! So wächst Vertrauen, genau so.` }
  }
  if (s.broken) {
    return { icon: 'self_improvement', text: 'Deine Flamme ist gerade aus. Auch im Ödland hat es lange gedauert, bis das erste Grün kam. Es kommt wieder.' }
  }
  if (s.openHomeworkCount > 0) {
    // „Samen" ist im Singular wie im Plural gleich, deshalb kein Ternär.
    return { icon: 'visibility', text: `Ich zähle noch ${s.openHomeworkCount} Samen in deiner Tasche, die noch nicht in der Erde sind. Einen nach dem anderen, dann wird das was.` }
  }
  if (s.confirmedStreak >= 5) {
    return { icon: 'local_fire_department', text: `${s.confirmedStreak} ${huLabel(s.confirmedStreak)} in Folge! Weißt du, was daraus wird, wenn man so beständig gießt? Ein ganzes Tal.` }
  }
  if (s.questsTotal > 0 && s.questsDone === s.questsTotal) {
    return { icon: 'military_tech', text: 'Alle Aufträge dieser Woche erledigt. Der Boden unter dir wird gerade richtig grün, ich sehe es!' }
  }
  if (s.questsDone > 0) {
    return { icon: 'trending_up', text: `Schon ${s.questsDone} von ${s.questsTotal} Aufträgen. Da sprießt was, ganz eindeutig.` }
  }
  return { icon: 'waving_hand', text: 'Schön, dass du da bist! Ich merke mir jeden einzelnen Trieb, auch den kleinsten.' }
}

/** Coralie-Stimme (Tiefsee-Expedition) — ruhig, aufmerksam, forscherisch warm.
 *  Nauto blinkt dazwischen, sie selbst bleibt sachlich und zugewandt. */
const CORALIE_VOICE: GuideNoteVoice = s => {
  if (s.dutyKeptUp && s.dutyName) {
    return { icon: 'volunteer_activism', text: `„${s.dutyName}“ hast du diese Woche zuverlässig übernommen. In der Tiefe hängt alles davon ab, dass jeder seinen Handgriff macht. Danke dafür.` }
  }
  if (s.broken) {
    return { icon: 'self_improvement', text: 'Deine Flamme ist gerade aus. Auch das beste Tauchboot muss zwischendurch auftauchen. Nimm Luft, dann geht es wieder hinunter.' }
  }
  if (s.openHomeworkCount > 0) {
    const hw = s.openHomeworkCount === 1 ? 'Aufgabe' : 'Aufgaben'
    return { icon: 'visibility', text: `Auf meinem Sonar sind noch ${s.openHomeworkCount} offene ${hw}. Kein Grund zur Eile, Schicht für Schicht kommt man am tiefsten.` }
  }
  if (s.confirmedStreak >= 5) {
    return { icon: 'local_fire_department', text: `${s.confirmedStreak} ${huLabel(s.confirmedStreak)} in Folge. Nauto blinkt gerade in einem Muster, das er sonst nur für seltene Funde reserviert.` }
  }
  if (s.questsTotal > 0 && s.questsDone === s.questsTotal) {
    return { icon: 'military_tech', text: 'Alle Ziele dieser Woche erreicht. Sauber getaucht, ohne einen einzigen Umweg.' }
  }
  if (s.questsDone > 0) {
    return { icon: 'trending_up', text: `${s.questsDone} von ${s.questsTotal} Zielen erreicht. Die Leuchtspur wird deutlicher.` }
  }
  return { icon: 'waving_hand', text: 'Willkommen an Bord. Hier unten zählt jede Bewegung, auch die ganz leise.' }
}

/** Chronist-Stimme (Chroniken der Zeit) — bedächtig, altmodisch höflich, alles
 *  in Seiten, Zeilen und Zeitaltern. Er notiert, statt zu loben. */
const CHRONIST_VOICE: GuideNoteVoice = s => {
  if (s.dutyKeptUp && s.dutyName) {
    return { icon: 'volunteer_activism', text: `Ich habe „${s.dutyName}“ in die Chronik eingetragen, an jedem einzelnen Tag dieser Woche. Solche Einträge halten sich lange.` }
  }
  if (s.broken) {
    return { icon: 'self_improvement', text: 'Deine Flamme ist gerade aus. In jeder Chronik, die ich kenne, gibt es leere Seiten. Sie machen die vollen erst lesbar.' }
  }
  if (s.openHomeworkCount > 0) {
    const hw = s.openHomeworkCount === 1 ? 'Seite' : 'Seiten'
    return { icon: 'visibility', text: `${s.openHomeworkCount} ${hw} in deinem Kapitel sind noch unbeschrieben. Eine nach der anderen, so entsteht jedes Buch.` }
  }
  if (s.confirmedStreak >= 5) {
    return { icon: 'local_fire_department', text: `${s.confirmedStreak} ${huLabel(s.confirmedStreak)} in Folge, ohne Unterbrechung. Ich habe es mir angestrichen, das kommt seltener vor, als du denkst.` }
  }
  if (s.questsTotal > 0 && s.questsDone === s.questsTotal) {
    return { icon: 'military_tech', text: 'Diese Woche ist vollständig verzeichnet. Kein Eintrag fehlt.' }
  }
  if (s.questsDone > 0) {
    return { icon: 'trending_up', text: `${s.questsDone} von ${s.questsTotal} Einträgen stehen bereits. Das Kapitel füllt sich.` }
  }
  return { icon: 'waving_hand', text: 'Schön, dass du hereinschaust. Ich schreibe alles auf, was du tust, auch das Kleine.' }
}

/** Finn-Stimme (Inselreich) — herzlich, handfest, laut. Redet in Tauen,
 *  Stegen und Wetter, packt lieber mit an, als lange zu erklären. */
const FINN_VOICE: GuideNoteVoice = s => {
  if (s.dutyKeptUp && s.dutyName) {
    return { icon: 'volunteer_activism', text: `„${s.dutyName}“ die ganze Woche durchgezogen! Auf so jemanden baue ich einen Hafen, ohne zweimal nachzufragen.` }
  }
  if (s.broken) {
    return { icon: 'self_improvement', text: 'Deine Flamme ist gerade aus. Stürme reißen mal einen Steg weg, das gehört dazu. Morgen legen wir die Bretter neu.' }
  }
  if (s.openHomeworkCount > 0) {
    const hw = s.openHomeworkCount === 1 ? 'Stein' : 'Steine'
    return { icon: 'visibility', text: `Da liegen noch ${s.openHomeworkCount} ${hw} für dich bereit. Einer nach dem anderen, und plötzlich steht die Mauer.` }
  }
  if (s.confirmedStreak >= 5) {
    return { icon: 'local_fire_department', text: `${s.confirmedStreak} ${huLabel(s.confirmedStreak)} in Folge. Das ist Bauen, wie ich es mag: nicht schnell, sondern verlässlich.` }
  }
  if (s.questsTotal > 0 && s.questsDone === s.questsTotal) {
    return { icon: 'military_tech', text: 'Alles fertig diese Woche. Das Tau sitzt, der Steg hält, gute Arbeit.' }
  }
  if (s.questsDone > 0) {
    return { icon: 'trending_up', text: `${s.questsDone} von ${s.questsTotal} geschafft. Das wird was, ich seh es schon.` }
  }
  return { icon: 'waving_hand', text: 'Da bist du ja. Jede Hand zählt hier, deine ganz besonders.' }
}

/** Nox-Stimme (Sternenkarte) — leise, staunend, fast flüsternd. Beobachtet
 *  lieber lange, als schnell zu urteilen. */
const NOX_VOICE: GuideNoteVoice = s => {
  if (s.dutyKeptUp && s.dutyName) {
    return { icon: 'volunteer_activism', text: `„${s.dutyName}“, jeden Tag zur selben Zeit. Genau so bewegen sich die Dinge, auf die am Himmel Verlass ist.` }
  }
  if (s.broken) {
    return { icon: 'self_improvement', text: 'Deine Flamme ist gerade aus. Auch ein Stern verschwindet manchmal hinter einer Wolke. Er ist deshalb nicht weg.' }
  }
  if (s.openHomeworkCount > 0) {
    const hw = s.openHomeworkCount === 1 ? 'Stelle' : 'Stellen'
    return { icon: 'visibility', text: `An ${s.openHomeworkCount} ${hw} deines Himmels ist es noch dunkel. Zünde sie an, wann du magst, ich schaue solange weiter.` }
  }
  if (s.confirmedStreak >= 5) {
    return { icon: 'local_fire_department', text: `${s.confirmedStreak} ${huLabel(s.confirmedStreak)} in Folge. Wenn Lichter so regelmäßig aufgehen, ergeben sie irgendwann ein Bild.` }
  }
  if (s.questsTotal > 0 && s.questsDone === s.questsTotal) {
    return { icon: 'military_tech', text: 'Alle Punkte dieser Woche leuchten. Von hier oben sieht das wunderschön aus.' }
  }
  if (s.questsDone > 0) {
    return { icon: 'trending_up', text: `${s.questsDone} von ${s.questsTotal} Lichtern brennen schon. Das Muster wird erkennbar.` }
  }
  return { icon: 'waving_hand', text: 'Schön, dass du da bist. Ich sehe auch die schwachen Lichter, keine Sorge.' }
}

/** Tüftel-Stimme (Werkstatt der Erfinder) — schwungvoll, praktisch, immer
 *  mitten in einer Reparatur. Denkt in Bauteilen und Handgriffen. */
const TUEFTEL_VOICE: GuideNoteVoice = s => {
  if (s.dutyKeptUp && s.dutyName) {
    return { icon: 'volunteer_activism', text: `„${s.dutyName}“, jeden Tag geölt und nachgezogen. So läuft eine Werkstatt, und so läuft eine Klasse.` }
  }
  if (s.broken) {
    return { icon: 'self_improvement', text: 'Deine Flamme ist gerade aus. Kein Drama, an meiner Werkbank stottert ständig was. Man setzt sich hin und macht weiter.' }
  }
  if (s.openHomeworkCount > 0) {
    const hw = s.openHomeworkCount === 1 ? 'Bauteil' : 'Bauteile'
    return { icon: 'visibility', text: `Auf deiner Werkbank liegen noch ${s.openHomeworkCount} ${hw}. Nimm dir das nächste, der Rest ergibt sich.` }
  }
  if (s.confirmedStreak >= 5) {
    return { icon: 'local_fire_department', text: `${s.confirmedStreak} ${huLabel(s.confirmedStreak)} in Folge, ohne dass etwas hakt. Diese Laufruhe kriegt man nicht geschenkt.` }
  }
  if (s.questsTotal > 0 && s.questsDone === s.questsTotal) {
    return { icon: 'military_tech', text: 'Alles zusammengebaut diese Woche. Sie läuft, hörst du das?' }
  }
  if (s.questsDone > 0) {
    return { icon: 'trending_up', text: `${s.questsDone} von ${s.questsTotal} Teilen sitzen. Da dreht sich schon was.` }
  }
  return { icon: 'waving_hand', text: 'Komm rein. Jeder Handgriff zählt hier, auch der, den keiner sieht.' }
}

/** Wächterin-Stimme (Der Weltenbaum) — sanft, langsam, ohne Eile. Sie
 *  bewertet nichts, sie bemerkt nur. Die wärmste Stimme im Ensemble. */
const WAECHTERIN_VOICE: GuideNoteVoice = s => {
  if (s.dutyKeptUp && s.dutyName) {
    return { icon: 'volunteer_activism', text: `„${s.dutyName}“, jeden Tag dieser Woche. Wurzeln wachsen genau so: unsichtbar und ohne Aufhebens.` }
  }
  if (s.broken) {
    return { icon: 'self_improvement', text: 'Deine Flamme ist gerade aus. Jeder Baum, den ich kenne, hat Jahre, in denen er ruht. Danach treibt er umso kräftiger.' }
  }
  if (s.openHomeworkCount > 0) {
    const hw = s.openHomeworkCount === 1 ? 'Knospe' : 'Knospen'
    return { icon: 'visibility', text: `An deinem Ast warten noch ${s.openHomeworkCount} ${hw}. Sie öffnen sich, wenn du bereit bist, nicht früher.` }
  }
  if (s.confirmedStreak >= 5) {
    return { icon: 'local_fire_department', text: `${s.confirmedStreak} ${huLabel(s.confirmedStreak)} in Folge. Ich habe viele Jahresringe gesehen, und ich erkenne einen guten, wenn er entsteht.` }
  }
  if (s.questsTotal > 0 && s.questsDone === s.questsTotal) {
    return { icon: 'military_tech', text: 'Diese Woche ist vollständig aufgeblüht. Jedes einzelne Blatt.' }
  }
  if (s.questsDone > 0) {
    return { icon: 'trending_up', text: `${s.questsDone} von ${s.questsTotal} Blättern sind schon da. Der Ast trägt.` }
  }
  return { icon: 'waving_hand', text: 'Schön, dich zu sehen. Ich habe Zeit, und ich sehe alles, was wächst.' }
}

/** Sonnenhafen-Stimme (alle Guides gemeinsam, Juli und August) — der Chor am
 *  Ende der Reise. Fordert nichts mehr, weil im Epilog nichts mehr ansteht. */
const SONNENHAFEN_VOICE: GuideNoteVoice = s => {
  if (s.dutyKeptUp && s.dutyName) {
    return { icon: 'volunteer_activism', text: `„${s.dutyName}“ hast du übernommen, sogar jetzt noch. Typisch, sagt Finn, und alle nicken.` }
  }
  if (s.broken) {
    return { icon: 'self_improvement', text: 'Deine Flamme ist gerade aus, und das ist im Sonnenhafen völlig in Ordnung. Hier wird geruht, nicht gerechnet.' }
  }
  if (s.confirmedStreak >= 5) {
    return { icon: 'local_fire_department', text: `${s.confirmedStreak} ${huLabel(s.confirmedStreak)} in Folge, bis hierher. Vala hebt den Becher, ARI blinkt zustimmend.` }
  }
  return { icon: 'waving_hand', text: 'Ihr seid angekommen. Setz dich zu uns, die Sonne steht gut und die nächste Reise wartet noch eine Weile.' }
}

const GUIDE_VOICES: Partial<Record<string, GuideNoteVoice>> = {
  landscape: VALA_VOICE,
  rocket_launch: ARI_VOICE,
  map: ISLA_VOICE,
  eco: SPROUT_VOICE,
  water: CORALIE_VOICE,
  history_edu: CHRONIST_VOICE,
  anchor: FINN_VOICE,
  auto_awesome: NOX_VOICE,
  precision_manufacturing: TUEFTEL_VOICE,
  park: WAECHTERIN_VOICE,
  wb_sunny: SONNENHAFEN_VOICE,
}

/** `guideIcon` bestimmt, wessen Stimme spricht — bei "Mein Guide" der
 *  persönlich gewählte (falls freigeschaltet), sonst der Guide der aktuell
 *  laufenden Klassenwelt (siehe resolveGuideTheme in app-Seiten). */
export function buildGuideNote(s: GuideNoteSignals, guideIcon?: string): GuideNote {
  const voice = (guideIcon && GUIDE_VOICES[guideIcon]) || GENERIC_VOICE
  return voice(s)
}

// ─── Chronik / Logbuch ───────────────────────────────────────────────────────
// Zusammengeführte, datierte Ereignisliste: Meilensteine + eingesetzte Items
// (Schutzschild/Zeitkristall) + abgeschlossene Quests/Gilden-Quests/Klassenziele
// (= das Quest-Logbuch, Cluster A) + aktuell erloschene Flamme. Absteigend.

export type ChronicleKind = 'milestone' | 'shield' | 'crystal' | 'break' | 'weekly_seal' | 'sign_awakened' | 'world_done' | AchievementKind

export interface ChronicleEntry {
  kind: ChronicleKind
  label: string
  note?: string
  /** ISO-Zeitstempel (oder YYYY-MM-DD…) — nur für Sortierung + Anzeige. */
  date: string
}

/** Wie viele Wochen in Folge das Wochensiegel bis inkl. `period` errungen
 *  wurde (rückwärts über volle 7-Tage-Sprünge, `period` = week_start). */
function weeklySealStreakAt(period: string, allPeriods: Set<string>): number {
  let count = 0
  let cursor = period
  while (allPeriods.has(cursor)) {
    count++
    cursor = addDaysISO(-7, new Date(`${cursor}T00:00:00`))
  }
  return count
}

export function buildChronicle(input: {
  milestones: { milestone: number; confirmed_at: string }[]
  shieldUses: { created_at: string }[]
  crystalUses: { created_at: string }[]
  /** Protokollierte Erfolge (achievements-Tabelle) fürs Quest-Logbuch —
   *  `period` (week_start/season) wird für die Wochensiegel-Serie gebraucht. */
  achievements?: { kind: AchievementKind; key: string; period: string; achieved_at: string }[]
  brokenNow: boolean
  today: string
}): ChronicleEntry[] {
  const out: ChronicleEntry[] = []
  for (const m of input.milestones) {
    out.push({
      kind: 'milestone',
      label: `${m.milestone} HÜ in Folge`,
      note: m.milestone === VETERAN_MILESTONE ? 'Meistersiegel' : undefined,
      date: m.confirmed_at,
    })
  }
  for (const s of input.shieldUses) out.push({ kind: 'shield', label: 'Schutzschild eingesetzt', date: s.created_at })
  for (const c of input.crystalUses) out.push({ kind: 'crystal', label: 'Zeitkristall eingesetzt', date: c.created_at })

  // Wochensiegel-Perioden vorab sammeln, damit jede Chronik-Zeile ihre
  // Serienlänge kennt (wie viele Wochen in Folge bis zu genau dieser Woche).
  const weeklySealPeriods = new Set(
    (input.achievements ?? []).filter(a => a.kind === 'quest' && a.key === WEEKLY_SEAL_KEY).map(a => a.period)
  )

  for (const a of input.achievements ?? []) {
    if (a.kind === 'quest' && a.key === WEEKLY_SEAL_KEY) {
      const streak = weeklySealStreakAt(a.period, weeklySealPeriods)
      out.push({
        kind: 'weekly_seal',
        label: 'Wochensiegel — alle Quests geschafft',
        note: streak >= 2 ? `${streak}. Woche in Folge` : undefined,
        date: a.achieved_at,
      })
    } else if (a.kind === 'quest' && a.key === SIGN_AWAKENED_KEY) {
      // `period` trägt hier den Welt-Icon-Schlüssel (siehe collectAchievements).
      const sign = SPLITTER_SIGNS.find(x => x.worldIcon === a.period)
      out.push({
        kind: 'sign_awakened',
        label: sign ? `${sign.label} ist erwacht` : 'Ein Zeichen ist erwacht',
        note: sign?.worldName,
        date: a.achieved_at,
      })
    } else if (a.kind === 'quest' && a.key === WORLD_DONE_KEY) {
      const arc = SCHOOL_YEAR_ARCS.find(x => x.icon === a.period)
      out.push({
        kind: 'world_done',
        label: arc ? `${arc.name} abgeschlossen` : 'Eine Welt abgeschlossen',
        note: arc?.guide,
        date: a.achieved_at,
      })
    } else if (a.kind === 'quest') {
      out.push({ kind: 'quest', label: findQuestTemplate(a.key)?.title ?? 'Wochen-Quest geschafft', date: a.achieved_at })
    } else if (a.kind === 'guild_quest') {
      out.push({ kind: 'guild_quest', label: findGuildQuestTemplate(a.key)?.title ?? 'Gilden-Quest geschafft', note: 'Gilde', date: a.achieved_at })
    } else if (a.kind === 'riddle') {
      out.push({ kind: 'riddle', label: findRiddle(a.key)?.itemLabel ?? 'Rätsel gelöst', note: 'Rätsel', date: a.achieved_at })
    } else {
      out.push({ kind: 'class_goal', label: 'Klassenziel erreicht', note: 'ganze Klasse', date: a.achieved_at })
    }
  }
  // Aktuell gerissene Flamme als jüngstes Ereignis (Ende des heutigen Tages,
  // damit es über heutige Meilensteine sortiert). Nur der Ist-Zustand — es gibt
  // (bewusst) kein persistiertes Historien-Log gerissener Streaks.
  if (input.brokenNow) out.push({ kind: 'break', label: 'Flamme erloschen', date: `${input.today}T23:59:59` })

  out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  return out
}
