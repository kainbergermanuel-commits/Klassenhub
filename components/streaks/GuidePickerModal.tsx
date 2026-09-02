'use client'

import { useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { saveGuidePreference } from '@/app/actions/saveGuidePreference'
import IconButton from '@/components/ui/IconButton'
import { SCHOOL_YEAR_ARCS, GUIDE_PORTRAIT, isArcUnlocked } from '@/lib/seasonTheme'

interface Props {
  currentIcon: string | null
  currentThemeName: string
  onClose: () => void
}

/** "Mein Guide": persönliche Wahl, wessen Stimme im Heldenbuch spricht —
 *  unabhängig von der aktuellen Klassenwelt (die bleibt für alle gleich).
 *  Freigeschaltete Guides sind wählbar; kommende werden wie in der Jahres-
 *  übersicht als Silhouette geteasert ("ab {Monat} verfügbar"), damit beide
 *  Stellen dieselbe visuelle Sprache sprechen. */
export default function GuidePickerModal({ currentIcon, currentThemeName, onClose }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<string | null>(currentIcon)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState(false)

  function confirm() {
    setError(false)
    startTransition(async () => {
      try {
        await saveGuidePreference(selected)
        router.refresh()
        onClose()
      } catch {
        setError(true)
      }
    })
  }

  // ⚠️ Über createPortal direkt an document.body gehängt — dieselbe Begründung
  // wie in GuideInfoOverlay.tsx: HeldenbuchCard steckt in einem Vorfahren mit
  // `.animate-card-enter` (transform via animation-fill-mode: both), was einen
  // neuen Containing Block für `position: fixed` erzeugt. Ohne Portal wurde
  // das Modal live auf die schmale rechte Spalte zusammengestaucht statt
  // zentriert über den ganzen Viewport zu erscheinen.
  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="modal-panel bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1.5">
          <h2 className="text-lg font-extrabold text-kh-dark">Mein Guide</h2>
          <IconButton onClick={onClose} aria-label="Schließen" icon="close" size="sm" />
        </div>
        <p className="text-[12.5px] text-kh-muted font-medium leading-snug mb-4">
          Dein Guide spricht privat mit dir im Heldenbuch — er bleibt bei dir, auch wenn die Klasse
          gerade eine andere Welt bereist. Weitere Guides schalten sich im Lauf des Schuljahres frei.
        </p>

        <div className="grid grid-cols-2 gap-2.5">
          {SCHOOL_YEAR_ARCS.map(arc => {
            const unlocked = isArcUnlocked(arc.icon, currentThemeName)
            const portrait = GUIDE_PORTRAIT[arc.icon]
            const active = selected === arc.icon

            if (!unlocked) {
              return (
                <div
                  key={arc.icon}
                  className="flex flex-col items-center gap-1.5 rounded-2xl border border-dashed border-kh-border/70 bg-[#F9F7F2] px-2.5 py-3 text-center opacity-80"
                >
                  <span className="w-12 h-12 rounded-full bg-[#EFEAE0] flex items-center justify-center flex-shrink-0">
                    <span className="msym text-[20px] text-kh-muted/60" style={{ fontVariationSettings: "'FILL' 0" }}>lock</span>
                  </span>
                  <p className="text-[11.5px] font-bold text-kh-dark/60 leading-tight">{arc.guide}</p>
                  <p className="text-[10px] text-kh-muted font-semibold">ab {arc.monthLabel} verfügbar</p>
                </div>
              )
            }

            return (
              <button
                key={arc.icon}
                type="button"
                onClick={() => setSelected(arc.icon)}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 px-2.5 py-3 text-center transition-colors ${
                  active ? 'border-kh-teal bg-kh-teal-light' : 'border-transparent bg-[#FAF8F3] hover:bg-[#F0EDE5]'
                }`}
              >
                {portrait ? (
                  <img src={portrait} alt="" className="w-12 h-12 rounded-full object-cover object-top bg-[#EFEAE0] flex-shrink-0" />
                ) : (
                  <span className="w-12 h-12 rounded-full bg-gradient-to-br from-[#E0A94B] to-[#B8721E] flex items-center justify-center flex-shrink-0">
                    <span className="msym text-[20px] text-white" aria-hidden="true">{arc.icon}</span>
                  </span>
                )}
                <p className="text-[11.5px] font-bold text-kh-dark leading-tight">{arc.guide}</p>
                <p className="text-[10px] text-kh-muted font-semibold">{arc.name}</p>
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-3 rounded-full border border-kh-border text-sm font-bold text-kh-muted hover:bg-[#F6F3ED] transition-colors">
            Abbrechen
          </button>
          <button onClick={confirm} disabled={pending} className="flex-1 py-3 rounded-full gradient-teal text-white text-sm font-bold hover:brightness-105 transition-[filter,opacity] duration-150 tap disabled:opacity-40">
            Übernehmen
          </button>
        </div>
        {error && <p className="text-[12px] font-semibold text-kh-red mt-2.5 text-center">Konnte nicht gespeichert werden.</p>}
      </div>
    </div>,
    document.body
  )
}
