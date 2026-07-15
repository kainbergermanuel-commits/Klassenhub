import type { AchievementCounts } from '@/lib/achievements'

/** Das persönliche Wappen als wachsendes Mosaik (Balance-Fahrplan / Prinzip 2:
 *  Ausdruck, kein Wettbewerb) — ein echtes Wappenschild (SVG), das sich aus
 *  farbigen Splittern zusammensetzt: jeder gesammelte Erfolg legt ein Fragment
 *  frei. Farbe nach Erfolgsart (Quest = teal, Gilde = violett, Klassenziel =
 *  amber). Die Splitter-Kacheln werden von der Schildform beschnitten, sodass
 *  die Ränder wie behauene Facetten wirken. Rein visuell, rechnet nichts. */

// Zeilen abnehmender Breite (14 Zellen) — füllt sich von oben links nach
// unten rechts, sodass das Wappen "wächst".
const ROWS = [4, 4, 3, 2, 1]
const TOTAL_CELLS = ROWS.reduce((a, b) => a + b, 0) // 14

// Klassische Schildform (Heater Shield) im 100×118-Raster.
const SHIELD_PATH = 'M50 4 L92 15 V58 Q92 92 50 114 Q8 92 8 58 V15 Z'

type FragKind = 'quest' | 'guild_quest' | 'class_goal'

const GRAD_STOPS: Record<FragKind, [string, string]> = {
  quest: ['#3DB5AC', '#0F8A82'],
  guild_quest: ['#8791dd', '#5965B8'],
  class_goal: ['#E0A94B', '#B8721E'],
}

const LEGEND_GRADIENT: Record<FragKind, string> = {
  quest: 'linear-gradient(135deg, #3DB5AC, #0F8A82)',
  guild_quest: 'linear-gradient(135deg, #8791dd, #5965B8)',
  class_goal: 'linear-gradient(135deg, #E0A94B, #B8721E)',
}

export default function WappenMosaic({ counts }: { counts: AchievementCounts }) {
  // Splitter in fester Reihenfolge (gleiche Art clustert zusammen).
  const fragments: FragKind[] = [
    ...Array<FragKind>(counts.quest).fill('quest'),
    ...Array<FragKind>(counts.guild_quest).fill('guild_quest'),
    ...Array<FragKind>(counts.class_goal).fill('class_goal'),
  ]
  const total = fragments.length
  const overflow = Math.max(0, total - TOTAL_CELLS)
  const full = total >= TOTAL_CELLS

  // Zellen-Geometrie: gleichmäßiges Raster über die Schild-Höhe, pro Zeile
  // mittig zentrierte Zellen; alles wird von der Schildform geclippt.
  const X0 = 8, X1 = 92, Y0 = 4, Y1 = 114, GAP = 2.5
  const rowH = (Y1 - Y0 - GAP * (ROWS.length - 1)) / ROWS.length
  const cells: { x: number; y: number; w: number; h: number }[] = []
  ROWS.forEach((count, r) => {
    const y = Y0 + r * (rowH + GAP)
    // Zeilenbreite schrumpft mit dem Schild nach unten, Zellen bleiben zentriert.
    const rowW = X1 - X0
    const cellW = (rowW - GAP * (count - 1)) / count
    for (let c = 0; c < count; c++) {
      cells.push({ x: X0 + c * (cellW + GAP), y, w: cellW, h: rowH })
    }
  })

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox="0 0 100 118"
        className={`w-[84px] h-auto ${full ? 'drop-shadow-[0_2px_8px_rgba(184,114,30,.4)]' : ''}`}
        role="img"
        aria-label={`Dein Wappen: ${total} von ${TOTAL_CELLS} Splittern`}
      >
        <defs>
          {(Object.keys(GRAD_STOPS) as FragKind[]).map(kind => (
            <linearGradient key={kind} id={`wappen-${kind}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={GRAD_STOPS[kind][0]} />
              <stop offset="100%" stopColor={GRAD_STOPS[kind][1]} />
            </linearGradient>
          ))}
          <linearGradient id="wappen-rim" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F5C842" />
            <stop offset="100%" stopColor="#B8721E" />
          </linearGradient>
          <clipPath id="wappen-clip">
            <path d={SHIELD_PATH} />
          </clipPath>
        </defs>

        {/* Pergament-Grund */}
        <path d={SHIELD_PATH} fill="#F3EFE6" />

        <g clipPath="url(#wappen-clip)">
          {cells.map((cell, i) => {
            const kind = fragments[i]
            return kind ? (
              <rect
                key={i}
                x={cell.x} y={cell.y} width={cell.w} height={cell.h} rx={2.5}
                fill={`url(#wappen-${kind})`}
                className="transition-opacity duration-500"
              />
            ) : (
              <rect
                key={i}
                x={cell.x + 0.5} y={cell.y + 0.5} width={cell.w - 1} height={cell.h - 1} rx={2.5}
                fill="#EDE8DC"
                stroke="rgba(20,40,45,.16)"
                strokeWidth="0.8"
                strokeDasharray="3 2.5"
              />
            )
          })}
        </g>

        {/* Schild-Rahmen — gold, sobald das Wappen komplett ist */}
        <path
          d={SHIELD_PATH}
          fill="none"
          stroke={full ? 'url(#wappen-rim)' : '#D8D2C4'}
          strokeWidth={full ? 3 : 2}
          strokeLinejoin="round"
        />
      </svg>

      <p className="text-[10.5px] font-bold text-kh-dark mt-2">Dein Wappen</p>
      <p className="text-[9.5px] text-kh-muted font-medium">
        {total === 0
          ? 'Noch kein Splitter'
          : overflow > 0
          ? `${total} Splitter · komplett!`
          : `${total} von ${TOTAL_CELLS} Splittern`}
      </p>

      {/* Kompakte Legende — welche Farbe steht für was */}
      <div className="flex items-center gap-2 mt-1.5">
        <Legend grad={LEGEND_GRADIENT.quest} label="Quests" />
        <Legend grad={LEGEND_GRADIENT.guild_quest} label="Gilde" />
        <Legend grad={LEGEND_GRADIENT.class_goal} label="Ziele" />
      </div>
    </div>
  )
}

function Legend({ grad, label }: { grad: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="w-2 h-2 rounded-[2px]" style={{ background: grad }} />
      <span className="text-[9px] text-kh-muted font-semibold">{label}</span>
    </span>
  )
}
