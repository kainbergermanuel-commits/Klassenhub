/** Reichhaltigere Hintergrund-Illustrationen je Season-Thema — reines Inline-SVG,
 *  keine externen Assets. Mehrere geschichtete Formen + Verlauf statt einem
 *  einzelnen Icon, für mehr atmosphärische Tiefe im Kartenhintergrund. */

function MountainArt() {
  return (
    <div className="absolute inset-0 w-full h-full">
      <img
        src="/images/season-mountain.webp"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: 0.55, objectPosition: 'left calc(50% + 10px)' }}
      />
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(180deg, rgba(239,234,224,0.05) 0%, rgba(239,234,224,0.4) 55%, #FAF8F3 100%)' }}
      />
    </div>
  )
}

function SpaceArt() {
  return (
    <div className="absolute inset-0 w-full h-full">
      <img
        src="/images/season-space.webp"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: 0.55, objectPosition: 'center 60%' }}
      />
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(180deg, rgba(239,234,224,0.05) 0%, rgba(239,234,224,0.4) 55%, #FAF8F3 100%)' }}
      />
    </div>
  )
}

function TreasureArt() {
  return (
    <div className="absolute inset-0 w-full h-full">
      <img
        src="/images/season-jungle.webp"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: 0.55, objectPosition: 'center 40%' }}
      />
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(180deg, rgba(239,234,224,0.05) 0%, rgba(239,234,224,0.4) 55%, #FAF8F3 100%)' }}
      />
    </div>
  )
}

function TerraNovaArt() {
  return (
    <div className="absolute inset-0 w-full h-full">
      <img
        src="/images/season-terranova.webp"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: 0.55, objectPosition: 'center 45%' }}
      />
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(180deg, rgba(239,234,224,0.05) 0%, rgba(239,234,224,0.4) 55%, #FAF8F3 100%)' }}
      />
    </div>
  )
}

function TiefseeArt() {
  return (
    <div className="absolute inset-0 w-full h-full">
      <img
        src="/images/season-tiefsee.webp"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: 0.55, objectPosition: 'center 45%' }}
      />
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(180deg, rgba(239,234,224,0.05) 0%, rgba(239,234,224,0.4) 55%, #FAF8F3 100%)' }}
      />
    </div>
  )
}

function ChronikArt() {
  return (
    <div className="absolute inset-0 w-full h-full">
      <img
        src="/images/season-chronik.webp"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: 0.55, objectPosition: 'center 40%' }}
      />
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(180deg, rgba(239,234,224,0.05) 0%, rgba(239,234,224,0.4) 55%, #FAF8F3 100%)' }}
      />
    </div>
  )
}

function InselreichArt() {
  return (
    <div className="absolute inset-0 w-full h-full">
      <img
        src="/images/season-inselreich.webp"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: 0.55, objectPosition: 'center 45%' }}
      />
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(180deg, rgba(239,234,224,0.05) 0%, rgba(239,234,224,0.4) 55%, #FAF8F3 100%)' }}
      />
    </div>
  )
}

function SternenkarteArt() {
  return (
    <div className="absolute inset-0 w-full h-full">
      <img
        src="/images/season-sternenkarte.webp"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: 0.55, objectPosition: 'center 35%' }}
      />
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(180deg, rgba(239,234,224,0.05) 0%, rgba(239,234,224,0.4) 55%, #FAF8F3 100%)' }}
      />
    </div>
  )
}

function WerkstattArt() {
  return (
    <div className="absolute inset-0 w-full h-full">
      <img
        src="/images/season-werkstatt.webp"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: 0.55, objectPosition: 'center 45%' }}
      />
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(180deg, rgba(239,234,224,0.05) 0%, rgba(239,234,224,0.4) 55%, #FAF8F3 100%)' }}
      />
    </div>
  )
}

export const SEASON_ART: Partial<Record<string, () => React.ReactElement>> = {
  landscape: MountainArt,
  rocket_launch: SpaceArt,
  map: TreasureArt,
  eco: TerraNovaArt,
  water: TiefseeArt,
  history_edu: ChronikArt,
  anchor: InselreichArt,
  auto_awesome: SternenkarteArt,
  precision_manufacturing: WerkstattArt,
}
