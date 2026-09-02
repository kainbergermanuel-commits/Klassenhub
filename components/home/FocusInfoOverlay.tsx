'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { QUEST_FOCUS_INFO } from '@/lib/questFocusInfo'
import type { QuestFocusTag } from '@/lib/questVault'

/** Erklärt den Wochen-Fokus in einer kleinen Geschichte. Wird über die
 *  Fokus-Pille auf der Quest-Karte geöffnet.
 *
 *  ⚠️ Über createPortal an document.body, aus demselben Grund wie bei
 *  GuideInfoOverlay: die Quest-Karte steckt auf der Startseite in einem
 *  Vorfahren mit `.animate-card-enter`, dessen `animation-fill-mode: both`
 *  dauerhaft eine `transform`-Eigenschaft stehen lässt. Ein transformierter
 *  Vorfahre erzeugt laut CSS-Spec einen neuen Containing Block für
 *  `position: fixed` — ohne Portal säße das Popup seitlich verschoben statt
 *  zentriert, und der Hintergrund wäre auf die Kartenfläche geklippt. */
export default function FocusInfoOverlay({
  focus, onClose,
}: { focus: QuestFocusTag; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  if (typeof document === 'undefined') return null
  const info = QUEST_FOCUS_INFO[focus]

  return createPortal(
    <div
      className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={info.title}
        className="modal-panel relative w-full max-w-sm rounded-2xl bg-white shadow-xl p-6 max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[#FAF8F3] flex items-center justify-center hover:bg-kh-border/40 transition-colors"
          aria-label="Schließen"
        >
          <span className="msym text-[18px] text-kh-muted">close</span>
        </button>

        <div className="flex items-center gap-2 mb-1">
          <span className="msym text-[20px] text-kh-teal" aria-hidden="true">{info.icon}</span>
          <p className="text-[11px] font-bold uppercase tracking-wide text-kh-muted">Fokus dieser Woche</p>
        </div>
        <h2 className="text-[20px] font-extrabold text-kh-dark tracking-tight mb-3 pr-8">{info.title}</h2>

        {/* Die Szene bekommt optisch Gewicht: sie ist der Teil, der hängen
            bleibt, die Erklärung darunter nur die Auflösung. */}
        <p className="text-[14px] text-kh-dark/90 leading-relaxed mb-4 pl-3 border-l-2 border-kh-teal/30">
          {info.story}
        </p>

        <p className="text-[13.5px] text-kh-dark/85 leading-snug mb-4">{info.meaning}</p>

        <div className="flex items-start gap-2.5 rounded-xl bg-[#F6F3ED] px-3.5 py-3">
          <span className="msym text-[17px] text-kh-teal flex-shrink-0 mt-px" aria-hidden="true">lightbulb</span>
          <span className="text-[13px] text-kh-dark/85 leading-snug">{info.example}</span>
        </div>
      </div>
    </div>,
    document.body,
  )
}
