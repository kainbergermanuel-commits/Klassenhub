'use client'

import { useState } from 'react'
import { getSeasonTheme, currentStageIndex } from '@/lib/seasonTheme'
import IconButton from '@/components/ui/IconButton'
import GuideInfoOverlay from '@/components/streaks/GuideInfoOverlay'
import ReiseYearOverview from '@/components/streaks/ReiseYearOverview'
import AllArcsOverview from '@/components/streaks/AllArcsOverview'
import ChapterReader from '@/components/streaks/ChapterReader'
import type { Role } from '@/lib/types'

interface Props {
  season: string
  pct: number
  target: number | null
  role: Role
  /** Nur Admin-Lehrkräfte sehen den "Alle Welten"-Reiter (Redaktions-Vorschau
   *  auf den kompletten Fahrplan, inkl. noch ungebauter Welten). */
  isAdmin: boolean
}

/** "Die Reise": alle Kapitel der aktuellen Klassenreise, durchblätterbar —
 *  nicht nur die aktuelle Etappe. Erreichte Kapitel zeigen den vollen
 *  Story-Text, künftige sind angeteasert/gesperrt. Rein lesend, keine neue
 *  Mechanik (Prinzip 4: Story lädt ein, sie zwingt nicht). */
export default function ReiseOverview({ season, pct, target, role, isAdmin }: Props) {
  const theme = getSeasonTheme(season)
  const clampedPct = Math.min(100, Math.max(0, pct))
  // Epilog-Welt (Sonnenhafen): kein Klassenziel, aber das eine Kapitel soll
  // trotzdem lesbar sein — sonst stünde in den Ferien eine gesperrte Seite.
  const activeStage = theme.isEpilogue
    ? theme.stages.length - 1
    : target ? currentStageIndex(clampedPct, theme.stages.length) : -1
  const [guideInfoOpen, setGuideInfoOpen] = useState(false)
  const [tab, setTab] = useState<'aktuell' | 'jahr' | 'alle'>('aktuell')
  // Welche Welt der Leser gerade zeigt. Standard ist die laufende; aus der
  // Jahresübersicht lässt sich eine frühere Welt hineinladen.
  const [readerIcon, setReaderIcon] = useState(theme.icon)

  return (
    <>
      <header className="mb-6 flex items-center gap-3.5">
        <IconButton href="/streaks" icon="arrow_back" aria-label="Zurück zum Abenteuer" />
        <div className="min-w-0">
          <h1 className="text-[25px] max-md:text-[22px] font-extrabold text-kh-dark tracking-tight leading-tight">Die Reise</h1>
          <p className="text-[13.5px] text-kh-muted font-medium leading-tight mt-0.5">
            {theme.name} · Begleitet von {theme.guide}
          </p>
        </div>
      </header>

      {/* Umschalter im selben schlanken Stil wie Stundenplan/Abenteuer-Cockpit:
          Verlaufs-Unterstrich statt gefüllter weißer Kachel. */}
      <div
        className="mb-5 inline-flex overflow-hidden rounded-xl w-fit"
        style={{
          background: 'linear-gradient(180deg, #FBF7EE 0%, #FFFFFF 100%)',
          boxShadow: '0 1px 2px rgba(20,40,45,.05), 0 10px 24px rgba(20,40,45,.14)',
        }}
      >
        {([
          ['aktuell', 'Aktuelle Welt'],
          ['jahr', 'Jahresübersicht'],
          ...(isAdmin ? [['alle', 'Alle Welten'] as const] : []),
        ] as const).map(([key, label]) => {
          const active = tab === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`px-5 py-2 text-[13px] font-semibold transition-[color,transform] duration-150 ${
                active ? 'text-[#2F86C5]' : 'text-kh-muted hover:text-kh-dark hover:-translate-y-px'
              }`}
              style={active
                ? {
                    backgroundImage: 'linear-gradient(90deg, #2F86C5 0%, #56AEE6 100%)',
                    backgroundSize: '100% 3px',
                    backgroundPosition: 'bottom',
                    backgroundRepeat: 'no-repeat',
                  }
                : undefined}
            >
              {label}
            </button>
          )
        })}
      </div>

      {tab === 'jahr' ? (
        <ReiseYearOverview
          currentThemeName={theme.name}
          onOpenWorld={icon => { setReaderIcon(icon); setTab('aktuell') }}
        />
      ) : tab === 'alle' ? (
        <AllArcsOverview />
      ) : (
      <>
      {/* Ein Kapitel zur Zeit statt aller untereinander: die Welten-Bilder sind
          Banner und vertragen kein vertikales Stapeln, und fünf Kapitel am Stück
          zogen die Seite sehr weit nach unten. Der Leser trägt Welt, Guide und
          Fortschritt selbst, deshalb entfällt der frühere Hero darüber (sonst
          stünden zwei Bild-Banner übereinander). */}
      <ChapterReader
        key={readerIcon}
        arcIcon={readerIcon}
        currentTheme={theme}
        activeStage={activeStage}
        onArcChange={setReaderIcon}
      />

      <button
        type="button"
        onClick={() => setGuideInfoOpen(true)}
        className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/70 pl-2 pr-3 py-1 text-[11.5px] font-bold text-kh-muted shadow-sm hover:bg-white transition-colors"
      >
        <span className="msym text-[15px] text-kh-teal" aria-hidden="true">info</span>
        {/* Letztes Wort = Figurenname ("Vala?"), nicht der Rollen-Titel davor. */}
        Wer ist {theme.guide.split(' ').pop()}?
      </button>

      {guideInfoOpen && (
        <GuideInfoOverlay theme={theme} onClose={() => setGuideInfoOpen(false)} />
      )}

      {!target && (
        <p className="mt-3 text-[13px] text-kh-muted font-medium">
          {role === 'teacher' ? 'Noch kein Klassenziel für diesen Monat gesetzt.' : 'Die Klasse hat noch kein Ziel für diesen Monat.'}
        </p>
      )}
      </>
      )}
    </>
  )
}
