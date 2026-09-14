/** Hintergrund-Illustrationen je Season-Thema (Theme-Icon-Key). Reine .webp-
 *  Bilder unter public/images. SEASON_ART liefert fertige Komponenten mit
 *  dezenter Deckkraft + Verlauf (für Hero/Jahresübersicht); SEASON_ART_SRC/
 *  SEASON_ART_POS geben Pfad und Bildausschnitt roh heraus, damit einzelne
 *  Ansichten (z.B. die Admin-Vorschau) das Bild mit eigener Deckkraft zeigen
 *  können, ohne die geteilte SEASON_ART-Optik zu verändern. */

/** Theme-Icon → Bildpfad. */
export const SEASON_ART_SRC: Partial<Record<string, string>> = {
  landscape: '/images/season-mountain.webp',
  rocket_launch: '/images/season-space.webp',
  map: '/images/season-jungle.webp',
  eco: '/images/season-terranova.webp',
  water: '/images/season-tiefsee.webp',
  history_edu: '/images/season-chronik.webp',
  anchor: '/images/season-inselreich.webp',
  auto_awesome: '/images/season-sternenkarte.webp',
  precision_manufacturing: '/images/season-werkstatt.webp',
  park: '/images/season-weltenbaum.webp',
  wb_sunny: '/images/locations/sonnenhafen.webp',
}

/** Theme-Icon → objectPosition (fokussierter Bildausschnitt). */
export const SEASON_ART_POS: Partial<Record<string, string>> = {
  landscape: 'left calc(50% + 10px)',
  rocket_launch: 'center 60%',
  map: 'center 40%',
  eco: 'center 45%',
  water: 'center 45%',
  history_edu: 'center 40%',
  anchor: 'center 45%',
  auto_awesome: 'center 35%',
  precision_manufacturing: 'center 45%',
  park: 'center 40%',
  wb_sunny: 'center 42%',
}

/** Fertige, dezent gedimmte Hintergrund-Komponente (img + Verlauf nach unten
 *  ins Papier). Für Story-Hero und Reise-Übersichten. */
function seasonArtComponent(src: string, pos: string) {
  return function SeasonArt() {
    return (
      <div className="absolute inset-0 w-full h-full">
        <img
          src={src}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: 0.55, objectPosition: pos }}
        />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(180deg, rgba(239,234,224,0.05) 0%, rgba(239,234,224,0.4) 55%, #FAF8F3 100%)' }}
        />
      </div>
    )
  }
}

export const SEASON_ART: Partial<Record<string, () => React.ReactElement>> = Object.fromEntries(
  Object.entries(SEASON_ART_SRC).map(([icon, src]) => [icon, seasonArtComponent(src as string, SEASON_ART_POS[icon] ?? 'center')]),
)

/** Variante für HOHE Container (Story-Hero auf Mobile).
 *
 *  Warum es die braucht: Auf einer hohen, schmalen Karte skaliert `object-cover`
 *  auf die Breite, wodurch die Bildhöhe exakt aufgeht und die VOLLE Bildhöhe
 *  sichtbar wird. Bei `season-mountain.webp` ist die obere Hälfte flächiger
 *  Himmel (gemessen: RGB ~210/220/235 bis 50 % Höhe, erst ab 70 % der Berg) —
 *  auf dem Handy las sich das als grauer Streifen am oberen Kartenrand.
 *
 *  ⚠️ `objectPosition` hilft dagegen NICHT: Ohne vertikalen Überhang gibt es
 *  nichts zu verschieben, jeder Y-Wert sieht gleich aus. Deshalb wird das Bild
 *  hier höher als der Container gezogen und unten verankert — dadurch entsteht
 *  der Überhang oben, und der Himmel wird herausgeschnitten.
 *
 *  Unten verankert, weil bei diesen Motiven das Bildthema (Berg, Wald, Schiff)
 *  im unteren Teil sitzt und der Himmel oben. Falls eine künftige Welt das
 *  anders braucht, hier einen Eintrag in SEASON_ART_POS_TALL ergänzen. */
export const SEASON_ART_POS_TALL: Partial<Record<string, string>> = {}

function seasonArtComponentTall(src: string, pos: string) {
  return function SeasonArtTall() {
    return (
      <div className="absolute inset-0 w-full h-full">
        <img
          src={src}
          alt=""
          className="absolute inset-x-0 bottom-0 w-full h-[170%] object-cover"
          style={{ opacity: 0.55, objectPosition: pos }}
        />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(180deg, rgba(239,234,224,0.05) 0%, rgba(239,234,224,0.4) 55%, #FAF8F3 100%)' }}
        />
      </div>
    )
  }
}

export const SEASON_ART_TALL: Partial<Record<string, () => React.ReactElement>> = Object.fromEntries(
  Object.entries(SEASON_ART_SRC).map(([icon, src]) => [
    icon,
    seasonArtComponentTall(src as string, SEASON_ART_POS_TALL[icon] ?? 'center bottom'),
  ]),
)
