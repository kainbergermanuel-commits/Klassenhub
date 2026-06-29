import Link from 'next/link'
import { flameCount } from '@/lib/streak'
import Avatar from '@/components/ui/Avatar'

export interface StreakEntry {
  id: string
  full_name: string
  avatar_color: string
  avatar_seed: string | null
  avatar_hair_color: string | null
  avatar_skin_color: string | null
  streak: number
}

interface Props {
  entries: StreakEntry[]
}

export default function StreakLeaderCard({ entries }: Props) {
  const top5 = entries.slice(0, 5)
  const maxStreak = top5[0]?.streak ?? 1

  if (top5.length === 0) {
    return (
      <div className="bg-white rounded-[20px] p-5 shadow-sm border border-kh-border/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <img src="/flame.svg" alt="" className="w-6 h-6" />
            <h2 className="font-extrabold text-base text-kh-dark">Streak-Rangliste</h2>
          </div>
        </div>
        <p className="text-sm text-kh-muted font-medium">Noch keine aktiven Streaks.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-[20px] p-5 shadow-sm border border-kh-border/50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <img src="/flame.svg" alt="" className="w-6 h-6" />
          <h2 className="font-extrabold text-base text-kh-dark">Streak-Rangliste</h2>
        </div>
        <Link href="/streaks" className="text-sm font-semibold text-kh-teal hover:underline">
          Alle anzeigen
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        {top5.map((entry, i) => {
          const barWidth = Math.round((entry.streak / maxStreak) * 100)
          const isFirst = i === 0

          return (
            <div key={entry.id} className="flex items-center gap-3">
              {/* Rank */}
              <span className={`w-5 text-center text-[12px] font-extrabold flex-shrink-0 ${
                i === 0 ? 'text-kh-amber' : i === 1 ? 'text-[#9CA3AF]' : i === 2 ? 'text-[#C4A35A]' : 'text-kh-muted/50'
              }`}>
                {i + 1}
              </span>

              {/* Avatar */}
              <Avatar name={entry.full_name} color={entry.avatar_color} seed={entry.avatar_seed} hairColor={entry.avatar_hair_color} skinColor={entry.avatar_skin_color} size={32} />

              {/* Name + bar */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[13px] font-semibold text-kh-dark truncate ${isFirst ? 'font-extrabold' : ''}`}>
                    {entry.full_name.split(' ')[0]}
                  </span>
                  <span className="flex items-center text-[12px] font-bold text-kh-amber ml-2 flex-shrink-0">
                    {flameCount(entry.streak) > 0
                      ? Array.from({ length: flameCount(entry.streak) }).map((_, fi) => (
                          <img key={fi} src="/flame.svg" alt="" className="w-5 h-5" style={{ marginLeft: fi === 0 ? 0 : '-4px' }} />
                        ))
                      : null}
                    {entry.streak}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[#F3F0EA] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
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

      {entries.length > 5 && (
        <div className="mt-4 pt-3 border-t border-kh-border/40 text-center">
          <Link href="/streaks" className="text-[12.5px] font-semibold text-kh-teal hover:underline">
            +{entries.length - 5} weitere Schüler:innen anzeigen
          </Link>
        </div>
      )}
    </div>
  )
}
