/** Schriftgröße für ein Fachkürzel in einer Stundenplan-Zelle.
 *
 *  Die Zellen liegen in einer `table-fixed`-Tabelle: Eine Spalte ist auf
 *  Mobile nur rund 55 px breit. Kurze Kürzel ("D", "M") sollen dort groß
 *  stehen, lange Lerngruppen-Kürzel wie "DGB/F4L2" haben aber keinen Platz
 *  und schoben die Tabelle bisher um ein paar Millimeter auseinander.
 *  Deshalb hängt die Größe an der Länge, nicht an der Zelle. */
export function subjectShortStyle(short: string): { fontSize: number; letterSpacing?: string } {
  const len = short.length
  if (len <= 3) return { fontSize: 12 }
  if (len <= 5) return { fontSize: 11, letterSpacing: '-0.02em' }
  if (len <= 7) return { fontSize: 9.5, letterSpacing: '-0.03em' }
  return { fontSize: 8.5, letterSpacing: '-0.03em' }
}

/** Klassen, die zusätzlich verhindern, dass ein überlanges Kürzel die Spalte
 *  sprengt: Umbruch auch mitten im Wort, kompakte Zeilen, harter Abschnitt. */
export const SUBJECT_SHORT_CLASSES = 'break-all leading-[1.1] overflow-hidden'
