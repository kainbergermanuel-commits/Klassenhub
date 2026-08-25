'use client'

import { useState } from 'react'
import { findBuiltTheme, GUIDE_PORTRAIT, schoolYearIndex, SCHOOL_YEAR_ARCS, type JourneyTheme } from '@/lib/seasonTheme'
import { SEASON_ART } from '@/components/streaks/seasonArt'

interface Props {
  /** Welt, die gerade gelesen wird (Theme-Icon). */
  arcIcon: string
  /** Welt, in der die Klasse gerade steckt — bestimmt, welche Kapitel offen sind. */
  currentTheme: JourneyTheme
  /** Erreichte Etappe der LAUFENDEN Welt (0-basiert, -1 = noch keine). */
  activeStage: number
  /** Welt wechseln (z.B. zurück zur aktuellen). */
  onArcChange: (icon: string) => void
}

/** Der Kapitel-Leser: ein Kapitel zur Zeit, vor- und zurückblätterbar.
 *
 *  Vorher lagen alle Kapitel einer Welt als Karten untereinander. Das zog die
 *  Seite sehr weit nach unten und passte schlecht zu den Welten-Illustrationen,
 *  die als BANNER angelegt sind (breit, nicht hoch). Ein vertikaler Stapel
 *  verzerrt sie entweder oder wiederholt sie fünfmal.
 *
 *  Deshalb dasselbe Muster wie in AdventureHero: das Welten-Bild als Banner,
 *  darüber ein Glas-Panel mit dem Text. Ein Kapitel bleibt so etwa
 *  bildschirmhoch, statt die Seite zu strecken (Story-Art-Glas-Muster). */
