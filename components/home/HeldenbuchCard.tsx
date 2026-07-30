'use client'

import { useState } from 'react'
import { MILESTONES, flameCount } from '@/lib/streak'
import { getSeasonTheme, GUIDE_PORTRAIT, SCHOOL_YEAR_ARCS } from '@/lib/seasonTheme'
import RucksackButton from '@/components/streaks/RucksackButton'
import GuideInfoOverlay from '@/components/streaks/GuideInfoOverlay'
import GuidePickerModal from '@/components/streaks/GuidePickerModal'
import WappenMosaic from './WappenMosaic'
import type { RucksackState } from '@/lib/rucksack'
import type { AchievementCounts } from '@/lib/achievements'
import type { GuideNote, ChronicleEntry } from '@/lib/heldenbuch'

interface Props {
  streak: number
  confirmedStreak: number
  broken: boolean
  pendingMilestone: number | null
  season: string
  achievementCounts: AchievementCounts
  /** Stille Anerkennung — private Guide-Beobachtung (siehe lib/heldenbuch.ts).
   *  Bereits mit der Stimme des effektiven Guides gebaut (siehe noteGuideIcon). */
  guideNote: GuideNote
  /** Theme-Icon des Guides, dessen Stimme guideNote gerade spricht — der
   *  persönlich gewählte ("Mein Guide"), falls freigeschaltet, sonst der
   *  Guide der aktuellen Klassenwelt. Bestimmt Portrait/Name im Notiz-Block. */
  noteGuideIcon: string
  /** Roh gespeicherte Wahl (auch falls gerade noch gesperrt) — nur fürs
   *  Vorauswählen im Picker. null = noch nichts gewählt. */
  preferredGuideIcon: string | null
  /** Datierte Rückschau: Meilensteine, eingesetzte Items, erloschene Flamme. */
  chronicle: ChronicleEntry[]
  /** Rucksack-Zugang als Icon+Overlay im Header. Nur setzen, wo keine volle
   *  Rucksack-Card daneben steht (Startseite) — auf `/streaks` = null. */
  rucksack?: RucksackState | null
  /** Arc-Chip (Theme + Guide + Info-Overlay) ausblenden, wo der Seitenkopf
   *  diese Rolle bereits übernimmt (AdventureHero auf `/streaks`). */
  showArcChip?: boolean
}

const CHRONICLE_META: Record<ChronicleEntry['kind'], { icon: string; color: string; fill: number }> = {
  milestone:   { icon: 'military_tech', color: '#C98A2B', fill: 1 },
  shield:      { icon: 'shield',        color: '#0F8A82', fill: 1 },
  crystal:     { icon: 'change_history', color: '#9C5FD1', fill: 1 },
  break:       { icon: 'local_fire_department', color: '#B8AF9C', fill: 0 },
  quest:       { icon: 'task_alt',      color: '#0F8A82', fill: 1 },
  guild_quest: { icon: 'diversity_3',   color: '#5965B8', fill: 1 },
  class_goal:  { icon: 'flag',          color: '#B8721E', fill: 1 },
  weekly_seal: { icon: 'workspace_premium', color: '#C98A2B', fill: 1 },
  riddle:      { icon: 'extension',     color: '#B8721E', fill: 1 },
}

/** Private Rückschau auf die eigene Reise — bewusst kein Vergleich mit
 *  anderen Schüler:innen. Kohärenz der Kennzahlen: alles Sichtbare fußt auf
 *  dem ELTERN-BESTÄTIGTEN Streak (`confirmedStreak`) — das ist der verdiente,
 *  flammen-tragende Wert; der (höhere) unbestätigte Streak wird nur als
 *  "warten auf Bestätigung" ausgewiesen. */
