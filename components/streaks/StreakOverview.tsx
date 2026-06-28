import { flameCount } from '@/lib/streak'
import { monthLabel } from '@/lib/date'
import type { Role } from '@/lib/types'
import Avatar from '@/components/ui/Avatar'

interface StudentStreak {
  id: string
  full_name: string
  avatar_color: string
  avatar_seed: string | null
  avatar_hair_color: string | null
  avatar_skin_color: string | null
  streak: number
  pendingMilestone: number | null
  confirmedMilestones: Array<{ milestone: number; confirmed_at: string }>
}

interface MilestoneEvent {
  studentName: string
  milestone: number
  confirmed_at: string
}

interface RaceEntry {
  id: string
  full_name: string
  avatar_color: string
  avatar_seed: string | null
  avatar_hair_color: string | null
  avatar_skin_color: string | null
  streak: number
}

interface Props {
  role: Role
  withStreak: StudentStreak[]
  noStreak: StudentStreak[]
  milestoneHistory: Record<string, MilestoneEvent[]>
  daysLeft: number
  prevRace: RaceEntry[]
  prevMonthLabel: string
}

function MilestoneChip({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-kh-green/15 text-kh-green">
      ✓ {value} HÜ
    </span>
  )
}

export default function StreakOverview({ role, withStreak, noStreak, milestoneHistory, daysLeft, prevRace, prevMonthLabel }: Props) {
  const maxStreak = withStreak[0]?.streak ?? 1
  const sortedMonths = Object.keys(milestoneHistory).sort((a, b) => b.localeCompare(a))

  return (
    <>
      <header className="mb-6">
        <div className="flex items-center gap-2.5 mb-1">
          <img src="/flame.svg" alt="" className="w-8 h-8" />
          <h1 className="text-[25px] font-extrabold text-kh-dark tracking-tight">Streaks</h1>
        </div>
        <p className="text-[13.5px] text-kh-muted font-medium">
          Aufeinanderfolgende erledigte Hausübungen · {withStreak.length} aktive Streaks
        </p>
      </header>

      <div className="flex flex-col gap-6">
        {/* Active streaks */}
        <div className="bg-white rounded-[20px] p-5 shadow-sm border border-kh-border/50">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="font-extrabold text-base text-kh-dark">Aktuelle Streaks</h2>
            <span className="flex items-center gap-1 text-[12px] font-semibold text-kh-muted">
              <span className="msym text-[14px]">hourglass_bottom</span>
              Race endet in {daysLeft} {daysLeft === 1 ? 'Tag' : 'Tagen'}
            </span>
          </div>

          {withStreak.length === 0 ? (
            <p className="text-sm text-kh-muted font-medium">Noch keine aktiven Streaks.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {withStreak.map((s, i) => {
                const barWidth = Math.round((s.streak / maxStreak) * 100)
                const confirmedSet = new Set(s.confirmedMilestones.map(c => c.milestone))
                const milestones = [5, 10, 15, 20].filter(m => confirmedSet.has(m) && m <= s.streak)
                const topConfirmedMilestone = s.confirmedMilestones.length > 0 ? Math.max(...s.confirmedMilestones.map(c => c.milestone)) : 0
                const activeMilestone = topConfirmedMilestone <= s.streak ? topConfirmedMilestone : 0

                return (
                  <div key={s.id} className="flex items-start gap-3">
                    {/* Rank */}
                    <span className={`w-6 pt-1 text-center text-[12px] font-extrabold flex-shrink-0 ${
                      i === 0 ? 'text-kh-amber' : i === 1 ? 'text-[#9CA3AF]' : i === 2 ? 'text-[#C4A35A]' : 'text-kh-muted/50'
                    }`}>
                      {i + 1}
                    </span>

                    {/* Avatar */}
                    <Avatar name={s.full_name} color={s.avatar_color} seed={s.avatar_seed} hairColor={s.avatar_hair_color} skinColor={s.avatar_skin_color} size={40} className="mt-0.5" />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-extrabold text-[14px] text-kh-dark">
                          {s.full_name}
                          {i === 0 && <span className="ml-1.5 text-[16px]">🥇</span>}
                          {i === 1 && <span className="ml-1.5 text-[16px]">🥈</span>}
                          {i === 2 && <span className="ml-1.5 text-[16px]">🥉</span>}
                        </span>
                        <span className="flex items-center gap-0.5 text-[13px] font-extrabold text-kh-amber flex-shrink-0">
                          {flameCount(activeMilestone) > 0
                            ? Array.from({ length: flameCount(activeMilestone) }).map((_, fi) => (
                                <img key={fi} src="/flame.svg" alt="" className="w-4 h-4" />
                              ))
                            : null}
                          {s.streak}
                        </span>
                      </div>

                      {/* Streak bar */}
                      <div className="h-2.5 rounded-full bg-[#F3F0EA] overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${barWidth}%`,
                            background: i === 0
                              ? 'linear-gradient(90deg, #E8A020 0%, #F5C842 100%)'
                              : i === 1
                                ? 'linear-gradient(90deg, #9CA3AF 0%, #C7CDD5 100%)'
                                : i === 2
                                  ? 'linear-gradient(90deg, #C4A35A 0%, #D4B86A 100%)'
                                  : 'linear-gradient(90deg, #0F8A82 0%, #14B8A9 100%)',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Milestone history */}
        {sortedMonths.length > 0 && (
          <div className="bg-white rounded-[20px] p-5 shadow-sm border border-kh-border/50">
            <h2 className="font-extrabold text-base text-kh-dark mb-4">Bestätigte Meilensteine</h2>
            <div className="flex flex-col gap-5">
              {sortedMonths.map(month => (
                <div key={month}>
                  <div className="text-[12px] font-bold text-kh-muted uppercase tracking-wide mb-2.5">
                    {monthLabel(month + '-01')}
                  </div>
                  <div className="flex flex-col gap-2">
                    {milestoneHistory[month].sort((a, b) => b.milestone - a.milestone).map((e, i) => (
                      <div key={i} className="flex items-center gap-3 py-2 px-3 bg-[#FAF8F3] rounded-xl">
                        <span className="msym text-[18px] text-kh-green flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
                          verified
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-[13.5px] text-kh-dark">{e.studentName}</div>
                          <div className="text-[12px] text-kh-muted font-medium">
                            Meilenstein {e.milestone} HÜ · bestätigt am {new Date(e.confirmed_at).toLocaleDateString('de-AT', { day: 'numeric', month: 'short' })}
                          </div>
                        </div>
                        <span className="bg-kh-green/15 text-kh-green text-[11px] font-extrabold px-2.5 py-1 rounded-full flex-shrink-0">
                          🔥 {e.milestone}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Previous month race */}
        {prevRace.length > 0 && (
          <div className="bg-white rounded-[20px] p-5 shadow-sm border border-kh-border/50">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="font-extrabold text-base text-kh-dark">Letztes Race</h2>
              <span className="text-[12px] font-semibold text-kh-muted">{monthLabel(prevMonthLabel + '-01')}</span>
            </div>
            <div className="flex flex-col gap-3">
              {prevRace.map((s, i) => {
                const maxS = prevRace[0]?.streak ?? 1
                const barWidth = Math.round((s.streak / maxS) * 100)
                return (
                  <div key={s.id} className="flex items-center gap-3">
                    <span className={`w-6 text-center text-[12px] font-extrabold flex-shrink-0 ${
                      i === 0 ? 'text-kh-amber' : i === 1 ? 'text-[#9CA3AF]' : i === 2 ? 'text-[#C4A35A]' : 'text-kh-muted/50'
                    }`}>{i + 1}</span>
                    <Avatar name={s.full_name} color={s.avatar_color} seed={s.avatar_seed} hairColor={s.avatar_hair_color} skinColor={s.avatar_skin_color} size={32} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[13px] font-semibold text-kh-dark truncate">{s.full_name.split(' ')[0]}</span>
                        <span className="flex items-center gap-0.5 text-[12px] font-bold text-kh-amber ml-2 flex-shrink-0">
                          {flameCount(s.streak) > 0 && Array.from({ length: flameCount(s.streak) }).map((_, fi) => (
                            <img key={fi} src="/flame.svg" alt="" className="w-4 h-4" />
                          ))}
                          {s.streak}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-[#F3F0EA] overflow-hidden">
                        <div className="h-full rounded-full" style={{
                          width: `${barWidth}%`,
                          background: i === 0
                            ? 'linear-gradient(90deg, #E8A020 0%, #F5C842 100%)'
                            : i === 1 ? 'linear-gradient(90deg, #9CA3AF 0%, #C7CDD5 100%)'
                            : i === 2 ? 'linear-gradient(90deg, #C4A35A 0%, #D4B86A 100%)'
                            : 'linear-gradient(90deg, #0F8A82 0%, #14B8A9 100%)',
                        }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Students without streak (teacher only) */}
        {role === 'teacher' && noStreak.length > 0 && (
          <div className="bg-white rounded-[20px] p-5 shadow-sm border border-kh-border/50">
            <h2 className="font-extrabold text-base text-kh-dark mb-3">Ohne aktive Streak</h2>
            <div className="flex flex-wrap gap-2">
              {noStreak.map(s => (
                <div key={s.id} className="flex items-center gap-2 bg-[#FAF8F3] rounded-xl px-3 py-2">
                  <Avatar name={s.full_name} color={s.avatar_color} seed={s.avatar_seed} hairColor={s.avatar_hair_color} skinColor={s.avatar_skin_color} size={28} />
                  <span className="text-[13px] font-semibold text-kh-muted">{s.full_name.split(' ')[0]}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
