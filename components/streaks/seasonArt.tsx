/** Reichhaltigere Hintergrund-Illustrationen je Season-Thema — reines Inline-SVG,
 *  keine externen Assets. Mehrere geschichtete Formen + Verlauf statt einem
 *  einzelnen Icon, für mehr atmosphärische Tiefe im Kartenhintergrund. */

function MountainArt() {
  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden">
      {/* Fixe Höhe statt volle Kartenhöhe: sonst zeigt object-cover bei
          wachsender (schmaler/hoher) Karte zwangsläufig das ganze Foto von
          oben bis unten — der plane Himmel oben nimmt dann proportional immer
          mehr Platz ein ("Streifen"). Stattdessen an den oberen Rand geheftet,
          darunter läuft der Verlauf in die Kartenfarbe aus. */}
      <img
        src="/images/season-mountain.webp"
        alt=""
        className="absolute top-0 left-0 right-0 h-[150px] sm:h-[190px] w-full object-cover"
        style={{ opacity: 0.55, objectPosition: 'left top' }}
      />
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(180deg, rgba(239,234,224,0.05) 0%, rgba(239,234,224,0.35) 90px, #FAF8F3 150px, #FAF8F3 100%)' }}
      />
    </div>
  )
}

function SpaceArt() {
  return (
    <svg viewBox="0 0 400 160" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 w-full h-full">
      <defs>
        <linearGradient id="sky-space" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3D8FC7" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#5AB4E0" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="400" height="160" fill="url(#sky-space)" />
      <circle cx="330" cy="36" r="22" fill="#5AB4E0" opacity="0.4" />
      <circle cx="330" cy="36" r="30" fill="none" stroke="#5AB4E0" strokeOpacity="0.25" strokeWidth="1.5" />
      {[[40, 24], [90, 60], [150, 20], [210, 70], [260, 30], [30, 90], [180, 100], [110, 110]].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={i % 3 === 0 ? 2.4 : 1.4} fill="#5AB4E0" opacity="0.5" />
      ))}
      <path d="M0 150 Q100 110 200 140 T400 130 V160 H0 Z" fill="#3D8FC7" opacity="0.3" />
    </svg>
  )
}

function TreasureArt() {
  return (
    <svg viewBox="0 0 400 160" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 w-full h-full">
      <defs>
        <linearGradient id="sky-treasure" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F5C842" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#0F8A82" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="canopy-far" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3FAE9F" />
          <stop offset="100%" stopColor="#2E9385" />
        </linearGradient>
        <linearGradient id="canopy-near" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0F8A82" />
          <stop offset="100%" stopColor="#0B6D67" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="400" height="160" fill="url(#sky-treasure)" />
      <circle cx="315" cy="32" r="24" fill="#F5C842" opacity="0.45" />
      <path d="M0 140 Q60 90 130 120 T260 110 T400 130 V160 H0 Z" fill="url(#canopy-far)" opacity="0.45" />
      <path d="M0 160 Q90 100 190 135 T400 120 V160 Z" fill="url(#canopy-near)" opacity="0.65" />
      <path d="M30 158 q40 -14 80 0" fill="none" stroke="#F5C842" strokeOpacity="0.4" strokeWidth="2" strokeDasharray="4 5" />
    </svg>
  )
}

export const SEASON_ART: Record<string, () => React.ReactElement> = {
  landscape: MountainArt,
  rocket_launch: SpaceArt,
  map: TreasureArt,
}
