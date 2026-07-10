/** Season-Journey: rein visuelles Narrativ über dem Klassenziel-Fortschritt.
 *  Nutzt Material-Symbols-Icons (msym) statt eigener Assets. Das Thema
 *  rotiert monatlich, damit es über die Zeit abwechslungsreich bleibt. */

export interface JourneyStage {
  label: string
  icon: string
}

export interface JourneyTheme {
  name: string
  icon: string
  stages: JourneyStage[]
}

const THEMES: JourneyTheme[] = [
  {
    name: 'Bergexpedition',
    icon: 'landscape',
    stages: [
      { label: 'Basislager', icon: 'cottage' },
      { label: 'Waldpfad', icon: 'park' },
      { label: 'Steiler Aufstieg', icon: 'hiking' },
      { label: 'Fels & Grat', icon: 'terrain' },
      { label: 'Gipfel', icon: 'flag' },
    ],
  },
  {
    name: 'Weltraummission',
    icon: 'rocket_launch',
    stages: [
      { label: 'Startrampe', icon: 'rocket' },
      { label: 'Erdumlaufbahn', icon: 'satellite_alt' },
      { label: 'Mondvorbeiflug', icon: 'nights_stay' },
      { label: 'Asteroidenfeld', icon: 'blur_circular' },
      { label: 'Zielplanet', icon: 'flag_circle' },
    ],
  },
  {
    name: 'Schatzsuche',
    icon: 'map',
    stages: [
      { label: 'Alte Landkarte', icon: 'map' },
      { label: 'Dschungelpfad', icon: 'forest' },
      { label: 'Verborgene Höhle', icon: 'explore' },
      { label: 'Letzte Spur', icon: 'travel_explore' },
      { label: 'Schatzkammer', icon: 'celebration' },
    ],
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
