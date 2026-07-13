import { getSeasonTheme, currentStageIndex } from '@/lib/seasonTheme'
import { SEASON_ART } from '@/components/streaks/seasonArt'

interface Props {
  season: string
  pct: number // 0–100, Klassenziel-Fortschritt
  target: number // Klassenziel-Zielwert (Anzahl HÜ)
}

export default function SeasonJourney({ season, pct, target }: Props) {
  const theme = getSeasonTheme(season)
  const clampedPct = Math.min(100, Math.max(0, pct))
  const activeStage = currentStageIndex(clampedPct, theme.stages.length)
  const Art = SEASON_ART[theme.icon]

  return (
    <div className="relative rounded-2xl bg-gradient-to-br from-[#EFEAE0] to-[#FAF8F3] px-4 pt-4 pb-5 mb-1 overflow-hidden">
      {Art && (
        <div className="absolute inset-0 pointer-events-none select-none">
          <Art />
        </div>
      )}

      <p className="relative text-[11.5px] font-bold text-kh-muted uppercase tracking-wide mb-4">
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
          const stageHw = Math.round((i / (theme.stages.length - 1)) * target)
          return (
            <div key={stage.label} className="relative flex-1 min-w-0 flex flex-col items-center gap-1.5 px-0.5">
              <div className="group relative">
                <div
                  className={`msym flex items-center justify-center rounded-full transition-all duration-300 flex-shrink-0 cursor-default ${
                    isCurrent ? 'w-8 h-8 text-[17px] md:w-9 md:h-9 md:text-[19px]' : 'w-6 h-6 text-[13px] md:w-7 md:h-7 md:text-[15px]'
                  }`}
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

                <div className="pointer-events-none absolute left-1/2 bottom-full -translate-x-1/2 mb-2 opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 z-10 whitespace-nowrap">
                  <div className="bg-kh-dark text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg shadow-lg">
                    {stage.label} · {stageHw} von {target} HÜ
                  </div>
                  <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-kh-dark" />
                </div>
              </div>
              <span className={`w-full text-[9px] md:text-[10.5px] font-semibold text-center leading-[1.15] break-words ${reached ? 'text-kh-dark' : 'text-kh-muted/60'} ${isCurrent ? '' : 'max-md:hidden'}`}>
                {stage.label}
              </span>
            </div>
          )
        })}
      </div>

      <p className="relative mt-4 text-[12.5px] text-kh-dark/80 italic leading-snug border-l-2 border-[#E8A020]/50 pl-3">
        {theme.stages[activeStage].story}
      </p>
    </div>
  )
}
