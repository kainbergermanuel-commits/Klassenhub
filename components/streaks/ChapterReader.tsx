'use client'

import { useState } from 'react'
import { findBuiltTheme, GUIDE_PORTRAIT, schoolYearIndex, SCHOOL_YEAR_ARCS, type JourneyTheme } from '@/lib/seasonTheme'
import { SEASON_ART, SEASON_ART_SRC, SEASON_ART_POS } from '@/components/streaks/seasonArt'

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

/** Seite -1 = Titelbild der Welt, 0..n = Kapitel. Das Titelbild gibt es, damit
 *  die Welten-Illustration einmal ganz ohne Text-Overlay zu sehen ist: sie ist
 *  der aufwendigste visuelle Teil der Reise und verschwindet sonst dauerhaft
 *  hinter dem Glas-Panel. */
const COVER = -1

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
  // Welt beim Titelbild — dort wäre `activeStage` (Fortschritt der LAUFENDEN
  // Welt) ein willkürlicher Startpunkt, und man kommt gerade neu an.
  const [page, setPage] = useState(() => (isCurrentWorld ? Math.min(Math.max(0, activeStage), lastIndex) : COVER))
  const clamped = Math.min(Math.max(page, COVER), lastIndex)
  const isCover = clamped === COVER
  const stage = isCover ? null : stages[clamped]

  const locked = !isCover && clamped > maxOpen
  // Nur das unmittelbar nächste Kapitel bekommt eine Vorschau, alles danach
  // bleibt stumm — sonst wäre der halbe Bogen verraten.
  const teaser = locked && clamped === maxOpen + 1 ? stages[clamped - 1]?.cliffhanger : undefined

  const Art = SEASON_ART[theme.icon]
  const coverSrc = SEASON_ART_SRC[theme.icon]
  const portrait = GUIDE_PORTRAIT[theme.icon]

  const arcIndex = schoolYearIndex(theme.icon)
  const arc = arcIndex >= 0 ? SCHOOL_YEAR_ARCS[arcIndex] : undefined
  const nextArc = arcIndex >= 0 ? SCHOOL_YEAR_ARCS[arcIndex + 1] : undefined
  const nextPortrait = nextArc ? GUIDE_PORTRAIT[nextArc.icon] : undefined

  const go = (to: number) => setPage(Math.min(Math.max(to, COVER), lastIndex))

  return (
    <div className="flex flex-col gap-3">
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
        {/* Auf dem Titelbild läuft die Illustration ungedimmt (eigenes img statt
            SEASON_ART, das für Text-Hintergründe auf 0.55 abgeblendet ist).
            Auf den Kapitelseiten bleibt es beim gedimmten Grund. */}
        {isCover && coverSrc ? (
          <div className="absolute inset-0 pointer-events-none select-none" aria-hidden="true">
            <img
              src={coverSrc}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              style={{ objectPosition: SEASON_ART_POS[theme.icon] ?? 'center' }}
            />
            {/* Nur unten ein Verlauf, damit der Titel lesbar bleibt und das Bild
                im oberen Zweidrittel unversperrt sichtbar ist. */}
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(180deg, rgba(20,40,45,0) 45%, rgba(20,40,45,.55) 100%)' }}
            />
          </div>
        ) : Art ? (
          <div className="absolute inset-0 pointer-events-none select-none" aria-hidden="true">
            <Art />
          </div>
        ) : null}

        {isCover ? (
          /* Titelbild. Das pb lässt Platz für die Blätter-Leiste, die hier absolut am
             unteren Rand schwebt — sonst läge sie auf dem Welt-Titel. */
          <div className="relative z-10 flex flex-col justify-end min-h-[280px] md:min-h-[380px] p-4 pb-[76px] md:p-6 md:pb-[84px]">
            <div className="flex items-end gap-3">
              {portrait && (
                <img
                  src={portrait}
                  alt={theme.guide}
                  className="hidden sm:block w-16 h-16 md:w-20 md:h-20 rounded-full object-cover object-top ring-2 ring-white/70 shadow-lg flex-shrink-0 bg-[#EFEAE0]"
                />
              )}
              <div className="min-w-0">
                {arc && (
                  <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-white/80 mb-1 drop-shadow">
                    {arc.monthLabel}
                  </p>
                )}
                <h3 className="text-[26px] md:text-[32px] font-extrabold text-white leading-[1.1] tracking-tight drop-shadow-[0_2px_8px_rgba(20,40,45,.6)]">
                  {theme.name}
                </h3>
                <p className="text-[13px] md:text-[14px] font-semibold text-white/90 mt-1 drop-shadow">
                  Begleitet von {theme.guide}
                </p>
                {arc && (
                  <p className="text-[12.5px] md:text-[13.5px] text-white/80 italic mt-1.5 max-w-[52ch] drop-shadow">
                    {arc.tagline}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ── Kapitelseite ─────────────────────────────────────────────── */
          <div className="relative z-10 p-4 md:p-5 flex flex-col gap-3">
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

            {/* Glas-Panel: transparent genug, dass die Illustration durchscheint,
                deckend genug für einen ganzen Kapiteltext. */}
            <div className="rounded-2xl bg-white/[0.72] backdrop-blur-[5px] px-4 py-4 md:px-5 md:py-[18px]">
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
                  {locked ? 'lock' : stage!.icon}
                </span>
                <h3 className="font-extrabold text-[17px] text-kh-dark leading-tight min-w-0">{stage!.label}</h3>
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
                    {stage!.chapter ?? stage!.story}
                  </p>

                  {stage!.handover && (
                    <div className="mt-3.5 flex items-start gap-3 rounded-xl bg-[#FAF8F3]/85 p-3.5">
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
                        <span className="block text-[13.5px] text-kh-dark/85 leading-relaxed italic">{stage!.handover}</span>
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Blättern — auf dem Titelbild über dem Bild schwebend, sonst im Fluss */}
        <div className={`z-10 flex items-center gap-2 ${isCover ? 'absolute bottom-0 left-0 right-0 p-4 md:p-5' : 'relative px-4 pb-4 md:px-5 md:pb-5'}`}>
          <NavButton icon="chevron_left" label="Zurück" disabled={clamped === COVER} onClick={() => go(clamped - 1)} onCover={isCover} />

          <div className="flex-1 flex items-center justify-center gap-1.5">
            {/* Eigener Punkt fürs Titelbild, damit man jederzeit dorthin zurück kann */}
            <button
              type="button"
              onClick={() => go(COVER)}
              aria-label="Titelbild der Welt"
              aria-current={isCover ? 'true' : undefined}
              title="Titelbild"
              className={`msym flex items-center justify-center rounded-full transition-all text-[13px] ${isCover ? 'w-6 h-4' : 'w-4 h-4 hover:scale-110'}`}
              style={{ color: isCover ? '#FFFFFF' : 'rgba(184,114,30,.55)' }}
            >
              image
            </button>
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
                      : open
                        ? (isCover ? 'rgba(255,255,255,.7)' : 'rgba(184,114,30,.4)')
                        : (isCover ? 'rgba(255,255,255,.3)' : 'rgba(20,40,45,.16)'),
                  }}
                />
              )
            })}
          </div>

          <NavButton icon="chevron_right" label="Weiter" disabled={clamped === lastIndex} onClick={() => go(clamped + 1)} onCover={isCover} />
        </div>
      </div>
    </div>
  )
}

function NavButton({ icon, label, disabled, onClick, onCover }: {
  icon: string
  label: string
  disabled: boolean
  onClick: () => void
  /** Auf dem Titelbild sitzen die Knöpfe über der Illustration und brauchen
   *  mehr Deckkraft, damit sie auf hellen wie dunklen Bildstellen sichtbar sind. */
  onCover: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm transition-colors disabled:opacity-35 disabled:cursor-default focus-visible:outline focus-visible:outline-2 focus-visible:outline-kh-teal ${
        onCover
          ? 'bg-white/90 text-kh-dark hover:bg-white disabled:hover:bg-white/90'
          : 'bg-white/80 backdrop-blur-sm text-kh-dark hover:bg-white disabled:hover:bg-white/80'
      }`}
    >
      <span className="msym text-[22px]">{icon}</span>
    </button>
  )
}
