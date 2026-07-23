'use client'

import { useMemo, useState } from 'react'
import { schoolYearStartISO, firstDayOfMonthISO, addDaysISO } from '@/lib/date'
import { buildAttendanceStats, type StatusFilter } from '@/lib/attendanceStats'
import { Ring, Sparkline } from '@/components/home/statParts'
import Avatar from '@/components/ui/Avatar'
import type { Attendance, Profile } from '@/lib/types'

const MONTH_SHORT = ['Jän', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
const WEEKDAY_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr']
const WEEKDAY_LONG = ['Montagen', 'Dienstagen', 'Mittwochen', 'Donnerstagen', 'Freitagen']

type Range = 'year' | 'days30' | 'month'
const RANGE_LABEL: Record<Range, string> = { year: 'Schuljahr', days30: 'Letzte 30 Tage', month: 'Dieser Monat' }

export default function StatsView({ entries, students, today }: { entries: Attendance[]; students: Profile[]; today: string }) {
  const [range, setRange] = useState<Range>('year')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [childId, setChildId] = useState<'all' | string>('all')

  // Filter als Aufklapp-Bereich (inline, kein Dropdown/Popup): eingeklappt nur
  // die Kopfzeile, aufgeklappt Zeitraum + alle Kinder auf einen Blick.
  const [open, setOpen] = useState(false)

  // „Alle Kinder" oder ein einzelnes Kind — bei Einzelwahl rechnet die ganze
  // Seite auf dieses Kind um (studentCount=1); die anonyme Verteilung blendet
  // sich dann aus (studentCount > 1 false).
  const scopedEntries = useMemo(() => childId === 'all' ? entries : entries.filter(e => e.student_id === childId), [entries, childId])
  const studentCount = childId === 'all' ? students.length : 1
  const childName = childId === 'all' ? null : students.find(s => s.id === childId)?.full_name ?? null

  const { startISO, endISO } = useMemo(() => {
    if (range === 'days30') return { startISO: addDaysISO(-29, new Date(`${today}T00:00:00`)), endISO: today }
    if (range === 'month') return { startISO: firstDayOfMonthISO(new Date(`${today}T00:00:00`)), endISO: today }
    return { startISO: schoolYearStartISO(new Date(`${today}T00:00:00`)), endISO: today }
  }, [range, today])

  const s = useMemo(
    () => buildAttendanceStats(scopedEntries, { studentCount, startISO, endISO, statusFilter: status }),
    [scopedEntries, studentCount, startISO, endISO, status],
  )

  const insights = useMemo(() => {
    const out: { icon: string; text: string; tone: 'green' | 'amber' | 'red' | 'muted' }[] = []
    out.push({ icon: 'verified', text: `Anwesenheitsquote ${s.presentRate}%`, tone: s.presentRate >= 95 ? 'green' : s.presentRate >= 90 ? 'amber' : 'red' })
    if (s.peakWeekday >= 0 && (s.peakWeekday === 0 || s.peakWeekday === 4) && s.moFrShare >= 0.5)
      out.push({ icon: 'insights', text: `Häufung an ${WEEKDAY_LONG[s.peakWeekday]}`, tone: 'amber' })
    if (s.unexcused > 0) out.push({ icon: 'priority_high', text: `${s.unexcused} ${s.unexcused === 1 ? 'Tag' : 'Tage'} unentschuldigt`, tone: 'red' })
    if (s.parent.open > 0) out.push({ icon: 'mark_email_unread', text: `${s.parent.open} offene ${s.parent.open === 1 ? 'Meldung' : 'Meldungen'}`, tone: 'amber' })
    if (s.parent.late > 0) out.push({ icon: 'schedule', text: `${s.parent.late} verspätet gemeldet`, tone: 'muted' })
    return out
  }, [s])

  const toneClass = { green: 'text-kh-green bg-kh-green-light', amber: 'text-kh-amber bg-kh-amber-light', red: 'text-kh-red bg-kh-red-light', muted: 'text-kh-muted bg-kh-bg' }
  const timelyPct = s.parent.total > 0 ? Math.round((s.parent.timely / s.parent.total) * 100) : null

  return (
    <div className="space-y-5">
      {/* Filter als Aufklapp-Bereich (inline, kein Dropdown/Popup) */}
      <div className="kh-card overflow-hidden">
        <button
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          className="w-full flex items-center gap-2 px-4 py-3 text-left"
        >
          <span className="msym text-[18px] text-kh-green">tune</span>
          <span className="font-extrabold text-[13.5px] text-kh-dark">Filter</span>
          <span className="text-[12.5px] text-kh-muted font-semibold">· {RANGE_LABEL[range]}</span>
          {childName && <span className="inline-flex items-center gap-1 rounded-full bg-kh-green/12 text-kh-green px-2 py-0.5 text-[11px] font-bold"><span className="msym text-[13px]">person</span>{childName.split(' ')[0]}</span>}
          <span className={`msym text-[20px] text-kh-muted ml-auto transition-transform ${open ? 'rotate-180' : ''}`}>expand_more</span>
        </button>

        {open && (
          <div className="px-4 pb-4 pt-4 border-t border-kh-border/60 space-y-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-kh-muted mb-2">Zeitraum</p>
              <div className="flex gap-2 flex-wrap">
                {(['year', 'days30', 'month'] as Range[]).map(r => (
                  <button key={r} onClick={() => setRange(r)}
                    className={`px-3.5 py-1.5 rounded-full text-[12.5px] font-bold transition-all ${
                      range === r ? 'bg-gradient-to-br from-kh-dark to-kh-green text-white shadow-[0_4px_12px_rgba(20,40,45,.16)]' : 'bg-kh-bg text-kh-muted hover:text-kh-dark'
                    }`}>
                    {RANGE_LABEL[r]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-kh-muted mb-2">Kind</p>
              <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-1">
                <button
                  onClick={() => setChildId('all')}
                  aria-pressed={childId === 'all'}
                  className={`flex flex-col items-center gap-1 rounded-xl px-1 py-2 transition-colors ${childId === 'all' ? 'bg-kh-green/12' : 'hover:bg-kh-bg'}`}
                >
                  <span className={`w-[38px] h-[38px] rounded-full flex items-center justify-center flex-shrink-0 ${childId === 'all' ? 'bg-kh-green ring-2 ring-kh-green ring-offset-2 ring-offset-white' : 'bg-kh-green/12'}`}>
                    <span className={`msym text-[20px] ${childId === 'all' ? 'text-white' : 'text-kh-green'}`}>groups</span>
                  </span>
                  <span className={`text-[11px] font-bold leading-none ${childId === 'all' ? 'text-kh-green' : 'text-kh-muted'}`}>Alle</span>
                </button>
                {students.map(st => {
                  const active = childId === st.id
                  return (
                    <button
                      key={st.id}
                      onClick={() => setChildId(active ? 'all' : st.id)}
                      aria-pressed={active}
                      title={st.full_name}
                      className={`flex flex-col items-center gap-1 rounded-xl px-1 py-2 min-w-0 transition-colors ${active ? 'bg-kh-green/12' : 'hover:bg-kh-bg'}`}
                    >
                      <span className={`rounded-full flex-shrink-0 ${active ? 'ring-2 ring-kh-green ring-offset-2 ring-offset-white' : ''}`}>
                        <Avatar name={st.full_name} color={st.avatar_color} seed={st.avatar_seed} hairColor={st.avatar_hair_color} skinColor={st.avatar_skin_color} size={38} />
                      </span>
                      <span className={`w-full truncate text-center text-[11px] font-bold leading-none ${active ? 'text-kh-green' : 'text-kh-dark'}`}>{st.full_name.split(' ')[0]}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Insight-Chips */}
      {insights.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {insights.map((ins, i) => (
            <span key={i} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11.5px] font-bold ${toneClass[ins.tone]}`}>
              <span className="msym text-[14px]">{ins.icon}</span>{ins.text}
            </span>
          ))}
        </div>
      )}

      {/* KPI-Reihe */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Kpi icon="verified" iconColor="#2E9C6E" label="Anwesenheitsquote"
          value={`${s.presentRate}`} small="%"
          ring={{ pct: s.presentRate, color: '#2E9C6E' }}
          foot={`${s.schoolDays} Schultage · ${childName ?? `${studentCount} Kinder`}`} />
        <Kpi icon="event_busy" iconColor="#C98A2B" label="Fehltage"
          value={`${s.total}`}
          spark={{ values: s.months.map(m => m.excused + m.unexcused), color: '#C98A2B' }}
          foot={<><b className="text-kh-amber font-extrabold">{s.excused}</b> entsch. · <b className="text-kh-red font-extrabold">{s.unexcused}</b> unentsch.</>} />
        <Kpi icon="priority_high" iconColor="#E06B57" label="Unentschuldigt"
          value={`${s.unexcused}`}
          foot={s.total > 0 ? `${Math.round((s.unexcused / s.total) * 100)}% aller Fehltage` : 'keine Fehltage'} />
        <Kpi icon="schedule" iconColor="#2E9C6E" label="Rechtzeitig gemeldet"
          value={timelyPct === null ? '—' : `${timelyPct}`} small={timelyPct === null ? undefined : '%'}
          ring={timelyPct === null ? undefined : { pct: timelyPct, color: '#2E9C6E' }}
          foot={s.parent.total > 0 ? `${s.parent.timely} von ${s.parent.total} Elternmeldungen` : 'keine Elternmeldungen'} />
      </div>

      {/* Auswertung mit Status-Fokus */}
      <div>
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <h2 className="font-extrabold text-[15px] text-kh-dark">Auswertung</h2>
          <div className="ml-auto inline-flex bg-kh-page border border-kh-border rounded-full p-1 gap-1">
            {(['all', 'entschuldigt', 'unentschuldigt'] as StatusFilter[]).map(st => (
              <button key={st} onClick={() => setStatus(st)}
                className={`px-3 py-1 rounded-full text-[11.5px] font-bold transition-colors ${status === st ? 'bg-white text-kh-dark shadow-[0_2px_6px_rgba(20,40,45,.08)]' : 'text-kh-muted hover:text-kh-dark'}`}>
                {st === 'all' ? 'Alle' : st === 'entschuldigt' ? 'Entschuldigt' : 'Unentschuldigt'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
          {/* Monats-Trend (gestapelt E/U) */}
          <Card icon="stacked_bar_chart" title="Fehltage über die Monate" hint={status === 'all' ? 'entsch. + unentsch.' : undefined}>
            <div className="flex items-end gap-2 h-[150px] pt-4">
              {s.months.map(m => {
                const totalM = m.excused + m.unexcused
                const h = (totalM / s.monthMax) * 118
                return (
                  <div key={m.key} className="flex-1 flex flex-col items-center gap-1.5 min-w-0 group/mb">
                    <span className="text-[10px] font-bold text-kh-dark leading-none opacity-0 group-hover/mb:opacity-100 transition-opacity">{totalM > 0 ? totalM : ''}</span>
                    <div className="w-full max-w-[26px] flex flex-col justify-end rounded-t-md overflow-hidden" style={{ height: Math.max(3, h) || 3 }}>
                      {totalM === 0 ? <div className="w-full rounded-t-md" style={{ height: 3, background: '#E3DFD5' }} /> : (
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
            {status === 'all' && (
              <div className="flex gap-4 mt-3 pt-3 border-t border-kh-border/60 text-[11px] font-semibold text-kh-muted">
                <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-[3px]" style={{ background: '#C98A2B' }} />entschuldigt</span>
                <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-[3px]" style={{ background: '#E06B57' }} />unentschuldigt</span>
              </div>
            )}
          </Card>

          {/* Wochentags-Muster */}
          <Card icon="calendar_view_week" title="Wochentags-Muster">
            <div className="flex items-end gap-2 h-[150px] pt-4">
              {WEEKDAY_SHORT.map((wd, i) => {
                const count = s.weekday[i]
                const max = Math.max(1, ...s.weekday)
                const isPeak = i === s.peakWeekday
                return (
                  <div key={wd} className="flex-1 flex flex-col items-center gap-1.5">
                    <span className="text-[10px] font-bold text-kh-dark leading-none">{count > 0 ? count : ''}</span>
                    <div className="w-full max-w-[30px] rounded-t-md transition-all" style={{
                      height: count > 0 ? `${Math.max(8, (count / max) * 118)}px` : '3px',
                      background: count === 0 ? '#E3DFD5' : isPeak ? 'linear-gradient(180deg,#E9B857,#C98A2B)' : 'linear-gradient(180deg,#5BC392,#2E9C6E)',
                    }} />
                    <span className="text-[10px] font-semibold text-kh-muted leading-none">{wd}</span>
                  </div>
                )
              })}
            </div>
            {s.peakWeekday === 0 || s.peakWeekday === 4 ? (
              <p className="text-[11px] text-kh-muted font-medium mt-3">Randtage der Woche fallen auf — oft ein „Brückentag"-Muster.</p>
            ) : <p className="text-[11px] text-kh-muted font-medium mt-3">Fehltage nach Wochentag, farbig hervorgehoben der häufigste.</p>}
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-4 mt-4">
          {/* Anonyme Verteilung je Kind */}
          {studentCount > 1 && (
            <Card icon="groups" title="Fehltage je Kind" hint="anonym">
              <HBars buckets={s.childBuckets} suffix="Kinder" />
              <p className="text-[11px] text-kh-muted font-medium mt-3">Wie sich die Fehltage über die Klasse verteilen — ohne Namen, keine Rangliste.</p>
            </Card>
          )}

          {/* Eltern-Abmeldungen: Rechtzeitigkeit */}
          <Card icon="mark_email_read" title="Eltern-Abmeldungen">
            {s.parent.total === 0 ? (
              <p className="text-[12.5px] text-kh-muted font-medium py-4 text-center">Keine Elternmeldungen im Zeitraum.</p>
            ) : (
              <>
                <div className="flex h-5 rounded-full overflow-hidden bg-[#FAF8F3]">
                  {s.parent.timely > 0 && <div style={{ width: `${(s.parent.timely / s.parent.total) * 100}%`, background: '#2E9C6E' }} />}
                  {s.parent.late > 0 && <div style={{ width: `${(s.parent.late / s.parent.total) * 100}%`, background: '#E06B57' }} />}
                </div>
                <div className="flex flex-col gap-1.5 mt-3 text-[12.5px]">
                  <Legend color="#2E9C6E" label="Rechtzeitig gemeldet" value={s.parent.timely} />
                  <Legend color="#E06B57" label="Verspätet gemeldet" value={s.parent.late} />
                  {s.parent.open > 0 && <Legend color="#C98A2B" label="Noch offen (unbestätigt)" value={s.parent.open} />}
                </div>
                <p className="text-[11px] text-kh-muted font-medium mt-3">„Rechtzeitig" = am oder vor dem Abwesenheitstag gemeldet.</p>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

/* ─── Bausteine ──────────────────────────────────────────────────────────────── */

function Card({ icon, title, hint, children }: { icon: string; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="kh-card p-4">
      <div className="flex items-center gap-2.5 mb-1">
        <span className="w-7 h-7 rounded-[9px] bg-kh-green-light flex items-center justify-center flex-shrink-0">
          <span className="msym text-[16px] text-kh-green" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
        </span>
        <h3 className="font-extrabold text-[14px] text-kh-dark">{title}</h3>
        {hint && <span className="ml-auto text-[11px] text-kh-muted font-medium">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function Kpi({ icon, iconColor, label, value, small, ring, spark, foot }: {
  icon: string; iconColor: string; label: string; value: string; small?: string
  ring?: { pct: number; color: string }; spark?: { values: number[]; color: string }; foot: React.ReactNode
}) {
  return (
    <div className="kh-card p-4 relative overflow-hidden">
      <div className={`flex items-center gap-1.5 text-[11.5px] font-bold text-kh-muted ${ring ? 'pr-11' : ''}`}>
        <span className="msym text-[15px] flex-shrink-0" style={{ color: iconColor }}>{icon}</span>
        <span className="min-w-0">{label}</span>
      </div>
      <div className="mt-2 text-[30px] font-extrabold text-kh-dark tracking-tight leading-none tabular-nums">
        {value}{small && <span className="text-[15px] font-bold text-kh-muted ml-0.5">{small}</span>}
      </div>
      {ring && (
        <div className="absolute right-3 top-3 scale-[0.72] origin-top-right">
          <Ring pct={ring.pct} color={ring.color}><span className="text-[12px] font-extrabold text-kh-dark tabular-nums">{Math.round(ring.pct)}</span></Ring>
        </div>
      )}
      {spark && s2(spark.values) && <div className="mt-2.5"><Sparkline values={spark.values} color={spark.color} max={Math.max(...spark.values, 1)} /></div>}
      <div className="text-[11.5px] font-semibold text-kh-muted mt-2.5 flex items-center gap-1 flex-wrap">{foot}</div>
    </div>
  )
}
const s2 = (v: number[]) => v.length >= 2

function HBars({ buckets, suffix }: { buckets: { label: string; count: number }[]; suffix: string }) {
  const max = Math.max(...buckets.map(b => b.count), 1)
  const colors = ['#2E9C6E', '#8FC9A6', '#E9B857', '#E29578', '#E06B57']
  return (
    <div className="flex flex-col gap-2">
      {buckets.map((b, i) => (
        <div key={b.label} className="flex items-center gap-3">
          <span className="w-[44px] flex-shrink-0 text-[11.5px] font-bold text-kh-muted">{b.label}</span>
          <div className="flex-1 h-[20px] rounded-[7px] bg-[#FAF8F3] overflow-hidden">
            <div className="h-full rounded-[7px] flex items-center pl-2.5 text-[11px] font-extrabold text-white"
              style={{ width: `${Math.max(b.count === 0 ? 0 : 11, (b.count / max) * 100)}%`, background: colors[i], transition: 'width 800ms cubic-bezier(0.22,1,0.36,1)' }}>
              {b.count > 0 && b.count}
            </div>
          </div>
        </div>
      ))}
      <span className="text-[10.5px] text-kh-muted font-medium mt-0.5">Fehltage · Anzahl {suffix}</span>
    </div>
  )
}

function Legend({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 font-bold text-kh-dark">
      <i className="w-2.5 h-2.5 rounded-[3px] flex-shrink-0" style={{ background: color }} />
      <span className="text-kh-muted font-semibold">{label}</span>
      <b className="ml-auto tabular-nums">{value}</b>
    </div>
  )
}
