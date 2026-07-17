'use client'

import { useState } from 'react'
import RiddleCard from './RiddleCard'
import type { Riddle } from '@/lib/riddles'

interface Props {
  riddles: { riddle: Riddle; solved: boolean }[]
}

/** Eine gemeinsame Karte für alle aktiven Rätsel (Arc-Item + ggf. Splitter) —
 *  EIN Header statt eines pro Rätsel (vorher: jede RiddleCard eine eigene
 *  Karte mit "Rätsel dieser Welt"-Titel → doppelter Header, sobald mehr als
 *  ein Rätsel aktiv ist, z.B. Arc-Item + Splitter gleichzeitig).
 *
 *  Hält außerdem EINEN gemeinsamen "welches Modal ist offen"-Zustand — sonst
 *  könnten mehrere Rätsel-Modals gleichzeitig offen sein und sich überlagern. */
export default function RiddleList({ riddles }: Props) {
  const [openKey, setOpenKey] = useState<string | null>(null)
  if (riddles.length === 0) return null

  const allSolved = riddles.every(r => r.solved)

  return (
    <div className="kh-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="msym text-[19px] text-kh-amber" style={{ fontVariationSettings: "'FILL' 1" }}>extension</span>
        <h2 className="font-extrabold text-base text-kh-dark">{riddles.length > 1 ? 'Rätsel' : 'Rätsel dieser Welt'}</h2>
        {allSolved && (
          <span className="flex items-center gap-0.5 text-[9.5px] font-extrabold text-kh-green bg-kh-green/12 px-2 py-0.5 rounded-full ml-auto">
            <span className="msym text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>task_alt</span>
            alle gelöst
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        {riddles.map(r => (
          <RiddleCard
            key={r.riddle.key}
            riddle={r.riddle}
            solved={r.solved}
            open={openKey === r.riddle.key}
            onOpenChange={isOpen => setOpenKey(isOpen ? r.riddle.key : null)}
          />
        ))}
      </div>
    </div>
  )
}
