import Link from 'next/link'

interface Props {
  goal: { target: number; reward: string | null } | null
  done: number
  className?: string
}

/** Sehr dezenter Fortschritts-Hinweis fürs Klassenziel, für den Startseiten-Header. */
export default function ClassGoalBadge({ goal, done, className = '' }: Props) {
  if (!goal) return null
  const pct = Math.min(100, Math.round((done / goal.target) * 100))

  return (
    <Link
      href="/streaks"
      className={`relative flex-shrink-0 w-full flex flex-col items-end gap-1.5 group bg-white/25 backdrop-blur-md border border-white/40 px-5 py-3 rounded-2xl shadow-[0_4px_16px_rgba(20,40,45,.10)] ${className}`}
    >
      <span className="text-[12px] font-bold text-kh-dark whitespace-nowrap" style={{ textShadow: '0 1px 4px rgba(255,255,255,.6)' }}>
        Klassenziel · {done}/{goal.target} HÜ
      </span>
      <div className="w-full h-2.5 rounded-full bg-white/40 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #E8A020 0%, #F5C842 100%)' }}
        />
      </div>
    </Link>
  )
}