export default function HeldenbuchCard({ streak, confirmedStreak, broken, pendingMilestone, season, achievementCounts, guideNote, noteGuideIcon, preferredGuideIcon, chronicle, rucksack = null, showArcChip = true }: Props) {
  const theme = getSeasonTheme(season)
  // Der Guide, dessen Stimme gerade spricht (Mein Guide, falls gewählt +
  // freigeschaltet — sonst der Guide der aktuellen Klassenwelt). Fällt auf
  // theme zurück, falls der Icon-Key aus irgendeinem Grund nicht im
  // Fahrplan steht (kann praktisch nicht passieren, aber sauberer als crash).
  const noteArc = SCHOOL_YEAR_ARCS.find(a => a.icon === noteGuideIcon)
  const noteGuideName = noteArc?.guide ?? theme.guide
  const notePortrait = GUIDE_PORTRAIT[noteGuideIcon]
  const guideFirst = noteGuideName.split(' ').pop()
  const nextMilestone = MILESTONES.find(m => m > confirmedStreak)
  const flames = flameCount(confirmedStreak)
  const pending = Math.max(0, streak - confirmedStreak)

  const [arcInfoOpen, setArcInfoOpen] = useState(false)
  const [guidePickerOpen, setGuidePickerOpen] = useState(false)
  const [streakOpen, setStreakOpen] = useState(false)
  const [chronicleExpanded, setChronicleExpanded] = useState(false)

  const visibleChronicle = chronicleExpanded ? chronicle : chronicle.slice(0, 5)

  return (
    <div className="kh-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="msym text-[19px] text-kh-amber" style={{ fontVariationSettings: "'FILL' 1" }}>auto_stories</span>
        <h2 className="font-extrabold text-base text-kh-dark">Dein Heldenbuch</h2>
        {rucksack && <span className="ml-auto"><RucksackButton state={rucksack} /></span>}
      </div>

      {/* Aktueller Story-Arc — Klick öffnet Erklärung + Guide + Story-Kostprobe */}
      {showArcChip && (
        <button
          type="button"
          onClick={() => setArcInfoOpen(true)}
          className="flex items-center gap-1.5 mb-3 -mt-0.5 rounded-full bg-kh-amber/10 hover:bg-kh-amber/15 transition-colors pl-2 pr-2.5 py-1"
        >
          <span className="msym text-[14px] text-kh-amber" aria-hidden="true">{theme.icon}</span>
          <span className="text-[11.5px] font-bold text-kh-dark">{theme.name}</span>
          <span className="text-[10.5px] text-kh-muted">· {theme.guide}</span>
          <span className="msym text-[13px] text-kh-muted ml-0.5" aria-hidden="true">info</span>
        </button>
      )}

      {showArcChip && arcInfoOpen && <GuideInfoOverlay theme={theme} onClose={() => setArcInfoOpen(false)} />}

      {/* Streak-Zeile — Overlay mit Details erscheint beim Hover/Tap auf die Flammen */}
      <div className="flex items-center gap-3 mb-3">
        <span
          className="relative inline-flex group/streak flex-shrink-0"
          onClick={() => setStreakOpen(o => !o)}
        >
          {flames > 0 ? (
            <span className="flex items-center transition-transform group-hover/streak:-translate-y-0.5 cursor-default">
              {Array.from({ length: flames }).map((_, i) => (
                <img key={i} src="/flame.svg" alt="" className="w-7 h-7" style={{ marginLeft: i === 0 ? 0 : '-8px' }} />
              ))}
            </span>
          ) : (
            <span className="msym text-[28px] text-kh-muted/40 transition-transform group-hover/streak:-translate-y-0.5 cursor-default" style={{ fontVariationSettings: "'FILL' 0" }}>local_fire_department</span>
          )}

          <span
            className={`absolute top-full left-0 mt-2 z-30 w-max max-w-[230px] bg-white rounded-xl shadow-[0_8px_20px_rgba(20,40,45,.22)] p-3 text-left transition-opacity ${
              streakOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none group-hover/streak:opacity-100'
            }`}
          >
            <span className="block text-[10.5px] font-bold uppercase tracking-wide text-kh-muted mb-1">Dein Streak</span>
            <span className="block text-[13px] font-extrabold text-kh-dark">{confirmedStreak} HÜ in Folge</span>
            {pendingMilestone ? (
              <span className="block text-[11.5px] font-semibold text-kh-amber mt-1.5">Meilenstein {pendingMilestone} erreicht — wartet auf Bestätigung deiner Eltern.</span>
            ) : broken ? (
              <span className="block text-[11.5px] text-kh-muted font-medium mt-1.5">Deine Flamme ist gerade aus — im Rucksack liegt vielleicht ein Schild, der sie rettet.</span>
            ) : nextMilestone ? (
              <span className="block text-[11.5px] text-kh-muted font-medium mt-1.5">Noch {nextMilestone - confirmedStreak} bis zum nächsten Meilenstein ({nextMilestone}).</span>
            ) : null}
          </span>
        </span>

        <div>
          <p className="font-extrabold text-[15px] text-kh-dark leading-tight">{confirmedStreak} HÜ in Folge</p>
          {pending > 0 ? (
            <p className="text-[11.5px] text-kh-muted font-medium">+{pending} {pending === 1 ? 'wartet' : 'warten'} auf Bestätigung</p>
          ) : nextMilestone ? (
            <p className="text-[11.5px] text-kh-muted font-medium">Nächster Meilenstein bei {nextMilestone}</p>
          ) : null}
        </div>
      </div>

      {/* Stille Anerkennung — Guide-Portrait + private Beobachtung. Zeigt den
          persönlich gewählten Guide ("Mein Guide"), nicht zwangsläufig den
          der aktuellen Klassenwelt — die beiden können auseinanderlaufen. */}
      <div className="flex items-start gap-2.5 mb-4 rounded-xl bg-[#FAF8F3] p-3">
        {notePortrait ? (
          <img src={notePortrait} alt={noteGuideName} className="w-14 h-14 rounded-full object-cover object-top ring-2 ring-white shadow-sm flex-shrink-0 bg-[#EFEAE0]" />
        ) : (
          <span className="w-14 h-14 rounded-full bg-gradient-to-br from-[#E0A94B] to-[#B8721E] flex items-center justify-center flex-shrink-0 ring-2 ring-white shadow-sm">
            <span className="msym text-[26px] text-white" aria-hidden="true">{noteGuideIcon}</span>
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10.5px] font-bold text-kh-muted uppercase tracking-wide">{guideFirst} bemerkt</p>
            <button
              type="button"
              onClick={() => setGuidePickerOpen(true)}
              className="text-[10px] font-bold text-kh-teal hover:opacity-70 transition-opacity flex-shrink-0"
            >
              Mein Guide
            </button>
          </div>
          <p className="text-[12.5px] text-kh-dark/85 leading-snug mt-0.5">{guideNote.text}</p>
        </div>
      </div>

      {guidePickerOpen && (
        <GuidePickerModal
          currentIcon={preferredGuideIcon}
          currentThemeName={theme.name}
          onClose={() => setGuidePickerOpen(false)}
        />
      )}

      {/* Zweispaltig: Rückschau (links) · Wappen-Mosaik (rechts) */}
      <div className="flex gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-[10.5px] font-bold text-kh-muted uppercase tracking-wide mb-1.5">Logbuch</p>
          {chronicle.length === 0 ? (
            <p className="text-[12px] text-kh-muted font-medium leading-snug">
              Noch nichts eingetragen — die ersten 5 HÜ in Folge warten auf dich.
            </p>
          ) : (
            <>
              <div className="flex flex-col">
                {visibleChronicle.map((e, i) => {
                  const meta = CHRONICLE_META[e.kind]
                  return (
                    <div key={`${e.kind}-${e.date}-${i}`} className="flex items-center gap-2 py-1.5 border-b border-kh-border/40 last:border-0">
                      <span className="msym text-[14px] flex-shrink-0" style={{ color: meta.color, fontVariationSettings: `'FILL' ${meta.fill}` }}>{meta.icon}</span>
                      <span className="min-w-0">
                        <span className="block text-[12px] font-semibold text-kh-dark leading-tight truncate">{e.label}</span>
                        {e.note && (
                          <span className="text-[9.5px] font-bold text-kh-amber/80 flex items-center gap-0.5 leading-tight">
                            <span className="msym text-[10px]" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
                            {e.note}
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] text-kh-muted ml-auto flex-shrink-0">
                        {new Date(e.date).toLocaleDateString('de-AT', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  )
                })}
              </div>
              {chronicle.length > 5 && (
                <button
                  type="button"
                  onClick={() => setChronicleExpanded(x => !x)}
                  className="mt-1.5 text-[11px] font-bold text-kh-teal hover:opacity-70 transition-opacity flex items-center gap-0.5"
                >
                  {chronicleExpanded ? 'Weniger' : `Alle ${chronicle.length} zeigen`}
                  <span className="msym text-[14px]">{chronicleExpanded ? 'expand_less' : 'expand_more'}</span>
                </button>
              )}
            </>
          )}
        </div>

        <div className="flex-shrink-0 pt-0.5">
          <WappenMosaic counts={achievementCounts} />
        </div>
      </div>
    </div>
  )
}
