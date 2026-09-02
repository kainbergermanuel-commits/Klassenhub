import type { QuestFocusTag } from './questVault'

/** Kindgerechte Erklärung des Wochen-Fokus, abrufbar über die Fokus-Pille auf
 *  der Quest-Karte.
 *
 *  Bewusst als kleine Szene statt als Definition: ein abstraktes Wort wie
 *  "Verantwortung" bleibt für ein Kind leer, ein Bild bleibt hängen. Danach
 *  eine Zeile, was es im Schulalltag konkret heisst, und ein Beispiel, das
 *  sich heute umsetzen lässt.
 *
 *  Bewusst guide-neutral formuliert: der Fokus rotiert wöchentlich und
 *  unabhängig von der Welt, der Text muss also in allen elf Welten passen
 *  (siehe lib/seasonTheme.ts).
 *
 *  Der Ton beschreibt, er ermahnt nicht. Kein "du sollst", kein "denk daran" —
 *  das wäre kontrollierende Sprache und arbeitet gegen die Autonomie, auf der
 *  das ganze Quest-System aufgebaut ist. */
export interface FocusInfo {
  /** Überschrift im Popup, z.B. "Aufmerksamkeit bedeutet …". */
  title: string
  /** Material-Symbol, passend zum Bild der Geschichte. */
  icon: string
  /** Die kleine Szene. Zwei bis drei Sätze. */
  story: string
  /** Was es im Schulalltag heisst. Ein Satz. */
  meaning: string
  /** Etwas, das sich heute tun lässt. */
  example: string
}

export const QUEST_FOCUS_INFO: Record<QuestFocusTag, FocusInfo> = {
  puenktlichkeit: {
    title: 'Pünktlichkeit bedeutet …',
    icon: 'schedule',
    story: 'Ihr seid um vier beim Platz verabredet. Sechs stehen da, einer fehlt. Ihr wartet zehn Minuten, dann zwanzig. Als er kommt, ist die Lust schon weg und es wird langsam dunkel.',
    meaning: 'Pünktlich zu sein heisst nicht, schnell zu sein. Es heisst, dass die anderen mit dir rechnen können.',
    example: 'Die Hausübung am Vorabend einpacken statt in der Früh zu suchen.',
  },
  ausdauer: {
    title: 'Ausdauer bedeutet …',
    icon: 'trending_up',
    story: 'Niemand kann am ersten Tag jonglieren. Die Bälle fallen, immer wieder. Wer jeden Tag fünf Minuten übt, fängt nach zwei Wochen den dritten Ball. Wer einmal eine Stunde übt und dann aufhört, fängt gar keinen.',
    meaning: 'Ausdauer heisst, dranzubleiben, wenn es gerade nicht spannend ist. Viele kleine Male schlagen ein grosses Mal.',
    example: 'Jeden Tag ein Stück machen statt alles am Sonntagabend.',
  },
  verantwortung: {
    title: 'Verantwortung bedeutet …',
    icon: 'volunteer_activism',
    story: 'Auf einem Schiff hat jeder eine Aufgabe. Eine davon ist, abends das Tau am Steg festzumachen. Es sieht niemand zu, es dauert zwanzig Sekunden. Macht es einer nicht, ist am Morgen das Schiff weg.',
    meaning: 'Verantwortung heisst, deinen Teil zu machen, auch wenn niemand hinschaut und niemand nachfragt.',
    example: 'Den Dienst der Woche erledigen, ohne dass jemand erinnern muss.',
  },
  zusammenhalt: {
    title: 'Zusammenhalt bedeutet …',
    icon: 'diversity_3',
    story: 'Ein einzelner Faden reisst, wenn du daran ziehst. Dreissig Fäden nebeneinander sind ein Seil, das ein Boot hält. Kein Faden ist stärker geworden, sie liegen nur zusammen.',
    meaning: 'Zusammenhalt heisst, dass es der Klasse besser geht, wenn jeder ab und zu auf jemand anderen schaut.',
    example: 'Jemandem eine Aufgabe erklären, die du selbst schon verstanden hast.',
  },
  aufmerksamkeit: {
    title: 'Aufmerksamkeit bedeutet …',
    icon: 'visibility',
    story: 'Zwei gehen denselben Weg zur Schule. Der eine kommt an und weiss nichts. Der andere hat gesehen, dass beim Nachbarhaus ein Zettel hängt: der Hund wird vermisst. Am Nachmittag findet er ihn beim Bach.',
    meaning: 'Aufmerksamkeit heisst, etwas zu bemerken, bevor dich jemand darauf stösst. Man braucht dafür keine besonderen Augen, nur den Blick, der kurz hängen bleibt.',
    example: 'Die Erinnerung der Lehrkraft lesen, bevor der Tag anfängt.',
  },
}