export default function ChapterReader({ arcIcon, currentTheme, activeStage, onArcChange }: Props) {
  const theme = findBuiltTheme(arcIcon) ?? currentTheme
  const isCurrentWorld = theme.icon === currentTheme.icon
  const stages = theme.stages
  const lastIndex = stages.length - 1

  // Bereits durchlaufene Welten sind vollständig lesbar; in der laufenden Welt
  // ist offen, was die Klasse erreicht hat. Epilog-Welten haben kein Ziel und
  // sind deshalb immer offen.
  const maxOpen = !isCurrentWorld || theme.isEpilogue ? lastIndex : Math.max(0, activeStage)

  // Einstieg: in der laufenden Welt beim aktuellen Kapitel, in einer früheren
  // Welt von vorn — dort wäre `activeStage` (Fortschritt der LAUFENDEN Welt)
  // ein willkürlicher Startpunkt.
  const [index, setIndex] = useState(() => (isCurrentWorld ? Math.min(Math.max(0, activeStage), lastIndex) : 0))
  const clamped = Math.min(Math.max(index, 0), lastIndex)
  const stage = stages[clamped]

  const locked = clamped > maxOpen
  // Nur das unmittelbar nächste Kapitel bekommt eine Vorschau, alles danach
  // bleibt stumm — sonst wäre der halbe Bogen verraten.
  const teaser = locked && clamped === maxOpen + 1 ? stages[clamped - 1]?.cliffhanger : undefined

  const Art = SEASON_ART[theme.icon]
  const portrait = GUIDE_PORTRAIT[theme.icon]

  const arcIndex = schoolYearIndex(theme.icon)
  const nextArc = arcIndex >= 0 ? SCHOOL_YEAR_ARCS[arcIndex + 1] : undefined
  const nextPortrait = nextArc ? GUIDE_PORTRAIT[nextArc.icon] : undefined

  const go = (to: number) => setIndex(Math.min(Math.max(to, 0), lastIndex))

  return (
    <div className="flex flex-col gap-3">
      {/* Zurück-Hinweis, wenn eine frühere Welt gelesen wird */}
      {!isCurrentWorld && (
        <button
          type="button"
          onClick={() => onArcChange(currentTheme.icon)}
          className="self-start inline-flex items-center gap-1.5 rounded-full bg-kh-teal/12 pl-2 pr-3 py-1 text-[12px] font-bold text-kh-teal hover:bg-kh-teal/20 transition-colors"
        >
          <span className="msym text-[15px]">arrow_back</span>
          Zurück zu „{currentTheme.name}“
        </button>
      )}

      <div className="relative rounded-2xl overflow-hidden shadow-[0_8px_16px_rgba(20,40,45,.10)] bg-gradient-to-br from-[#EFEAE0] to-[#FAF8F3]">
        {Art && (
          <div className="absolute inset-0 pointer-events-none select-none" aria-hidden="true">
            <Art />
          </div>
        )}

        <div className="relative z-10 p-4 md:p-5 flex flex-col gap-3">
          {/* Kopfzeile: Welt + Guide links, Kapitelzähler rechts */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              {portrait && (
                <img
                  src={portrait}
                  alt={theme.guide}
                  className="w-11 h-11 rounded-full object-cover object-top ring-2 ring-white/80 shadow-sm flex-shrink-0 bg-[#EFEAE0]"
                />
              )}
              <span className="min-w-0">
                <span className="block text-[13.5px] font-extrabold text-kh-dark leading-tight truncate">{theme.name}</span>
                <span className="block text-[11px] font-semibold text-kh-dark/60 leading-tight truncate">{theme.guide}</span>
              </span>
            </div>
            <span className="flex-shrink-0 rounded-full bg-white/75 backdrop-blur-sm px-2.5 py-1 text-[10.5px] font-bold text-kh-muted whitespace-nowrap">
              Kapitel {clamped + 1} / {stages.length}
            </span>
          </div>

          {/* Glas-Panel mit dem Kapiteltext. Deutlich opaker als in AdventureHero
              (dort steht ein kurzer Absatz, hier ein ganzes Kapitel) — ein
              langer Lesetext braucht ruhigen Grund. */}
          <div className="rounded-2xl bg-white/80 backdrop-blur-[4px] px-4 py-4 md:px-5 md:py-[18px]">
            <div className="flex items-center gap-2 mb-2">
              <span
                className="msym flex items-center justify-center rounded-xl flex-shrink-0 w-9 h-9 text-[19px]"
                style={{
                  background: locked ? '#F3F0EA' : 'linear-gradient(135deg, #E8A020 0%, #F5C842 100%)',
                  color: locked ? '#B8AF9C' : '#fff',
                  fontVariationSettings: `'FILL' ${locked ? 0 : 1}`,
                }}
                aria-hidden="true"
              >
                {locked ? 'lock' : stage.icon}
              </span>
              <h3 className="font-extrabold text-[17px] text-kh-dark leading-tight min-w-0">{stage.label}</h3>
              {clamped === activeStage && isCurrentWorld && (
                <span className="flex-shrink-0 text-[9.5px] font-extrabold text-kh-amber bg-kh-amber/15 px-2 py-0.5 rounded-full">Aktuell</span>
              )}
            </div>

            {locked ? (
              teaser ? (
                <p className="text-[14px] text-kh-muted font-medium italic leading-relaxed border-l-2 border-[#E8A020]/50 pl-3">
                  {teaser}
                </p>
              ) : (
                <p className="text-[13.5px] text-kh-muted font-medium italic">
                  {theme.guide} verrät noch nichts. Dieses Kapitel wartet, bis die Klasse dort ankommt.
                </p>
              )
            ) : (
              <>
                <p className="text-[15px] text-kh-dark/90 leading-[1.7] border-l-2 border-[#E8A020]/50 pl-3">
                  {stage.chapter ?? stage.story}
                </p>

                {stage.handover && (
                  <div className="mt-3.5 flex items-start gap-3 rounded-xl bg-[#FAF8F3]/90 p-3.5">
                    {nextPortrait ? (
                      <img
                        src={nextPortrait}
                        alt={nextArc?.guide ?? ''}
                        className="w-11 h-11 rounded-full object-cover object-top ring-2 ring-white shadow-sm flex-shrink-0 bg-[#EFEAE0]"
                      />
                    ) : (
                      <span className="msym text-[21px] text-kh-amber flex-shrink-0 mt-0.5" aria-hidden="true">forward_to_inbox</span>
                    )}
                    <span className="min-w-0">
                      <span className="block text-[10.5px] font-bold uppercase tracking-wide text-kh-muted mb-1">
                        {nextArc ? `Übergabe an ${nextArc.guide}` : 'Übergabe'}
                      </span>
                      <span className="block text-[13.5px] text-kh-dark/85 leading-relaxed italic">{stage.handover}</span>
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Blättern: Pfeile plus Kapitel-Punkte zum Direktanspringen */}
          <div className="flex items-center gap-2">
            <NavButton
              icon="chevron_left"
              label="Vorheriges Kapitel"
              disabled={clamped === 0}
              onClick={() => go(clamped - 1)}
            />

            <div className="flex-1 flex items-center justify-center gap-1.5">
              {stages.map((s, i) => {
                const open = i <= maxOpen
                const here = i === clamped
                return (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => go(i)}
                    aria-label={`Kapitel ${i + 1}: ${s.label}`}
                    aria-current={here ? 'true' : undefined}
                    title={open ? s.label : 'Noch nicht erreicht'}
                    className={`rounded-full transition-all ${here ? 'w-6 h-2.5' : 'w-2.5 h-2.5 hover:scale-125'}`}
                    style={{
                      background: here
                        ? 'linear-gradient(90deg, #E8A020, #F5C842)'
                        : open ? 'rgba(184,114,30,.4)' : 'rgba(20,40,45,.16)',
                    }}
                  />
                )
              })}
            </div>

            <NavButton
              icon="chevron_right"
              label="Nächstes Kapitel"
              disabled={clamped === lastIndex}
              onClick={() => go(clamped + 1)}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function NavButton({ icon, label, disabled, onClick }: { icon: string; label: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center flex-shrink-0 shadow-sm text-kh-dark hover:bg-white transition-colors disabled:opacity-35 disabled:cursor-default disabled:hover:bg-white/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-kh-teal"
    >
      <span className="msym text-[22px]">{icon}</span>
    </button>
  )
}
