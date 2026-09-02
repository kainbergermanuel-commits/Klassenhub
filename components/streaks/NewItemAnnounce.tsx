'use client'

import { useState } from 'react'
import { markRucksackItemsSeen } from '@/app/actions/markRucksackItemsSeen'
import { RUCKSACK_LORE, unseenItemKeys, type RucksackState } from '@/lib/rucksack'

/** Der Erwerbs-Moment. Items schalteten bisher still frei — man merkte es nur,
 *  wenn man zufällig den Rucksack öffnete, und damit fiel der emotional
 *  wertvollste Moment jeder Sammelmechanik ersatzlos weg: die Übergabe.
 *
 *  Zeigt jedes neu erworbene Zeichen genau einmal, in der Stimme der Guide-
 *  Figur, die es überreicht. Die Liste wird beim ersten Render eingefroren,
 *  damit das `router.refresh()` nach dem Wegklicken die Warteschlange nicht
 *  mitten im Durchblättern umbaut. */
export default function NewItemAnnounce({ state }: { state: RucksackState }) {
  const [queue] = useState(() => unseenItemKeys(state))
  const [index, setIndex] = useState(0)

  const key = queue[index]
  if (!key) return null

  const lore = RUCKSACK_LORE[key]
  const isLast = index === queue.length - 1

  function next() {
    // Bewusst optimistisch: erst weiterblättern, dann speichern. Scheitert der
    // Upsert (z.B. Lehrer-Vorschau-als-Schüler, siehe Action), soll der Dialog
    // trotzdem weggehen statt hängen zu bleiben.
    setIndex(i => i + 1)
    void markRucksackItemsSeen([key])
  }

  return (
    <div className="modal-backdrop fixed inset-0 z-[100] flex items-center justify-center p-4 bg-kh-dark/45 backdrop-blur-sm">
      <div className="modal-panel w-full max-w-[340px] bg-white rounded-3xl shadow-[0_20px_50px_rgba(20,40,45,.35)] p-6 text-center">
        <p className="text-[10.5px] font-bold uppercase tracking-widest text-kh-muted">
          Neu in deinem Rucksack
        </p>

        <span
          className="w-20 h-20 rounded-2xl mx-auto my-4 flex items-center justify-center shadow-[0_6px_20px_rgba(20,40,45,.22)]"
          style={{ background: lore.gradient }}
        >
          <span className="msym text-[40px] text-white" style={{ fontVariationSettings: "'FILL' 1" }}>
            {lore.icon}
          </span>
        </span>

        <h2 className="font-extrabold text-lg text-kh-dark">{lore.title}</h2>

        <p className="text-[13px] italic text-kh-muted leading-snug mt-3">{lore.origin}</p>
        <p className="text-[11.5px] font-bold text-kh-muted mt-2">— {lore.guide}</p>

        <button
          type="button"
          onClick={next}
          className="mt-5 w-full px-4 py-2.5 rounded-full bg-gradient-to-br from-kh-teal to-[#0B6F69] text-white text-[13px] font-extrabold hover:brightness-105 transition-[filter,opacity] duration-150 tap"
        >
          {isLast ? 'In den Rucksack legen' : 'Weiter'}
        </button>

        {queue.length > 1 && (
          <p className="text-[10.5px] font-semibold text-kh-muted mt-2.5">
            {index + 1} von {queue.length}
          </p>
        )}
      </div>
    </div>
  )
}
