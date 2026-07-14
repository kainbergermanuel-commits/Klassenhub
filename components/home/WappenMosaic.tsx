import type { AchievementCounts } from '@/lib/achievements'

/** Das persönliche Wappen als wachsendes Mosaik (Balance-Fahrplan / Prinzip 2:
 *  Ausdruck, kein Wettbewerb) — statt einer nackten Zahl setzt sich ein
 *  Schild aus farbigen Splittern zusammen: jeder gesammelte Erfolg legt ein
 *  Fragment frei. Farbe nach Erfolgsart (Quest = teal, Gilde = violett,
 *  Klassenziel = amber). Rein visuell, rechnet nichts. */

// Schild-Form als Zeilen abnehmender Breite (14 Zellen) — füllt sich von oben
// links nach unten rechts, sodass das Wappen "wächst".
const ROWS = [4, 4, 3, 2, 1]
const TOTAL_CELLS = ROWS.reduce((a, b) => a + b, 0) // 14

const TYPE_GRADIENT: Record<'quest' | 'guild_quest' | 'class_goal', string> = {
  quest: 'linear-gradient(135deg, #3DB5AC, #0F8A82)',
  guild_quest: 'linear-gradient(135deg, #8791dd, #5965B8)',
  class_goal: 'linear-gradient(135deg, #E0A94B, #B8721E)',
}

export default function WappenMosaic({ counts }: { counts: AchievementCounts }) {
  // Splitter-Farben in fester Reihenfolge (gleiche Art clustert zusammen).
  const fragments: string[] = [
    ...Array(counts.quest).fill(TYPE_GRADIENT.quest),
    ...Array(counts.guild_quest).fill(TYPE_GRADIENT.guild_quest),
    ...Array(counts.class_goal).fill(TYPE_GRADIENT.class_goal),
  ]
  const total = fragments.length
  const overflow = Math.max(0, total - TOTAL_CELLS)
  const full = total >= TOTAL_CELLS

  let idx = 0
  return (
    <div className="flex flex-col items-center">
      <div className={`flex flex-col items-center gap-[3px] ${full ? 'drop-shadow-[0_2px_8px_rgba(184,114,30,.35)]' : ''}`}>
        {ROWS.map((width, r) => (
          <div key={r} className="flex gap-[3px]">
            {Array.from({ length: width }).map((_, c) => {
              const grad = fragments[idx]
              idx++
              return (
                <span
                  key={c}
                  className="w-[19px] h-[19px] rounded-[5px] transition-all duration-500"
                  style={grad
                    ? { background: grad, boxShadow: '0 1px 3px rgba(20,40,45,.18)' }
                    : { background: '#EFEADE', border: '1px dashed rgba(20,40,45,.14)' }}
                />
              )
            })}
          </div>
        ))}
      </div>

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
        <Legend grad={TYPE_GRADIENT.quest} label="Quests" />
        <Legend grad={TYPE_GRADIENT.guild_quest} label="Gilde" />
        <Legend grad={TYPE_GRADIENT.class_goal} label="Ziele" />
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
