'use client'

import { useEffect, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { solveQuestRiddle } from '@/app/actions/solveQuestRiddle'
import type { Riddle } from '@/lib/riddles'

interface Props {
  riddle: Riddle
  solved: boolean
  /** Kontrolliert von außen (siehe RiddleList), damit immer nur EIN Rätsel-
   *  Modal gleichzeitig offen ist — mehrere gleichzeitig offene Modals
   *  überlagern und verwirren sich sonst gegenseitig. */
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Eine Rätsel-Zeile (Arc-Item ODER Splitter): ein temporärer, welt-
 *  thematischer Gegenstand, der ein Story-Verständnis-Rätsel öffnet (Neugier
 *  + Nochmal-Lesen statt Häkchen). Nach dem Lösen bleibt sie sichtbar als
 *  „gelöst" mit der Auflösung — kein Sammel-/Deko-Item, sondern Werkzeug fürs
 *  Rätsel (bewusst, siehe P4-Verzicht).
 *
 *  Bewusst OHNE eigene Karte/Header — nur die Zeile + ihr Modal. Der
 *  gemeinsame Rahmen ("Rätsel dieser Welt") lebt einmal in RiddleList, damit
 *  bei mehreren aktiven Rätseln (Arc-Item + Splitter) der Header nicht
 *  dupliziert wird. */
export default function RiddleCard({ riddle, solved, open, onOpenChange }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [wrong, setWrong] = useState(false)
  const [justSolved, setJustSolved] = useState(false)
  const [input, setInput] = useState('')
  const [mounted, setMounted] = useState(false)

  // Portal-Ziel erst nach dem Mount verfügbar (document existiert nicht beim
  // Server-Render) — verhindert einen Hydration-Mismatch.
  useEffect(() => { setMounted(true) }, [])

  const isSolved = solved || justSolved

  function answer(submitted: string) {
    if (!submitted.trim()) return
    setWrong(false)
    startTransition(async () => {
      const res = await solveQuestRiddle(riddle.key, submitted)
      if (res.ok) {
        setJustSolved(true)
        router.refresh()
      } else {
        setWrong(true)
      }
    })
  }

  const modal = open && !isSolved && (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="msym text-[20px] text-kh-amber" style={{ fontVariationSettings: "'FILL' 1" }}>{riddle.itemIcon}</span>
          <h3 className="font-extrabold text-[15px] text-kh-dark">{riddle.itemLabel}</h3>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="ml-auto msym text-[20px] text-kh-muted hover:text-kh-dark"
            aria-label="Schließen"
          >
            close
          </button>
        </div>

        <p className="text-[13.5px] text-kh-dark font-medium leading-relaxed mb-4">{riddle.prompt}</p>

        {riddle.kind === 'multiple_choice' ? (
          <div className="flex flex-col gap-2">
            {(riddle.options ?? []).map(o => (
              <button
                key={o.key}
                type="button"
                onClick={() => answer(o.key)}
                disabled={pending}
                className="text-left rounded-xl border border-kh-border/60 bg-white px-3.5 py-2.5 text-[13px] font-semibold text-kh-dark hover:border-kh-amber hover:bg-kh-amber/[0.05] transition-colors disabled:opacity-50"
              >
                {o.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <input
              type="text"
              value={input}
              onChange={e => { setInput(e.target.value); setWrong(false) }}
              onKeyDown={e => { if (e.key === 'Enter') answer(input) }}
              placeholder={riddle.placeholder ?? 'Antwort eingeben …'}
              disabled={pending}
              autoFocus
              className="rounded-xl border border-kh-border/60 bg-white px-3.5 py-2.5 text-base text-kh-dark placeholder:text-kh-muted/60 focus:border-kh-amber focus:outline-none disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => answer(input)}
              disabled={pending || !input.trim()}
              className="rounded-xl bg-kh-amber text-white font-extrabold text-[13px] px-3.5 py-2.5 hover:bg-kh-amber/90 transition-colors disabled:opacity-40"
            >
              Lösung prüfen
            </button>
          </div>
        )}

        {wrong && (
          <p className="mt-3 flex items-start gap-1.5 text-[12.5px] text-kh-muted">
            <span className="msym text-[15px] text-kh-amber flex-shrink-0 mt-px">emoji_objects</span>
            Noch nicht ganz. Lies die Geschichte dieser Welt noch einmal in der „Reise" nach — die Antwort steht mittendrin. Versuch es dann einfach nochmal.
          </p>
        )}
      </div>
    </div>
  )

  return (
    <>
      <div className="flex items-start gap-3 rounded-xl bg-[#FAF8F3] px-3 py-3">
        <span
          className="msym text-[26px] text-kh-amber flex-shrink-0 mt-0.5"
          style={{ fontVariationSettings: "'FILL' 1" }}
          aria-hidden="true"
        >
          {riddle.itemIcon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-bold text-[14px] text-kh-dark">{riddle.itemLabel}</p>
            {isSolved && (
              <span className="flex items-center gap-0.5 text-[9.5px] font-extrabold text-kh-green bg-kh-green/12 px-2 py-0.5 rounded-full">
                <span className="msym text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>task_alt</span>
                gelöst
              </span>
            )}
          </div>
          <p className="text-[12px] text-kh-muted mt-0.5">
            {isSolved ? riddle.reward : riddle.intro}
          </p>
          {!isSolved && (
            <button
              type="button"
              onClick={() => onOpenChange(true)}
              className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-kh-amber/15 text-kh-amber font-extrabold text-[12.5px] px-3 py-1.5 hover:bg-kh-amber/25 transition-colors"
            >
              <span className="msym text-[15px]">quiz</span>
              Rätsel öffnen
            </button>
          )}
        </div>
      </div>

      {/* Portal ins <body>: ein `fixed`-Overlay innerhalb eines Vorfahren mit
       *  CSS-`transform` (hier: die `animate-card-enter`-Einblendanimation der
       *  umgebenden Karten-Liste) wird zum Containing Block dieses Vorfahren
       *  statt des Viewports — das Modal erscheint dann nur innerhalb der Karte
       *  und wirkt "eingesperrt" (grauer Card-Hintergrund statt Vollbild-Blur).
       *  MERKEN: dieses Muster betrifft jedes `fixed`-Overlay unter einem
       *  transform-animierten Vorfahren, nicht nur dieses Modal. */}
      {mounted && modal && createPortal(modal, document.body)}
    </>
  )
}
