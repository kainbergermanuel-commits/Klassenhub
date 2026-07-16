'use client'

import { useState } from 'react'
import type { JourneyTheme } from '@/lib/seasonTheme'
import GuideInfoOverlay from '@/components/streaks/GuideInfoOverlay'

interface Props {
  theme: JourneyTheme
  portrait: string | undefined
  index: number
}

/** Card für den Guide der aktuell laufenden Klassenwelt — steht zwischen
 *  Lehrer:innen- und Schüler:innen-Karten: kein Klassenmitglied, aber auch
 *  kein Lehrer, eine eigene dritte Kategorie. Klick öffnet dieselbe
 *  Kurzvorstellung wie im Heldenbuch (GuideInfoOverlay), damit an jeder
 *  Stelle dieselbe Erklärung steht. */
export default function GuideCard({ theme, portrait, index }: Props) {
  const [infoOpen, setInfoOpen] = useState(false)

  return (
    <div className="h-full animate-card-enter" style={{ animationDelay: `${index * 40}ms` }}>
      <button
        type="button"
        onClick={() => setInfoOpen(true)}
        className="relative h-full w-full rounded-2xl p-5 shadow-[0_8px_16px_rgba(20,40,45,.10)] flex flex-col items-center text-center gap-3 select-none overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
        style={{ background: 'linear-gradient(135deg, #E0A94B22 0%, #B8721E55 100%)' }}
      >
        {portrait ? (
          <img src={portrait} alt={theme.guide} className="w-16 h-16 rounded-full object-cover object-top ring-2 ring-white shadow-sm flex-shrink-0 bg-[#EFEAE0]" />
        ) : (
          <span className="w-16 h-16 rounded-full bg-gradient-to-br from-[#E0A94B] to-[#B8721E] flex items-center justify-center flex-shrink-0 ring-2 ring-white shadow-sm">
            <span className="msym text-[26px] text-white" aria-hidden="true">{theme.icon}</span>
          </span>
        )}
        <div className="flex flex-col items-center gap-0.5">
          <div className="font-bold text-[14.5px] text-kh-dark leading-tight">{theme.guide}</div>
          <div className="text-[11px] font-medium text-kh-muted">Euer Guide · {theme.name}</div>
        </div>
      </button>

      {infoOpen && <GuideInfoOverlay theme={theme} onClose={() => setInfoOpen(false)} />}
    </div>
  )
}
