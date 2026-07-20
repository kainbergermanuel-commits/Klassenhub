/** Farbe des Klassen-Chips ("4a") im persönlichen Lehrer-Stundenplan.
 *
 *  Abgrenzung zur Fachfarbe: Die Fachfarbe kommt unverändert aus dem
 *  Admin-Katalog (E = blau, überall in der App gleich) und bleibt die
 *  Identität des FACHS. Diese Farbe hier ist die Identität der KLASSE —
 *  damit E 3a und E 4b auf einen Blick unterscheidbar sind, obwohl beide
 *  dasselbe Fach-Blau tragen.
 *
 *  Warum kein reiner Hash: Bei realistischen Labels (1a…5d) auf eine
 *  Palette dieser Größe sind Kollisionen nicht selten, sondern nach dem
 *  Schubfachprinzip unvermeidbar — im ersten Entwurf bekamen prompt "3a"
 *  und "4b" denselben Ton, also ausgerechnet zwei Klassen, die unterschieden
 *  werden sollen. Deshalb vergeben wir die Farben über den GESAMTEN
 *  Label-Bestand des Plans:
 *
 *    1. Der Hash liefert die Wunschfarbe eines Labels.
 *    2. Ist die schon vergeben, rückt das Label auf die nächste freie.
 *
 *  Ergebnis: garantiert verschiedene Farben, solange die Palette reicht.
 *
 *  ⚠️ Bekannte Grenze: Kommt eine Klasse dazu, die dieselbe Wunschfarbe hat
 *  wie eine bestehende, gewinnt die alphabetisch frühere und die andere rückt
 *  weiter — "4b" wechselt also die Farbe, sobald "4a" angelegt wird. Ohne
 *  gespeicherte Zuordnung ist das nicht vermeidbar: die Funktion weiß nicht,
 *  wer zuerst da war. Nicht kollidierende Labels bleiben unberührt. */

/** Zehn kräftige, untereinander gut unterscheidbare Töne. Alle dunkel genug,
 *  um als fetter 9–11px-Text auf hellem Grund lesbar zu bleiben. */
const CLASS_CHIP_COLORS = [
  '#0F8A82', // Teal
  '#C2564B', // Ziegelrot
  '#7A6BA8', // Violett
  '#4A8FB0', // Stahlblau
  '#B9791A', // Gold
  '#3F8F5B', // Laubgrün
  '#B5527F', // Magenta
  '#5C6BC0', // Indigo
  '#546E7A', // Schiefer — bewusst neutral statt eines weiteren Braun-/Goldtons,
             // der sich bei 9px nicht mehr von "Gold" unterscheiden ließ.
  '#6E8B1F', // Oliv
] as const

const norm = (label: string) => label.trim().toLowerCase()

function hashOf(key: string): number {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return h
}

/** Vergibt jedem vorkommenden Klassen-Label eine eigene Farbe.
 *
 *  Alle Ansichten (Editor-Raster, Tages-, Wochenansicht) leiten die Zuordnung
 *  aus DEMSELBEN Bestand ab — dem kompletten Stundenplan der Lehrperson —
 *  und kommen deshalb ohne Absprache auf dieselben Farben. */
export function buildClassColorMap(labels: string[]): Map<string, string> {
  const unique = [...new Set(labels.map(norm).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'de'))
  const taken = new Set<number>()
  const map = new Map<string, string>()

  for (const label of unique) {
    let i = hashOf(label) % CLASS_CHIP_COLORS.length
    // Lineares Sondieren bis zur nächsten freien Farbe. Sind mehr Klassen als
    // Farben im Spiel, bricht die Schleife ab und Farben wiederholen sich —
    // der Chip trägt den Text ohnehin, die Farbe ist die Scan-Hilfe.
    for (let step = 0; step < CLASS_CHIP_COLORS.length && taken.has(i); step++) {
      i = (i + 1) % CLASS_CHIP_COLORS.length
    }
    taken.add(i)
    map.set(label, CLASS_CHIP_COLORS[i])
  }
  return map
}

/** Nachschlagen im Ergebnis von buildClassColorMap. */
export function classColorFrom(map: Map<string, string>, label: string): string {
  return map.get(norm(label)) ?? CLASS_CHIP_COLORS[0]
}
