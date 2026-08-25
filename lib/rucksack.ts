import { isArcUnlocked } from '@/lib/seasonTheme'

/** Alle Signale, aus denen sich der Rucksack-Zustand ergibt — bewusst rein
 *  primitiv/serialisierbar, damit die Items sowohl in der Rucksack-Card
 *  (/streaks) als auch im Heldenbuch-Overlay (Startseite) gerendert werden
 *  können, ohne die Berechnung zu duplizieren. */
export interface RucksackState {
  /** Name der aktuell laufenden Welt (getSeasonTheme(...).name) — entscheidet,
   *  welche Items die Reise überhaupt schon hergegeben hat. Ohne das bekam ein
   *  Kind im September feierlich ein Zeichen überreicht, dessen Herkunftszeile
   *  eine Figur nennt, die es erst Monate später trifft. */
  currentThemeName: string
  broken: boolean
  jokerAvailable: boolean
  jokerUsedThisSeason: boolean
  /** Zeitkristall: zweites, unabhängiges 1x/Season-Werkzeug bei gerissener
   *  Streak — verlängert die Frist, statt den Tag zu überbrücken. */
  crystalAvailable: boolean
  crystalUsedThisSeason: boolean
  /** Botenfeder: kanonischer, vordefinierter Eltern-Hinweis (kein Freitext) —
   *  max. 1x/Tag, nur wenn etwas offen ist. */
  pendingConfirmationCount: number
  nudgeSentToday: boolean
  veteranEarned: boolean
  confirmedStreak: number
  totalAchievements: number
  guildName: string | null
  parentConfirmStreak: number
  nextStepHint: string | null
  /** Laterne der Klasse — das einzige kollektive Item: identisch für alle
   *  Kinder der Klasse, gespeist aus dem laufenden Klassenziel. */
  classGoalTarget: number | null
  classGoalDone: number
  /** Der Splitter (roter Faden, siehe docs/2026-07-story-welten.html) — ab
   *  Schatzsuche/November gefunden, seine 7 Zeichen erwachen automatisch mit
   *  dem Fahrplan (siehe lib/seasonTheme.ts splitterFound/awakenedSignCount). */
  splitterFound: boolean
  awakenedSignCount: number
  /** Items, deren Erwerbs-Moment die Schüler:in schon gesehen hat (siehe
   *  supabase/feature-rucksack-seen.sql + components/streaks/NewItemAnnounce).
   *  `null` = Tabelle nicht lesbar (z.B. Migration noch nicht eingespielt) —
   *  dann wird gar nichts angekündigt, statt bei jedem Laden erneut zu feiern. */
  seenItemKeys: string[] | null
}

/** Stabile Schlüssel — auch Primärschlüssel in `rucksack_item_seen`.
 *  Niemals umbenennen, sonst taucht ein längst gefundenes Item erneut als
 *  „neu" auf. */
export type RucksackItemKey =
  | 'schild' | 'kristall' | 'botenfeder' | 'kompass'
  | 'meistersiegel' | 'wappen' | 'amulett' | 'gildenbanner' | 'laterne' | 'splitter'

export interface RucksackLore {
  key: RucksackItemKey
  title: string
  /** Woher das Item stammt, in der Stimme der Guide-Figur, die es übergeben
   *  hat. Trägt die Game-Fiction-Ebene, die reine Mechanik-Items nicht haben —
   *  ein Satz pro Item, bewusst ohne eigenes Datenmodell. */
  origin: string
  /** Wer spricht — für den Erwerbs-Moment (NewItemAnnounce). */
  guide: string
  /** Material-Symbol + Verlauf für den Erwerbs-Moment. Die Kacheln in
   *  RucksackItems rendern ihre Icons weiterhin selbst (Schild/Kristall als
   *  Inline-SVG), hier steht nur, was das Overlay zum Zeichnen braucht. */
  icon: string
  gradient: string
}

