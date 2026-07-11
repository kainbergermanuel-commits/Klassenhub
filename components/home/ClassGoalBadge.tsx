'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

interface Props {
  goal: { target: number; reward: string | null } | null
  done: number
  className?: string
}

/** Sehr dezenter Fortschritts-Hinweis fürs Klassenziel, für den Startseiten-Header. */
export default function ClassGoalBadge({ goal, done, className = '' }: Props) {
  const pct = goal ? Math.min(100, Math.round((done / goal.target) * 100)) : 0

  const [animatedPct, setAnimatedPct] = useState(0)
  useEffect(() => {
    if (!goal) return
    const id = requestAnimationFrame(() => setAnimatedPct(pct))
    return () => cancelAnimationFrame(id)
  }, [goal, pct])

  if (!goal) return null

  return (
    <Link
      href="/streaks"
      className={`relative flex-shrink-0 w-full flex flex-col items-end gap-1.5 group bg-white/25 backdrop-blur-md border border-white/40 px-5 py-3 rounded-2xl shadow-[0_4px_16px_rgba(20,40,45,.10)] ${className}`}
    >
      <div className="w-full flex items-center justify-between gap-2">
        <span className="text-[12px] font-bold text-kh-dark whitespace-nowrap" style={{ textShadow: '0 1px 4px rgba(255,255,255,.6)' }}>
          Bergexpedition
        </span>
        <span className="text-[13px] font-extrabold text-[#B9791A] whitespace-nowrap" style={{ textShadow: '0 1px 4px rgba(255,255,255,.6)' }}>
          {pct}%
        </span>
      </div>
      <div className="relative w-full h-2.5 rounded-full bg-white/40 overflow-visible">
        <div className="absolute inset-0 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-[width] duration-[1200ms] ease-out"
            style={{ width: `${animatedPct}%`, background: 'linear-gradient(90deg, #E8A020 0%, #F5C842 55%, #FBDD85 100%)' }}
          />
        </div>
        <span
          className="absolute -top-4 -translate-x-1/2 text-[22px] leading-none transition-[left] duration-[1200ms] ease-out"
          style={{ left: `${animatedPct}%` }}
        >
          🏔️
        </span>
      </div>
    </Link>
  )
}
