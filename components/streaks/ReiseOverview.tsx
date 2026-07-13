import Link from 'next/link'
import { getSeasonTheme, currentStageIndex } from '@/lib/seasonTheme'
import { SEASON_ART } from '@/components/streaks/seasonArt'
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

      <div className="relative rounded-2xl overflow-hidden mb-6">
        <div className="absolute inset-0 pointer-events-none select-none">
          {Art && <Art />}
        </div>
        <div className="relative bg-gradient-to-br from-[#EFEAE0]/70 to-[#FAF8F3]/70 px-5 py-4">
          {target ? (
            <>
              <p className="text-[11px] font-bold uppercase tracking-wide text-kh-muted mb-1">Klassenziel-Fortschritt</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 rounded-full bg-white/60 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#B8721E] to-[#F5C842] transition-all duration-700"
                    style={{ width: `${clampedPct}%` }}
                  />
                </div>
                <span className="text-[13px] font-extrabold text-kh-dark flex-shrink-0">{clampedPct}%</span>
              </div>
            </>
          ) : (
            <p className="text-[13px] text-kh-muted font-medium">
              {role === 'teacher' ? 'Noch kein Klassenziel für diesen Monat gesetzt.' : 'Die Klasse hat noch kein Ziel für diesen Monat.'}
            </p>
          )}
        </div>
      </div>

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
  )
}
