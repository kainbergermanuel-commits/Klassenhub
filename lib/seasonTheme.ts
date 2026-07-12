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
    stages: [
      { label: 'Basislager', icon: 'cottage', story: 'Willkommen im Basislager! Die Zelte stehen, die Route ist gesteckt. Jede erledigte Hausübung ist ein Schritt näher am Gipfel.' },
      { label: 'Waldpfad', icon: 'park', story: 'Der Wald lichtet sich, der Weg wird steiler. Ihr seid gut unterwegs — weiter so, das nächste Stück wartet.' },
      { label: 'Steiler Aufstieg', icon: 'hiking', story: 'Jetzt wird es anstrengend. Die Luft wird dünner, aber ihr klettert stetig weiter — die halbe Strecke liegt schon hinter euch.' },
      { label: 'Fels & Grat', icon: 'terrain', story: 'Fels und schmaler Grat — hier zählt jeder sichere Schritt. Ihr seid näher am Gipfel, als es sich anfühlt.' },
      { label: 'Gipfel', icon: 'flag', story: 'Geschafft — der Gipfel! Der Blick von hier oben gehört der ganzen Klasse. Gut gemacht, Team.' },
    ],
    nudge: n => `Vala winkt von oben: noch ${n} ${n === 1 ? 'Schritt' : 'Schritte'} bis zum nächsten Lager!`,
  },
  {
    name: 'Weltraummission',
    icon: 'rocket_launch',
    guide: 'Bordcomputer ARI',
    stages: [
      { label: 'Startrampe', icon: 'rocket', story: 'Triebwerke bereit. Alle Systeme grün. Sobald ihr die ersten Aufgaben erledigt, zünden wir die Rakete.' },
      { label: 'Erdumlaufbahn', icon: 'satellite_alt', story: 'Wir haben Orbit erreicht! Von hier oben sieht die Erde winzig aus — und eure Fortschritte sehr groß.' },
      { label: 'Mondvorbeiflug', icon: 'nights_stay', story: 'Der Mond zieht vorbei. Funkstille für ein paar Sekunden — dann geht die Reise weiter, tiefer ins All.' },
      { label: 'Asteroidenfeld', icon: 'blur_circular', story: 'Vorsicht, Asteroidenfeld! Aber keine Sorge: mit jeder erledigten Aufgabe manövrieren wir sicherer hindurch.' },
      { label: 'Zielplanet', icon: 'flag_circle', story: 'Landung geglückt! Der Zielplanet ist erreicht — eine Mission, die nur als Team gelingen konnte.' },
    ],
    nudge: n => `ARI meldet: noch ${n} ${n === 1 ? 'Aufgabe' : 'Aufgaben'} bis zur nächsten Kontrollstation.`,
  },
  {
    name: 'Schatzsuche',
    icon: 'map',
    guide: 'Kartografin Isla',
    stages: [
      { label: 'Alte Landkarte', icon: 'map', story: 'Die Karte ist vergilbt, aber lesbar. Eine Spur führt in den Dschungel — folgt ihr mir?' },
      { label: 'Dschungelpfad', icon: 'forest', story: 'Dichtes Grün, aber der Pfad ist klar. Jede Aufgabe schlägt einen weiteren Weg frei.' },
      { label: 'Verborgene Höhle', icon: 'explore', story: 'Eine Höhle, tief und dunkel — doch eure Fackeln reichen aus. Die Spur wird wärmer.' },
      { label: 'Letzte Spur', icon: 'travel_explore', story: 'Nur noch eine Spur bis zum Ziel. Ich kann es fast riechen — Gold und Abenteuer.' },
      { label: 'Schatzkammer', icon: 'celebration', story: 'Die Schatzkammer! Geöffnet von der ganzen Klasse gemeinsam — der wahre Schatz war die Ausdauer.' },
    ],
    nudge: n => `Isla deutet auf die Karte: noch ${n} ${n === 1 ? 'Schritt' : 'Schritte'} bis zur nächsten Spur.`,
  },
]

/** Wählt ein Thema anhand des Season-Keys ('YYYY-MM'), rotierend pro Monat. */
export function getSeasonTheme(season: string): JourneyTheme {
  const monthIndex = Number(season.slice(5, 7)) - 1
  return THEMES[monthIndex % THEMES.length]
}

/** Index der aktuell erreichten Etappe (0-basiert) für einen Fortschritt in %. */
export function currentStageIndex(pct: number, stageCount: number): number {
  const idx = Math.floor((pct / 100) * (stageCount - 1))
  return Math.min(stageCount - 1, Math.max(0, idx))
}
