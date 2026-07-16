'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getSeasonTheme } from '@/lib/seasonTheme'
import { monthLabel } from '@/lib/date'

interface Props {
  goal: { target: number; reward: string | null } | null
  done: number
  season: string
}

/** Klassenziel-Card für die rechte Nav der Lehrer-Startseite, unter dem
 *  Termine/Erinnerungen-Panel. War vorher ein transluzentes Glas-Badge im
 *  Header (ClassGoalBadge, über dem Seitenhintergrund gedacht) — als eigene
 *  Sidebar-Card jetzt im selben soliden Stil wie AgendaPanel (weiß, Rand,
 *  Schatten), mit mehr Kontext: Welt-Name, Ziel-Titel, Etappen-Fortschritt
 *  in Zahlen, Monat und optionale Belohnung. */
export default function ClassGoalCard({ goal, done, season }: Props) {
  const theme = getSeasonTheme(season)
  const pct = goal ? Math.min(100, Math.round((done / goal.target) * 100)) : 0
  const reached = goal ? done >= goal.target : false

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
      className="block bg-white rounded-[20px] p-5 shadow-sm border border-kh-border/50 hover:border-kh-teal/40 transition-colors max-md:rounded-2xl max-md:border-0 max-md:bg-gradient-to-br max-md:from-white max-md:via-white max-md:to-kh-page max-md:shadow-[0_8px_16px_rgba(20,40,45,.10)]"
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <h2 className="flex items-start gap-2 font-extrabold text-base text-kh-dark leading-snug min-w-0">
          <span className="msym text-[20px] text-[#B9791A] flex-shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>{theme.icon}</span>
          <span className="line-clamp-2">{theme.goalTitle}</span>
        </h2>
        <span className="text-[11.5px] font-semibold text-kh-muted flex-shrink-0 whitespace-nowrap mt-0.5">{monthLabel(`${season}-01`)}</span>
      </div>
      <p className="text-[12.5px] text-kh-muted font-medium mb-3.5">
        {theme.name} · {done} von {goal.target} {theme.stepNoun}
        {reached && <span className="ml-1">🎉</span>}
      </p>

      <div className="relative w-full h-2.5 rounded-full bg-[#F1ECE1] overflow-visible mt-2">
        <div className="absolute inset-0 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-[width] duration-[1200ms] ease-out"
            style={{ width: `${animatedPct}%`, background: 'linear-gradient(90deg, #E8A020 0%, #F5C842 55%, #FBDD85 100%)' }}
          />
        </div>
        <span
          className="msym absolute -top-4 -translate-x-1/2 text-[19px] leading-none transition-[left] duration-[1200ms] ease-out text-[#B9791A]"
          style={{ left: `${animatedPct}%`, fontVariationSettings: "'FILL' 1" }}
        >
          {theme.icon}
        </span>
      </div>

      <div className="flex items-center justify-between mt-3.5">
        <span className="text-[13px] font-extrabold text-[#B9791A]">{pct}%</span>
        {goal.reward && (
          <span className="text-[12px] text-kh-muted font-medium flex items-center gap-1 min-w-0">
            <span className="msym text-[14px] flex-shrink-0">redeem</span>
            <span className="truncate">{goal.reward}</span>
          </span>
        )}
      </div>
    </Link>
  )
}
