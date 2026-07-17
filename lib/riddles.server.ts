/** Server-only: die richtigen Antworten zu den Rätseln aus lib/riddles.ts.
 *  Bewusst getrennt gehalten und NUR von der Server-Action solveQuestRiddle.ts
 *  importiert — solange keine 'use client'-Datei dieses Modul importiert, landet
 *  es nicht im Client-Bundle, und die Lösung bleibt verborgen (das Kind soll sie
 *  in der Story finden, nicht im Quelltext).
 *
 *  ⚠️ NICHT aus Client-Komponenten importieren. */

/** riddle_key → korrekte Antwort. Bei multiple_choice der Options-Key; bei
 *  password ein oder mehrere akzeptierte Lösungswörter (Array = jede Variante
 *  gilt, nach Normalisierung). */
const CORRECT_ANSWER: Record<string, string | string[]> = {
  arc_landscape_gipfel: 'licht',
  arc_rocket_launch_summen: 'summen',
  arc_map_splitter: 'splitter',
  splitter_teil2: ['splitter', 'der splitter', 'ein splitter', 'splitterstein'],
}

/** riddle_key → korrekte Reihenfolge der Fragment-Keys (kind='fragment_order').
 *  Interne Keys, kein Freitext — daher exakter Vergleich statt Normalisierung. */
const CORRECT_ORDER: Record<string, string[]> = {
  splitter_teil1: ['berg', 'all', 'dschungel'],
}

/** Großzügige Normalisierung, damit ein Tippfehler bei Freitext-Rätseln nicht
 *  frustet (Groß/Klein, Umlaute, Rand-Leerzeichen, ß). Bei multiple_choice
 *  vergleicht sie schlicht die Options-Keys. */
function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss')
    .replace(/\s+/g, ' ')
}

/** Prüft eine eingereichte Antwort server-seitig. Kein Werfen bei Falsch —
 *  der Aufrufer entscheidet über eine sanfte Rückmeldung (kein Beschämen,
 *  unbegrenzte Versuche).
 *
 *  Bei fragment_order-Rätseln übergibt der Client die gewählte Reihenfolge
 *  als kommagetrennte Fragment-Keys (z.B. "berg,all,dschungel") — exakter
 *  Vergleich, keine Normalisierung (interne Keys, kein Freitext). */
export function checkRiddleAnswer(riddleKey: string, submitted: string): boolean {
  const order = CORRECT_ORDER[riddleKey]
  if (order) {
    const given = submitted.split(',').map(s => s.trim()).filter(Boolean)
    return given.length === order.length && given.every((k, i) => k === order[i])
  }

  const correct = CORRECT_ANSWER[riddleKey]
  if (!correct) return false
  const accepted = Array.isArray(correct) ? correct : [correct]
  const given = normalize(submitted)
  return accepted.some(a => normalize(a) === given)
}
