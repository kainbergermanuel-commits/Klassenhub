'use client'

import { useState } from 'react'
import Link from 'next/link'
import { getSeasonTheme, currentStageIndex, GUIDE_PORTRAIT } from '@/lib/seasonTheme'
import { SEASON_ART } from '@/components/streaks/seasonArt'
import GuideInfoOverlay from '@/components/streaks/GuideInfoOverlay'
import ReiseYearOverview from '@/components/streaks/ReiseYearOverview'
import type { Role } from '@/lib/types'

interface Props {
  season: string
  pct: number
  target: number | null
  role: Role
}

/** "Die Reise": alle Kapitel der aktuellen Klassenreise, durchblätterbar —
 *  nicht nur die aktuelle Etappe. Erreichte Kapitel zeigen den vollen
 *  Story-Text, künftige sind angeteasert/gesperrt. Rein lesend, keine neue
 *  Mechanik (Prinzip 4: Story lädt ein, sie zwingt nicht). */
export default function ReiseOverview({ season, pct, target, role }: Props) {
  const theme = getSeasonTheme(season)
  const clampedPct = Math.min(100, Math.max(0, pct))
  const activeStage = target ? currentStageIndex(clampedPct, theme.stages.length) : -1
  const Art = SEASON_ART[theme.icon]
  const portrait = GUIDE_PORTRAIT[theme.icon]
  const [guideInfoOpen, setGuideInfoOpen] = useState(false)
  const [tab, setTab] = useState<'aktuell' | 'jahr'>('aktuell')

  return (
    <>
      <header className="mb-6 flex items-center gap-3.5">
        <Link
          href="/streaks"
          className="w-9 h-9 rounded-xl bg-white border border-kh-border/60 flex items-center justify-center flex-shrink-0 hover:border-kh-teal transition-colors"
          aria-label="Zurück zum Abenteuer"
        >
          <span className="msym text-[18px] text-kh-muted">arrow_back</span>
        </Link>
        <div className="min-w-0">
          <h1 className="text-[25px] max-md:text-[22px] font-extrabold text-kh-dark tracking-tight leading-tight">Die Reise</h1>
          <p className="text-[13.5px] text-kh-muted font-medium leading-tight mt-0.5">
            {theme.name} · Begleitet von {theme.guide}
          </p>
        </div>
      </header>

      <div className="mb-5 flex gap-1.5 rounded-xl bg-[#F3F0EA] p-1 w-fit">
        {([
          ['aktuell', 'Aktuelle Welt'],
          ['jahr', 'Jahresübersicht'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`px-3.5 py-1.5 rounded-lg text-[13px] font-bold transition-colors ${
              tab === key ? 'bg-white text-kh-dark shadow-sm' : 'text-kh-muted hover:text-kh-dark'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'jahr' ? (
        <ReiseYearOverview currentThemeName={theme.name} />
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
                  <span className="text-[10.5px] font-bold uppercase tracking-wide text-kh-muted">Etappe {i + 1} von {theme.stages.length}</span>
                  {isCurrent && (
                    <span className="text-[9.5px] font-extrabold text-kh-amber bg-kh-amber/15 px-2 py-0.5 rounded-full">Aktuell</span>
                  )}
                </div>
                <h3 className="font-extrabold text-[16px] text-kh-dark mb-1.5">{stage.label}</h3>
                {locked ? (
                  <p className="text-[13px] text-kh-muted font-medium italic">
                    {theme.guide} verrät noch nichts — diese Etappe wartet, bis die Klasse dort ankommt.
                  </p>
                ) : (
                  <p className="text-[13.5px] text-kh-dark/85 leading-snug italic">{stage.story}</p>
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
