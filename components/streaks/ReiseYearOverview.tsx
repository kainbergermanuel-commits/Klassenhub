'use client'

import { useState } from 'react'
import { SCHOOL_YEAR_ARCS, findBuiltTheme } from '@/lib/seasonTheme'
import { SEASON_ART } from '@/components/streaks/seasonArt'

interface Props {
  /** Name des aktuell laufenden Themas (theme.name aus getSeasonTheme). */
  currentThemeName: string
}

/** "Jahresübersicht": die ganze geplante Klassenreise als Zeitleiste — vergangene
 *  Welten kompakt abgehakt, die aktuelle hervorgehoben, kommende als Silhouette
 *  angeteasert (Guide + individuelle Teaser-Zeile + Monat), bis sie an der Reihe
 *  sind. Welten mit vorhandener Hintergrund-Illustration (SEASON_ART) zeigen sie
 *  gedimmt/entsättigt durch, solange sie noch gesperrt sind — Rest bleibt schlicht.
 *  Rein lesend, keine neue Mechanik (Prinzip 4: Story lädt ein, sie zwingt nicht). */
export default function ReiseYearOverview({ currentThemeName }: Props) {
  const currentIndex = SCHOOL_YEAR_ARCS.findIndex(arc => arc.name === currentThemeName)
  // Welche bereits durchlaufene Welt gerade aufgeklappt ist. Bis August 2026
  // waren die Kapitel vergangener Welten für Kinder gar nicht mehr erreichbar
  // (nur Admins sahen sie unter „Alle Welten"), obwohl der Fehler-Hinweis im
  // Splitter-Rätsel ausdrücklich dorthin verweist. Damit war das welten-
  // übergreifende Rätsel eine Sackgasse.
  const [openArc, setOpenArc] = useState<string | null>(null)

  return (
    <div className="relative flex flex-col">
      {SCHOOL_YEAR_ARCS.map((arc, i) => {
        const isPast = currentIndex >= 0 && i < currentIndex
        const isCurrent = i === currentIndex
        const isFuture = !isPast && !isCurrent
        const isLast = i === SCHOOL_YEAR_ARCS.length - 1
        const Art = SEASON_ART[arc.icon]
        const theme = findBuiltTheme(arc.icon)
        const isOpen = openArc === arc.icon

        return (
          <div key={arc.name} className="relative flex gap-4">
            {/* Zeitleisten-Knoten + verbindende Linie */}
            <div className="relative flex flex-col items-center flex-shrink-0 w-11">
              <div
                className="msym flex items-center justify-center rounded-full w-11 h-11 text-[20px] z-10"
                style={{
                  background: isFuture ? '#F3F0EA' : 'linear-gradient(135deg, #E8A020 0%, #F5C842 100%)',
                  color: isFuture ? '#B8AF9C' : '#fff',
                  fontVariationSettings: `'FILL' ${isFuture ? 0 : 1}`,
                  boxShadow: isCurrent ? '0 4px 12px rgba(184,114,30,.35)' : 'none',
                  opacity: isFuture ? 0.7 : 1,
                }}
              >
                {isFuture ? 'lock' : arc.icon}
              </div>
              {!isLast && (
                <div
                  className="w-[2.5px] flex-1 min-h-[24px]"
                  style={{ background: isPast ? 'linear-gradient(180deg, #F5C842, #E4DCC9)' : '#E4DCC9' }}
                />
              )}
            </div>

            {/* Inhalt */}
            <div className={`min-w-0 flex-1 ${isLast ? 'pb-0' : 'pb-4'}`}>
              <div
                className={`relative overflow-hidden rounded-2xl px-4 py-3.5 ${
                  isFuture ? `border border-dashed border-kh-border/70 ${Art ? '' : 'bg-[#F9F7F2]'}` : 'kh-card'
                }`}
              >
                {Art && (
                  // Vergangene/aktuelle Welten deutlich sichtbarer als vorher (0.85 →
                  // 0.96). Kein Blur-Panel mehr (wirkte verwaschen) — stattdessen ein
                  // gerichteter Verlauf nur über der linken Texthälfte (dort wo Titel/
                  // Tagline stehen), rechts bleibt das Bild klar und ungedimmt.
                  <>
                    <div
                      className="absolute inset-0 pointer-events-none select-none"
                      style={{ filter: isFuture ? 'grayscale(0.9) brightness(1.08)' : 'none', opacity: isFuture ? 0.4 : 0.96 }}
                    >
                      <Art />
                    </div>
                    {!isFuture && (
                      <div
                        className="absolute inset-0 pointer-events-none select-none"
                        style={{ background: 'linear-gradient(100deg, rgba(251,249,243,0.85) 0%, rgba(251,249,243,0.45) 30%, rgba(251,249,243,0) 55%)' }}
                      />
                    )}
                  </>
                )}

                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10.5px] font-bold uppercase tracking-wide text-kh-muted">{arc.monthLabel}</span>
                    {isCurrent && (
                      <span className="text-[9.5px] font-extrabold text-kh-amber bg-kh-amber/15 px-2 py-0.5 rounded-full">Jetzt</span>
                    )}
                    {isPast && (
                      <span className="msym text-[13px] text-kh-teal" aria-hidden="true">check_circle</span>
                    )}
                  </div>
                  {isFuture ? (
                    <>
                      <p className="text-[13.5px] font-bold text-kh-dark/70">{arc.guide}</p>
                      <p className="text-[12.5px] text-kh-muted italic mt-0.5 leading-snug max-w-[80%]">{arc.teaser}</p>
                    </>
                  ) : (
                    <>
                      <h3 className="font-extrabold text-[15.5px] text-kh-dark mb-0.5 max-w-[50%]">{arc.name}</h3>
                      <p className="text-[12.5px] text-kh-dark/70 font-medium leading-snug max-w-[50%]">
                        {arc.tagline} · Begleitet von {arc.guide}
                      </p>

                      {/* Bereits durchlaufene Welten bleiben lesbar: ohne das
                          käme ein Kind nie wieder an die Kapitel heran, die es
                          für welten-übergreifende Rätsel braucht. */}
                      {isPast && theme && (
                        <button
                          type="button"
                          onClick={() => setOpenArc(o => (o === arc.icon ? null : arc.icon))}
                          aria-expanded={isOpen}
                          className="group mt-2 inline-flex items-center gap-1 text-[12px] font-bold text-kh-teal hover:opacity-70 transition-opacity"
                        >
                          {isOpen ? 'Kapitel schließen' : `Alle ${theme.stages.length} Kapitel nachlesen`}
                          <span className={`msym text-[15px] transition-transform duration-200 ${isOpen ? 'rotate-180' : 'group-hover:translate-y-0.5'}`}>
                            expand_more
                          </span>
                        </button>
                      )}
                    </>
                  )}

                  {isOpen && theme && (
                    <div className="mt-3.5 flex flex-col gap-3.5 border-t border-kh-border/50 pt-3.5">
                      {theme.stages.map((stage, si) => (
                        <div key={stage.label}>
                          <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wide text-kh-muted mb-1">
                            <span className="msym text-[13px] text-kh-amber" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">{stage.icon}</span>
                            Kapitel {si + 1} · {stage.label}
                          </p>
                          <p className="max-w-[62ch] text-[13.5px] text-kh-dark/85 leading-[1.65]">
                            {stage.chapter ?? stage.story}
                          </p>
                          {stage.handover && (
                            <p className="max-w-[58ch] mt-1.5 text-[13px] text-kh-dark/70 leading-relaxed italic border-l-2 border-kh-amber/40 pl-3">
                              {stage.handover}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
