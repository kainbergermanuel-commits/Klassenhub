import { flameCount } from '@/lib/streak'

interface Props {
  streak: number
  pendingMilestone: number | null
}

export default function StreakBanner({ streak, pendingMilestone }: Props) {
  if (streak === 0) return null
  const flames = flameCount(streak)

  return (
    <div className={`rounded-[20px] p-4 flex items-center gap-4 ${pendingMilestone ? 'bg-[#FFF3CD] border border-[#F0C040]' : 'bg-kh-teal-light border border-kh-teal/30'}`}>
      <div className="flex items-center gap-0.5 flex-shrink-0 select-none">
        {flames > 0
          ? Array.from({ length: flames }).map((_, i) => <img key={i} src="/flame.svg" alt="" className="w-8 h-8" />)
          : <span className="text-2xl font-extrabold text-kh-muted">{streak}</span>}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`font-extrabold text-[16px] ${pendingMilestone ? 'text-[#8A6200]' : 'text-kh-dark'}`}>
          {streak} HÜ in Folge erledigt!
        </div>
        {pendingMilestone ? (
          <div className="text-[12.5px] font-semibold text-[#A07800] mt-0.5">
            Meilenstein erreicht · Warte auf Bestätigung deiner Eltern
          </div>
        ) : (
          <div className="text-[12.5px] font-semibold text-kh-teal mt-0.5">
            Weiter so — nächster Meilenstein bei {Math.ceil(streak / 5) * 5} HÜ
          </div>
        )}
      </div>
      <div className={`text-3xl font-extrabold flex-shrink-0 ${pendingMilestone ? 'text-[#F0C040]' : 'text-kh-teal'}`}>
        {streak}
      </div>
    </div>
  )
}