export const RUCKSACK_LORE: Record<RucksackItemKey, RucksackLore> = {
  schild: {
    key: 'schild',
    icon: 'shield_lock',
    gradient: 'linear-gradient(135deg, #3DB5AC, #0F8A82)',
    title: 'Schutzschild',
    guide: 'Bergführerin Vala',
    origin: 'Vala schnallte es dir am ersten Morgen auf den Rucksack: „Wer nie stolpert, ist nie weit gegangen. Dafür ist es da."',
  },
  kristall: {
    key: 'kristall',
    icon: 'diamond',
    gradient: 'linear-gradient(135deg, #C084E8, #9C5FD1)',
    title: 'Zeitkristall',
    guide: 'Bordcomputer ARI',
    origin: 'ARI reichte ihn dir durch die Luke, ohne aufzublicken: „Zeit ist im All eine Verhandlungssache. Nutze ihn, wenn dir eine fehlt."',
  },
  botenfeder: {
    key: 'botenfeder',
    icon: 'mail',
    gradient: 'linear-gradient(135deg, #F0A868, #D97B3D)',
    title: 'Botenfeder',
    guide: 'Kartografin Isla',
    origin: 'Isla zog sie aus ihrem Hut: „Eine Nachricht kommt weiter als ein Ruf. Auch bis nach Hause."',
  },
  kompass: {
    key: 'kompass',
    icon: 'explore',
    gradient: 'linear-gradient(135deg, #3DB5AC, #0F8A82)',
    title: 'Kompass des Mentors',
    guide: 'Bergführerin Vala',
    origin: 'Vala legte ihn dir am Fuß des Berges in die Hand: „Er zeigt dir nie, wer weiter ist. Nur, wo du hin willst."',
  },
  meistersiegel: {
    key: 'meistersiegel',
    icon: 'workspace_premium',
    gradient: 'linear-gradient(135deg, #E0A94B, #B8721E)',
    title: 'Meistersiegel',
    guide: 'Bergführerin Vala',
    origin: 'Vala drückt es erst denen in die Hand, die den Weg lange genug allein gefunden haben.',
  },
  wappen: {
    key: 'wappen',
    icon: 'shield',
    gradient: 'linear-gradient(135deg, #8791dd, #5965B8)',
    title: 'Wappen-Fragment',
    guide: 'Kartografin Isla',
    origin: 'Isla sagt, jedes Wappen entstehe rückwärts — erst die Taten, dann das Zeichen dafür.',
  },
  amulett: {
    key: 'amulett',
    icon: 'favorite',
    gradient: 'linear-gradient(135deg, #E285A0, #C15B76)',
    title: 'Verbündeten-Amulett',
    guide: 'Bergführerin Vala',
    origin: 'Vala gab es dir am Abend vor dem Aufbruch: „Wer oben steht, hat immer jemanden, der unten wartet. Das hier erinnert dich daran."',
  },
  gildenbanner: {
    key: 'gildenbanner',
    icon: 'diversity_3',
    gradient: 'linear-gradient(135deg, #7FD3A6, #2E9C6E)',
    title: 'Gildenbanner',
    guide: 'Bergführerin Vala',
    origin: 'Vala teilt die Seilschaften jeden Monat neu ein: „Am Berg hängt man aneinander. Wer, das wechselt. Dass man hängt, nicht."',
  },
  laterne: {
    key: 'laterne',
    icon: 'wb_incandescent',
    gradient: 'linear-gradient(135deg, #FFD98A, #E8A33D)',
    title: 'Laterne der Klasse',
    guide: 'Die ganze Klasse',
    origin: 'Diese Laterne hat euch niemand gegeben. Ihr habt sie am ersten Morgen im Basislager gemeinsam angezündet, und seitdem trägt sie abwechselnd jemand anderes.',
  },
  splitter: {
    key: 'splitter',
    icon: 'diamond',
    gradient: 'linear-gradient(135deg, #F5C842, #B8721E)',
    title: 'Splitter',
    guide: 'Kartografin Isla',
    origin: 'Isla hob ihn aus der Schatzkammer und legte ihn dir wortlos hin — sie wusste selbst nicht, was er ist.',
  },
}

/** Items, die eine Schüler:in gerade tatsächlich besitzt und für die es einen
 *  Erwerbs-Moment gibt. Die vier Werkzeuge sind bewusst NICHT dabei: sie sind
 *  Grundausrüstung und gehören von Anfang an allen — es wäre eine leere
 *  Feier. Gefeiert wird nur, was auf der Reise dazukommt. */
export function earnedItemKeys(state: RucksackState): RucksackItemKey[] {
  const keys: RucksackItemKey[] = []
  if (state.veteranEarned) keys.push('meistersiegel')
  // Das Wappen-Fragment stammt von Isla und kann daher frühestens ab ihrer
  // Welt (Schatzsuche/November) übergeben werden. Schutzschild, Kompass,
  // Amulett, Gildenbanner und Laterne brauchen kein solches Tor: ihre
  // Mechaniken laufen ab September, deshalb wurde stattdessen ihre
  // Herkunftszeile auf den Reisebeginn umgeschrieben.
  if (state.totalAchievements >= WAPPEN_TARGET && isArcUnlocked('map', state.currentThemeName)) keys.push('wappen')
  if (state.parentConfirmStreak >= 1) keys.push('amulett')
  if (state.guildName) keys.push('gildenbanner')
  if (state.classGoalTarget !== null && state.classGoalDone >= state.classGoalTarget) keys.push('laterne')
  if (state.splitterFound) keys.push('splitter')
  return keys
}

/** Was die Schüler:in besitzt, aber noch nie präsentiert bekommen hat. Ohne
 *  belastbare Buchhaltung (seenItemKeys === null) wird bewusst nichts gezeigt:
 *  ein Erwerbs-Moment, der sich wiederholt, ist schlimmer als keiner. */
export function unseenItemKeys(state: RucksackState): RucksackItemKey[] {
  if (state.seenItemKeys === null) return []
  const seen = new Set(state.seenItemKeys)
  return earnedItemKeys(state).filter(k => !seen.has(k))
}

/** Ab wie vielen Erfolgen das Wappen-Fragment als verdient gilt. Muss zu
 *  TOTAL_CELLS in components/home/WappenMosaic.tsx passen: dort füllen 14
 *  Splitter das Schild. Vorher stand hier 3, wodurch der Rucksack „Verdient"
 *  meldete, während das Mosaik daneben „3 von 14 Splittern" zeigte. */
export const WAPPEN_TARGET = 14

/** Fortschritts- statt Defizit-Sprache: zeigt, wie weit jemand gekommen ist,
 *  nie, wie weit er zurückliegt. Unterhalb von QUIET_THRESHOLD wird die Zahl
 *  ganz weggelassen — „3 von 15" hilft niemandem, den sie entmutigt. */
const QUIET_THRESHOLD = 0.25

export function progressLabel(done: number, target: number, unit: string, quietText: string): string {
  if (target <= 0) return quietText
  if (done / target < QUIET_THRESHOLD) return quietText
  return `${Math.min(done, target)} von ${target} ${unit}`
}
