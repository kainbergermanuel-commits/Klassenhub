'use client'

import { useState, useRef, useEffect } from 'react'
import RucksackItems, { type RucksackState } from './RucksackItems'

/** Kompakter Zugang zum Rucksack als Icon-Button mit Popover — für Kontexte
 *  ohne Platz für die volle Card (z.B. das Heldenbuch auf der Startseite).
 *  Klick öffnet/schließt; Klick außerhalb schließt. */
export default function RucksackButton({ state }: { state: RucksackState }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  return (
    <span ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
          open ? 'bg-kh-teal text-white shadow-[0_3px_10px_rgba(15,138,130,.35)]' : 'bg-kh-teal/12 text-kh-teal hover:bg-kh-teal/20'
        }`}
        aria-label="Rucksack öffnen"
        title="Dein Rucksack"
      >
        <span className="msym text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>backpack</span>
      </button>

      {open && (
        <span className="absolute top-full right-0 mt-2 z-50 w-[300px] max-w-[85vw] bg-white rounded-2xl shadow-[0_12px_30px_rgba(20,40,45,.25)] p-4 text-left">
          <span className="flex items-center gap-2 mb-3">
            <span className="msym text-[18px] text-kh-teal" style={{ fontVariationSettings: "'FILL' 1" }}>backpack</span>
            <span className="font-extrabold text-[14px] text-kh-dark">Dein Rucksack</span>
          </span>
          <RucksackItems state={state} />
        </span>
      )}
    </span>
  )
}
