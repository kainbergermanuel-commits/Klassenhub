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
    <Link href="/streaks" className={`relative flex-shrink-0 flex flex-col items-end gap-1 group ${className}`}>
      <span className="text-[11px] font-bold text-kh-muted/70 group-hover:text-kh-teal transition-colors whitespace-nowrap">
        Klassenziel · {done}/{goal.target} HÜ
      </span>
      <div className="w-28 h-1.5 rounded-full bg-kh-dark/8 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #E8A020 0%, #F5C842 100%)' }}
        />
      </div>
    </Link>
  )
}
