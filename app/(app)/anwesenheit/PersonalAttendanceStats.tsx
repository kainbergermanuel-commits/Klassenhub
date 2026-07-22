'use client'

import { useMemo } from 'react'
import { schoolYearStartISO } from '@/lib/date'
import { buildAttendanceStats } from '@/lib/attendanceStats'
import { Ring } from '@/components/home/statParts'
import type { Attendance } from '@/lib/types'

const MONTH_SHORT = ['Jän', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
const WEEKDAY_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr']

/** Kompakte persönliche Anwesenheits-Statistik (ein Kind) für Eltern- und
 *  Schüler-Ansicht — dieselbe Rechen-Lib wie die Lehrer-Statistik, studentCount=1.
 *  Bewusst schlichter (kein Klassen-Filter, kein Vergleich): der eigene
 *  Jahresverlauf, das Wochentags-Muster und – für Eltern – die eigene
 *  Melde-Rechtzeitigkeit. */
export default function PersonalAttendanceStats({ entries, today, role }: { entries: Attendance[]; today: string; role: 'parent' | 'student' }) {
  const s = useMemo(() => buildAttendanceStats(entries, {
    studentCount: 1,
    startISO: schoolYearStartISO(new Date(`${today}T00:00:00`)),
    endISO: today,
    statusFilter: 'all',
  }), [entries, today])

  const timelyPct = s.parent.total > 0 ? Math.round((s.parent.timely / s.parent.total) * 100) : null

  return (
    <section className="kh-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="msym text-[20px] text-kh-green">insights</span>
        <h2 className="font-extrabold text-[16px] text-kh-dark">Statistik</h2>
        <span className="ml-auto text-[12px] text-kh-muted font-medium">seit Schuljahresbeginn</span>
      </div>

      {/* Zwei Kennzahlen */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="kh-card-flat p-3.5 flex items-center gap-3">
          <div className="scale-[0.82] origin-left">
            <Ring pct={s.presentRate} color="#2E9C6E"><span className="text-[12px] font-extrabold text-kh-dark tabular-nums">{Math.round(s.presentRate)}</span></Ring>
          </div>
          <div className="min-w-0">
            <div className="text-[22px] font-extrabold text-kh-dark leading-none tabular-nums">{s.presentRate}<span className="text-[13px] text-kh-muted font-bold">%</span></div>
            <div className="text-[11.5px] font-medium text-kh-muted mt-1">Anwesenheitsquote</div>
          </div>
        </div>
        <div className="kh-card-flat p-3.5">
          <div className="text-[22px] font-extrabold text-kh-dark leading-none tabular-nums">{s.total}</div>
          <div className="text-[11.5px] font-medium text-kh-muted mt-1">{s.total === 1 ? 'Fehltag' : 'Fehltage'}</div>
          {s.total > 0 && (
            <div className="text-[11.5px] font-semibold text-kh-muted mt-2 flex gap-2">
              <span className="text-kh-amber">{s.excused} entsch.</span>
              {s.unexcused > 0 && <span className="text-kh-red">{s.unexcused} unentsch.</span>}
            </div>
          )}
        </div>
      </div>

      {s.total === 0 ? (
        <p className="text-[13px] text-kh-muted font-medium text-center py-2">
          {role === 'student' ? 'Du warst bisher immer da — stark!' : 'Bisher keine Fehltage.'}
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-5">
          {/* Monatsverlauf (gestapelt E/U) */}
          <div>
            <div className="text-[11px] font-bold text-kh-muted uppercase tracking-wide mb-2">Verlauf nach Monat</div>
            <div className="flex items-end gap-1.5 h-16">
              {s.months.map(m => {
                const totalM = m.excused + m.unexcused
                return (
                  <div key={m.key} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                    <span className="text-[10px] font-bold text-kh-dark leading-none">{totalM > 0 ? totalM : ''}</span>
                    <div className="w-full max-w-[22px] flex flex-col justify-end rounded-t-md overflow-hidden" style={{ height: totalM > 0 ? `${Math.max(8, (totalM / s.monthMax) * 40)}px` : '3px' }}>
                      {totalM === 0 ? <div className="w-full" style={{ height: 3, background: '#E3DFD5' }} /> : (
                        <>
                          {m.unexcused > 0 && <div className="w-full" style={{ height: `${(m.unexcused / totalM) * 100}%`, background: '#E06B57' }} />}
                          {m.excused > 0 && <div className="w-full" style={{ height: `${(m.excused / totalM) * 100}%`, background: '#C98A2B' }} />}
                        </>
                      )}
                    </div>
                    <span className="text-[10px] font-semibold text-kh-muted leading-none">{MONTH_SHORT[Number(m.key.slice(5)) - 1]}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Wochentags-Muster */}
          <div>
            <div className="text-[11px] font-bold text-kh-muted uppercase tracking-wide mb-2">Wochentags-Muster</div>
            <div className="flex items-end gap-1.5 h-16">
              {WEEKDAY_SHORT.map((wd, i) => {
                const count = s.weekday[i]
                const max = Math.max(1, ...s.weekday)
                const isPeak = i === s.peakWeekday
                return (
                  <div key={wd} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] font-bold text-kh-dark leading-none">{count > 0 ? count : ''}</span>
                    <div className="w-full max-w-[26px] rounded-t-md" style={{
                      height: count > 0 ? `${Math.max(8, (count / max) * 40)}px` : '3px',
                      background: count === 0 ? '#E3DFD5' : isPeak ? 'linear-gradient(180deg,#E9B857,#C98A2B)' : 'linear-gradient(180deg,#5BC392,#2E9C6E)',
                    }} />
                    <span className="text-[10px] font-semibold text-kh-muted leading-none">{wd}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Eltern: eigene Melde-Rechtzeitigkeit (sachlich, kein Bewerten) */}
      {role === 'parent' && s.parent.total > 0 && (
        <div className="mt-4 pt-4 border-t border-kh-border/60 flex items-center gap-2 flex-wrap text-[12.5px] font-medium text-kh-muted">
          <span className="msym text-[16px] text-kh-green">schedule</span>
          <span><b className="text-kh-dark font-extrabold">{timelyPct}%</b> deiner Abmeldungen rechtzeitig gemeldet</span>
          <span className="text-kh-muted/70">({s.parent.timely} von {s.parent.total})</span>
        </div>
      )}
    </section>
  )
}
