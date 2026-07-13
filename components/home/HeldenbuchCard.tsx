import { MILESTONES, flameCount, VETERAN_MILESTONE } from '@/lib/streak'
import { getSeasonTheme } from '@/lib/seasonTheme'
import StreakEmblem from './StreakEmblem'
import RucksackButton from '@/components/streaks/RucksackButton'
import type { RucksackState } from '@/components/streaks/RucksackItems'
import type { AchievementCounts } from '@/lib/achievements'

interface Milestone {
  milestone: number
  confirmed_at: string
}

interface Props {
  streak: number
  confirmedStreak: number
  broken: boolean
  jokerAvailable: boolean
  jokerUsedThisSeason: boolean
  pendingMilestone: number | null
  milestones: Milestone[]
  season: string
  achievementCounts: AchievementCounts
  /** Schild-Emblem (Streak-Joker) anzeigen. Auf der Abenteuer-Seite aus, weil
   *  der Schild dort als Item im Rucksack lebt — sonst doppelt. */
  showEmblem?: boolean
  /** Rucksack-Zugang als Icon+Overlay im Header. Nur setzen, wo keine volle
   *  Rucksack-Card daneben steht (Startseite) — auf `/streaks` = null. */
  rucksack?: RucksackState | null
}

/** Private Rückschau auf die eigene Reise — bewusst kein Vergleich mit
 *  anderen Schüler:innen (siehe Gamification-Plan: "Konzept bleibt,
 *  Vergleich geht"). Füllt die Sidebar-Lücke der entfernten StreakLeaderCard.
 *
 *  Kohärenz der Kennzahlen: alles Sichtbare fußt auf dem ELTERN-BESTÄTIGTEN
 *  Streak (`confirmedStreak`) — das ist der verdiente, flammen-tragende Wert.
 *  Der (höhere) unbestätigte Streak wird nur als "warten auf Bestätigung"
 *  ausgewiesen, damit große Zahl, Flammen und "nächster Meilenstein" nie
 *  widersprüchlich sind (früher: "12 in Folge · nächster bei 10"). */
export default function HeldenbuchCard({ streak, confirmedStreak, broken, jokerAvailable, jokerUsedThisSeason, pendingMilestone, milestones, season, achievementCounts, showEmblem = true, rucksack = null }: Props) {
  const theme = getSeasonTheme(season)
  const nextMilestone = MILESTONES.find(m => m > confirmedStreak)
  const totalAchievements = achievementCounts.quest + achievementCounts.guild_quest + achievementCounts.class_goal
  const flames = flameCount(confirmedStreak)
  const pending = Math.max(0, streak - confirmedStreak)

  return (
    <div className="kh-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="msym text-[19px] text-kh-amber" style={{ fontVariationSettings: "'FILL' 1" }}>auto_stories</span>
        <h2 className="font-extrabold text-base text-kh-dark">Dein Heldenbuch</h2>
        {rucksack && <span className="ml-auto"><RucksackButton state={rucksack} /></span>}
      </div>

      <div className="flex items-center gap-3 mb-3">
        {showEmblem && (
          <StreakEmblem streak={streak} broken={broken} jokerAvailable={jokerAvailable} jokerUsedThisSeason={jokerUsedThisSeason} pendingMilestone={pendingMilestone} />
        )}
        {flames > 0 ? (
          <div className="flex items-center flex-shrink-0">
            {Array.from({ length: flames }).map((_, i) => (
              <img key={i} src="/flame.svg" alt="" className="w-7 h-7" style={{ marginLeft: i === 0 ? 0 : '-8px' }} />
            ))}
          </div>
        ) : !showEmblem ? (
          <span className="msym text-[28px] text-kh-muted/40 flex-shrink-0" style={{ fontVariationSettings: "'FILL' 0" }}>local_fire_department</span>
        ) : null}
        <div>
          <p className="font-extrabold text-[15px] text-kh-dark leading-tight">{confirmedStreak} HÜ in Folge</p>
          {pending > 0 ? (
            <p className="text-[11.5px] text-kh-muted font-medium">+{pending} {pending === 1 ? 'wartet' : 'warten'} auf Bestätigung</p>
          ) : nextMilestone ? (
            <p className="text-[11.5px] text-kh-muted font-medium">Nächster Meilenstein bei {nextMilestone}</p>
          ) : null}
        </div>
      </div>

      {totalAchievements > 0 && (
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          <div className="rounded-lg bg-[#FAF8F3] px-2 py-2 text-center">
            <div className="font-extrabold text-[15px] text-kh-teal leading-none">{achievementCounts.quest}</div>
            <div className="text-[9.5px] text-kh-muted font-semibold mt-1">Quests</div>
          </div>
          <div className="rounded-lg bg-[#FAF8F3] px-2 py-2 text-center">
            <div className="font-extrabold text-[15px] text-kh-violet leading-none">{achievementCounts.guild_quest}</div>
            <div className="text-[9.5px] text-kh-muted font-semibold mt-1">Gilden-Erfolge</div>
          </div>
          <div className="rounded-lg bg-[#FAF8F3] px-2 py-2 text-center">
            <div className="font-extrabold text-[15px] text-kh-amber leading-none">{achievementCounts.class_goal}</div>
            <div className="text-[9.5px] text-kh-muted font-semibold mt-1">Klassenziele</div>
          </div>
        </div>
      )}

      {milestones.length === 0 ? (
        <p className="text-[12.5px] text-kh-muted font-medium">
          {theme.guide}: Noch keine Meilensteine — die ersten 5 HÜ in Folge warten auf dich.
        </p>
      ) : (
        <div className="rounded-lg bg-[#FAF8F3] px-3 py-1">
          {milestones.slice(0, 6).map(m => (
            <div
              key={`${m.milestone}-${m.confirmed_at}`}
              className="flex items-center gap-2 py-1.5 border-b border-kh-border/40 last:border-0"
            >
              <span className="msym text-[13px] text-kh-amber flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>military_tech</span>
              <span className="text-[12px] font-semibold text-kh-dark">{m.milestone} HÜ in Folge</span>
              {/* Leise Item-Notiz: Meilenstein 15 schaltet das Meistersiegel frei */}
              {m.milestone === VETERAN_MILESTONE && (
                <span className="text-[10px] font-bold text-kh-amber/80 flex items-center gap-0.5">
                  <span className="msym text-[11px]" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
                  Meistersiegel
                </span>
              )}
              <span className="text-[10.5px] text-kh-muted ml-auto flex-shrink-0">
                {new Date(m.confirmed_at).toLocaleDateString('de-AT', { day: 'numeric', month: 'short' })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
