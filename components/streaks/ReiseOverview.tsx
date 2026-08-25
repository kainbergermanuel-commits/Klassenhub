'use client'

import { useState } from 'react'
import { getSeasonTheme, currentStageIndex, GUIDE_PORTRAIT, schoolYearIndex, SCHOOL_YEAR_ARCS } from '@/lib/seasonTheme'
import { SEASON_ART } from '@/components/streaks/seasonArt'
import IconButton from '@/components/ui/IconButton'
import GuideInfoOverlay from '@/components/streaks/GuideInfoOverlay'
import ReiseYearOverview from '@/components/streaks/ReiseYearOverview'
import AllArcsOverview from '@/components/streaks/AllArcsOverview'
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
  const Art = SEASON_ART[theme.icon]
  const portrait = GUIDE_PORTRAIT[theme.icon]
  const [guideInfoOpen, setGuideInfoOpen] = useState(false)
  const [tab, setTab] = useState<'aktuell' | 'jahr' | 'alle'>('aktuell')

  // Nächste Welt im Fahrplan — trägt Portrait und Name für den Übergabe-Block
  // an der letzten Etappe. `undefined` beim Sonnenhafen (dort endet die Reise).
  const arcIndex = schoolYearIndex(theme.icon)
  const nextArc = arcIndex >= 0 ? SCHOOL_YEAR_ARCS[arcIndex + 1] : undefined
  const nextPortrait = nextArc ? GUIDE_PORTRAIT[nextArc.icon] : undefined

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
        <ReiseYearOverview currentThemeName={theme.name} />
      ) : tab === 'alle' ? (
        <AllArcsOverview />
      ) : (
      <>
      <button
        type="button"
        onClick={() => setGuideInfoOpen(true)}
        className="relative mb-6 flex items-stretch w-full text-left rounded-2xl min-h-[180px] group"
      >
        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none select-none">
          {Art && <Art />}
        </div>
        {portrait && (
          <div className="relative z-10 w-[92px] flex-shrink-0 self-stretch pointer-events-none">
            <img
              src={portrait}
              alt={theme.guide}
              className="absolute bottom-[-14px] left-[-10px] w-[112px] max-w-none h-auto object-contain"
            />
          </div>
        )}
        <div className="relative z-10 flex-1 min-w-0 px-5 py-4 flex flex-col justify-center">
          {target ? (
            <>
              <p className="text-[11px] font-bold uppercase tracking-wide text-kh-muted mb-2.5">
                {theme.name} · Etappe {activeStage + 1} von {theme.stages.length}
              </p>
              <div className="relative flex items-center">
                <div className="absolute left-0 right-0 h-1 rounded-full bg-[#E4DCC9] top-1/2 -translate-y-1/2" />
                <div
                  className="absolute left-0 h-1 rounded-full bg-gradient-to-r from-[#B8721E] to-[#F5C842] top-1/2 -translate-y-1/2 transition-all duration-700"
                  style={{ width: `${((activeStage + 0.5) / theme.stages.length) * 100}%` }}
                />
                {theme.stages.map((stage, i) => {
                  const reached = i <= activeStage
                  const isCurrent = i === activeStage
                  return (
                    <div key={stage.label} className="relative flex-1 min-w-0 flex justify-center px-0.5">
                      <div
                        className={`msym flex items-center justify-center rounded-full transition-all duration-300 flex-shrink-0 ${isCurrent ? 'w-8 h-8 text-[17px]' : 'w-6 h-6 text-[13px]'}`}
                        style={{
                          background: reached ? 'linear-gradient(135deg, #E8A020 0%, #F5C842 100%)' : '#fff',
                          color: reached ? '#fff' : '#B8AF9C',
                          border: reached ? 'none' : '1.5px solid #E4DCC9',
                          fontVariationSettings: `'FILL' ${reached ? 1 : 0}`,
                          boxShadow: isCurrent ? '0 4px 10px rgba(184,114,30,.35)' : 'none',
                        }}
                      >
                        {stage.icon}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <p className="text-[13px] text-kh-muted font-medium">
              {role === 'teacher' ? 'Noch kein Klassenziel für diesen Monat gesetzt.' : 'Die Klasse hat noch kein Ziel für diesen Monat.'}
            </p>
          )}
        </div>
        <span className="absolute z-10 top-3 right-3 flex items-center gap-1 rounded-full bg-white/85 pl-2 pr-2.5 py-1 text-[10.5px] font-bold text-kh-muted shadow-sm group-hover:bg-white transition-colors">
          <span className="msym text-[14px] text-kh-teal" aria-hidden="true">info</span>
          {/* Letztes Wort = Figurenname ("Vala?"), nicht der Rollen-Titel davor. */}
          {theme.guide.split(' ').pop()}?
        </span>
      </button>

      {guideInfoOpen && (
        <GuideInfoOverlay theme={theme} onClose={() => setGuideInfoOpen(false)} />
      )}

      <div className="flex flex-col gap-4">
        {theme.stages.map((stage, i) => {
          const reached = i <= activeStage
          const isCurrent = i === activeStage
          const locked = !reached
          // Nur die ERSTE gesperrte Etappe bekommt eine Cliffhanger-Vorschau.
          // Alle weiteren bleiben stumm, sonst verrät man den halben Bogen.
          const isNextUp = locked && i === activeStage + 1
          const teaser = isNextUp ? theme.stages[i - 1]?.cliffhanger : undefined

          return (
            <div
              key={stage.label}
              className={`kh-card p-5 flex gap-4 transition-opacity ${locked ? 'opacity-55' : ''}`}
            >
              <div
                className="msym flex items-center justify-center rounded-2xl flex-shrink-0 w-12 h-12 text-[22px]"
                style={{
                  background: reached ? 'linear-gradient(135deg, #E8A020 0%, #F5C842 100%)' : '#F3F0EA',
                  color: reached ? '#fff' : '#B8AF9C',
                  fontVariationSettings: `'FILL' ${reached ? 1 : 0}`,
                  boxShadow: isCurrent ? '0 4px 12px rgba(184,114,30,.35)' : 'none',
                }}
              >
                {locked ? 'lock' : stage.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10.5px] font-bold uppercase tracking-wide text-kh-muted">Kapitel {i + 1} von {theme.stages.length}</span>
                  {isCurrent && (
                    <span className="text-[9.5px] font-extrabold text-kh-amber bg-kh-amber/15 px-2 py-0.5 rounded-full">Aktuell</span>
                  )}
                </div>
                <h3 className="font-extrabold text-[17px] text-kh-dark mb-2">{stage.label}</h3>

                {locked ? (
                  teaser ? (
                    // Der letzte Satz der vorigen Etappe als angerissene Vorschau:
                    // baut Vorfreude, ohne etwas zu verraten (Prinzip 4).
                    <p className="text-[13.5px] text-kh-muted font-medium italic leading-relaxed border-l-2 border-kh-amber/40 pl-3">
                      {teaser}
                    </p>
                  ) : (
                    <p className="text-[13px] text-kh-muted font-medium italic">
                      {theme.guide} verrät noch nichts. Dieses Kapitel wartet, bis die Klasse dort ankommt.
                    </p>
                  )
                ) : (
                  <>
                    {/* Lese-Ansicht: der volle Kapiteltext in ruhiger Typografie,
                        Zeilenlänge begrenzt. Fällt auf die Kurzfassung zurück,
                        solange für eine Etappe noch kein `chapter` geschrieben ist. */}
                    <p className="max-w-[62ch] text-[15px] text-kh-dark/90 leading-[1.7] whitespace-pre-line">
                      {stage.chapter ?? stage.story}
                    </p>

                    {stage.handover && (
                      <div className="mt-4 flex items-start gap-3 rounded-xl bg-[#FAF8F3] p-3.5">
                        {nextPortrait ? (
                          <img
                            src={nextPortrait}
                            alt={nextArc?.guide ?? ''}
                            className="w-12 h-12 rounded-full object-cover object-top ring-2 ring-white shadow-sm flex-shrink-0 bg-[#EFEAE0]"
                          />
                        ) : (
                          <span className="msym text-[22px] text-kh-amber flex-shrink-0 mt-0.5" aria-hidden="true">forward_to_inbox</span>
                        )}
                        <div className="min-w-0">
                          <p className="text-[10.5px] font-bold uppercase tracking-wide text-kh-muted mb-1">
                            {nextArc ? `Übergabe an ${nextArc.guide}` : 'Übergabe'}
                          </p>
                          <p className="max-w-[58ch] text-[13.5px] text-kh-dark/85 leading-relaxed italic">{stage.handover}</p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
      </>
      )}
    </>
  )
}
