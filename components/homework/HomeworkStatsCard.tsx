'use client'

import { useId } from 'react'
import { Ring } from '@/components/home/statParts'
import type { HomeworkWithStatus, Role } from '@/lib/types'

interface Props {
  homework: HomeworkWithStatus[]
  stats: { open: number; done: number; missed: number }
  role: Role
  studentCount: number
}

/**
 * Statistik-Karte für die HÜ-Seite — für Schüler/Eltern die persönliche
 * Erledigungsquote, für Lehrer die Abgabequote der Klasse. Beide Varianten
 * nutzen kräftige Verlaufsflächen (statt flacher Pastellfarben) für Ring,
 * Chips und Balken, damit die Karte neben dem sonst eher ruhigen Listen-Layout
 * als klarer visueller Anker wirkt.
 */
export default function HomeworkStatsCard({ homework, stats, role, studentCount }: Props) {
  const gradId = useId()
  const published = homework.filter(h => h.status === 'published')

  if (role === 'teacher') {
    const totalPossible = studentCount * published.length
    const totalDone = published.reduce((s, h) => s + (h.completion_count ?? 0), 0)
    const pct = totalPossible > 0 ? Math.round((totalDone / totalPossible) * 100) : 0

    const bySubject = new Map<string, { name: string; color: string; done: number; possible: number }>()
    for (const hw of published) {
      const entry = bySubject.get(hw.subject) ?? { name: hw.subject, color: hw.subject_color, done: 0, possible: 0 }
      entry.done += hw.completion_count ?? 0
      entry.possible += studentCount
      bySubject.set(hw.subject, entry)
    }
    const subjectRows = Array.from(bySubject.values()).sort((a, b) => b.possible - a.possible)

    return (
      <div className="kh-card p-4 overflow-hidden">
        <GradientDefs id={gradId} />
        <div className="flex items-center gap-1.5 mb-4">
          <span className="msym text-[16px] text-kh-muted" style={{ fontVariationSettings: "'FILL' 1" }}>insights</span>
          <h3 className="text-[11px] font-bold text-kh-muted uppercase tracking-wide">Klassen-Statistik</h3>
        </div>

        <div className="flex items-center gap-4">
          <Ring pct={pct} color={`url(#${gradId}-teal)`}>
            <span className="text-[17px] font-extrabold text-kh-dark tabular-nums leading-none">{pct}%</span>
            <span className="text-[9px] font-bold text-kh-muted mt-0.5">Abgaben</span>
          </Ring>
          <div className="flex-1 min-w-0 flex flex-col gap-1.5">
            <GradientChip gradient="gradient-amber" icon="pending" fill={0} label="anstehend" value={stats.open} />
            <GradientChip gradient="gradient-teal" icon="fact_check" fill={1} label="Abgaben" value={totalDone} />
            <GradientChip gradient="gradient-slate" icon="event_busy" fill={0} label="vergangen" value={stats.missed} />
          </div>
        </div>

        {subjectRows.length > 0 && (
          <div className="mt-4 pt-4 border-t border-kh-border/50 flex flex-col gap-2.5">
            {subjectRows.map(row => {
              const rowPct = row.possible > 0 ? Math.round((row.done / row.possible) * 100) : 0
              return (
                <div key={row.name}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="flex items-center gap-1.5 text-[12px] font-semibold text-kh-dark truncate">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: row.color }} />
                      {row.name}
                    </span>
                    <span className="text-[11px] font-bold text-kh-muted flex-shrink-0 tabular-nums">{rowPct}%</span>
                  </div>
                  <div className="w-full h-[5px] rounded-full bg-[#EFE9DC] overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${rowPct}%`, background: `linear-gradient(90deg, ${row.color} 0%, ${row.color}99 100%)` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  const total = stats.open + stats.done + stats.missed
  const donePct = total > 0 ? Math.round((stats.done / total) * 100) : 0

  const bySubject = new Map<string, { name: string; color: string; done: number; total: number }>()
  for (const hw of published) {
    const entry = bySubject.get(hw.subject) ?? { name: hw.subject, color: hw.subject_color, done: 0, total: 0 }
    entry.total += 1
    if (hw.done) entry.done += 1
    bySubject.set(hw.subject, entry)
  }
  const subjectRows = Array.from(bySubject.values()).sort((a, b) => b.total - a.total)

  return (
    <div className="kh-card p-4 overflow-hidden">
      <GradientDefs id={gradId} />
      <div className="flex items-center gap-1.5 mb-4">
        <span className="msym text-[16px] text-kh-muted" style={{ fontVariationSettings: "'FILL' 1" }}>insights</span>
        <h3 className="text-[11px] font-bold text-kh-muted uppercase tracking-wide">Deine Statistik</h3>
      </div>

      <div className="flex items-center gap-4">
        <Ring pct={donePct} color={`url(#${gradId}-teal)`}>
          <span className="text-[17px] font-extrabold text-kh-dark tabular-nums leading-none">{donePct}%</span>
          <span className="text-[9px] font-bold text-kh-muted mt-0.5">erledigt</span>
        </Ring>
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <GradientChip gradient="gradient-amber" icon="pending" fill={0} label="offen" value={stats.open} />
          <GradientChip gradient="gradient-teal" icon="check_circle" fill={1} label="erledigt" value={stats.done} />
          <GradientChip gradient="gradient-red" icon="cancel" fill={0} label="versäumt" value={stats.missed} />
        </div>
      </div>

      {subjectRows.length > 0 && (
        <div className="mt-4 pt-4 border-t border-kh-border/50 flex flex-col gap-2.5">
          {subjectRows.map(row => {
            const pct = row.total > 0 ? Math.round((row.done / row.total) * 100) : 0
            return (
              <div key={row.name}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="flex items-center gap-1.5 text-[12px] font-semibold text-kh-dark truncate">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: row.color }} />
                    {row.name}
                  </span>
                  <span className="text-[11px] font-bold text-kh-muted flex-shrink-0 tabular-nums">{row.done}/{row.total}</span>
                </div>
                <div className="w-full h-[5px] rounded-full bg-[#EFE9DC] overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${row.color} 0%, ${row.color}99 100%)` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/** Unsichtbare SVG-Defs mit den Ring-Verläufen — wird per `url(#id)` von der Ring-Komponente referenziert. */
function GradientDefs({ id }: { id: string }) {
  return (
    <svg width={0} height={0} className="absolute">
      <defs>
        <linearGradient id={`${id}-teal`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0F8A82" />
          <stop offset="100%" stopColor="#3DB5AC" />
        </linearGradient>
      </defs>
    </svg>
  )
}

const GRADIENTS: Record<string, string> = {
  'gradient-teal': 'linear-gradient(135deg, #0F8A82 0%, #3DB5AC 100%)',
  'gradient-amber': 'linear-gradient(135deg, #C98A2B 0%, #E0A94B 100%)',
  'gradient-red': 'linear-gradient(135deg, #C95040 0%, #E08A7C 100%)',
  'gradient-slate': 'linear-gradient(135deg, #6E7E80 0%, #96A3A4 100%)',
}

function GradientChip({ gradient, icon, fill, label, value }: { gradient: keyof typeof GRADIENTS; icon: string; fill: 0 | 1; label: string; value: number }) {
  return (
    <div
      className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 shadow-[0_3px_10px_rgba(20,40,45,.12)]"
      style={{ background: GRADIENTS[gradient] }}
    >
      <span className="msym text-[15px] text-white" style={{ fontVariationSettings: `'FILL' ${fill}` }}>{icon}</span>
      <span className="text-[13px] font-extrabold text-white tabular-nums">{value}</span>
      <span className="text-[11.5px] font-semibold text-white/90">{label}</span>
    </div>
  )
}
