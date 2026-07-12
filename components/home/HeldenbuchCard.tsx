import { flameCount, MILESTONES } from '@/lib/streak'
import { getSeasonTheme } from '@/lib/seasonTheme'

interface Milestone {
  milestone: number
  confirmed_at: string
}

interface Props {
  streak: number
  confirmedStreak: number
  milestones: Milestone[]
  season: string
}

/** Private Rückschau auf die eigene Reise — bewusst kein Vergleich mit
 *  anderen Schüler:innen (siehe Gamification-Plan: "Konzept bleibt,
 *  Vergleich geht"). Füllt die Sidebar-Lücke der entfernten StreakLeaderCard. */
export default function HeldenbuchCard({ streak, confirmedStreak, milestones, season }: Props) {
  const theme = getSeasonTheme(season)
  const flames = flameCount(confirmedStreak)
  const nextMilestone = MILESTONES.find(m => m > confirmedStreak)

  return (
    <div className="kh-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="msym text-[19px] text-kh-amber" style={{ fontVariationSettings: "'FILL' 1" }}>auto_stories</span>
        <h2 className="font-extrabold text-base text-kh-dark">Dein Heldenbuch</h2>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center flex-shrink-0">
          {flames > 0
            ? Array.from({ length: flames }).map((_, i) => (
                <img key={i} src="/flame.svg" alt="" className="w-6 h-6" style={{ marginLeft: i === 0 ? 0 : '-7px' }} />
              ))
            : <span className="msym text-[24px] text-kh-muted/40" style={{ fontVariationSettings: "'FILL' 0" }}>local_fire_department</span>}
        </div>
        <div>
          <p className="font-extrabold text-[15px] text-kh-dark leading-tight">{streak} HÜ in Folge</p>
          {nextMilestone && (
            <p className="text-[11.5px] text-kh-muted font-medium">Nächster Meilenstein bei {nextMilestone}</p>
          )}
        </div>
      </div>

      {milestones.length === 0 ? (
        <p className="text-[12.5px] text-kh-muted font-medium">
          {theme.guide}: Noch keine Meilensteine — die ersten 5 HÜ in Folge warten auf dich.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {milestones.slice(0, 5).map(m => (
            <div key={m.milestone} className="flex items-center gap-2 rounded-lg bg-[#FAF8F3] px-2.5 py-1.5">
              <span className="msym text-[14px] text-kh-amber flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>military_tech</span>
              <span className="text-[12px] font-semibold text-kh-dark flex-1">{m.milestone} HÜ in Folge</span>
              <span className="text-[10.5px] text-kh-muted flex-shrink-0">
                {new Date(m.confirmed_at).toLocaleDateString('de-AT', { day: 'numeric', month: 'short' })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
