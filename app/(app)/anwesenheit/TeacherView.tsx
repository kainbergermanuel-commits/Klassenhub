'use client'

import { Fragment, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { addDaysISO, schoolYearStartISO } from '@/lib/date'
import { setAttendanceStatus, clearAttendance, confirmReport, rejectReport } from '@/app/actions/attendance'
import Avatar from '@/components/ui/Avatar'
import BulkAbsenceModal from './BulkAbsenceModal'
import type { Attendance, AttendanceStatus, Profile } from '@/lib/types'

interface Props {
  students: Profile[]
  entries: Attendance[]
  today: string
}

type Tab = 'tag' | 'uebersicht'
/** UI-Zustand einer Zeile: kein Eintrag = anwesend */
type RowStatus = AttendanceStatus | 'anwesend'

function fmtDate(iso: string, opts: Intl.DateTimeFormatOptions) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('de-AT', opts)
}

const MONTH_SHORT = ['Jän', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
const WEEKDAY_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr']

/** Detail-Statistik eines Kindes — komplett aus den bereits geladenen
 *  Schuljahres-Einträgen berechnet, keine zusätzliche Abfrage. */
function StudentStatsDetail({ studentEntries, today }: { studentEntries: Attendance[]; today: string }) {
  const stats = useMemo(() => {
    // Monatsachse: Schuljahresbeginn bis heute (auch Monate ohne Fehltage)
    const start = schoolYearStartISO(new Date(`${today}T00:00:00`))
    const months: string[] = []
    let cursor = start.slice(0, 7)
    const endMonth = today.slice(0, 7)
    while (cursor <= endMonth && months.length < 13) {
      months.push(cursor)
      const [y, m] = cursor.split('-').map(Number)
      cursor = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
    }

    const byMonth: Record<string, number> = {}
    const byWeekday = [0, 0, 0, 0, 0] // Mo–Fr
    for (const e of studentEntries) {
      byMonth[e.date.slice(0, 7)] = (byMonth[e.date.slice(0, 7)] ?? 0) + 1
      const wd = new Date(`${e.date}T00:00:00`).getDay()
      if (wd >= 1 && wd <= 5) byWeekday[wd - 1]++
    }

    // Längster zusammenhängender Block (Schultage; Fr→Mo zählt als Folge)
    const asc = [...studentEntries].map(e => e.date).sort()
    let longest = 0, run = 0
    for (let i = 0; i < asc.length; i++) {
      if (i === 0) { run = 1 } else {
        const prev = new Date(`${asc[i - 1]}T00:00:00`)
        const diff = Math.round((new Date(`${asc[i]}T00:00:00`).getTime() - prev.getTime()) / 86400000)
        const fridayToMonday = prev.getDay() === 5 && diff === 3
        run = (diff === 1 || fridayToMonday) ? run + 1 : 1
      }
      longest = Math.max(longest, run)
    }

    // Insight: Häufung an Montagen/Freitagen (klassisches „Brückentage"-Muster)
    const total = studentEntries.length
    const moFr = byWeekday[0] + byWeekday[4]
    const moFrPattern = total >= 3 && moFr / total >= 0.6

    return { months, byMonth, byWeekday, longest, moFrPattern, maxMonth: Math.max(1, ...Object.values(byMonth)), maxWeekday: Math.max(1, ...byWeekday) }
  }, [studentEntries, today])

  const insights: { icon: string; text: string; tone: 'red' | 'amber' | 'muted' }[] = []
  const uCount = studentEntries.filter(e => e.status === 'unentschuldigt').length
  const openCount = studentEntries.filter(e => !e.confirmed_at).length
  if (stats.moFrPattern) insights.push({ icon: 'insights', text: 'Häufung an Montagen/Freitagen', tone: 'amber' })
  if (stats.longest >= 3) insights.push({ icon: 'date_range', text: `Längste Abwesenheit: ${stats.longest} Schultage am Stück`, tone: 'muted' })
  if (uCount > 0) insights.push({ icon: 'priority_high', text: `${uCount} ${uCount === 1 ? 'Tag' : 'Tage'} unentschuldigt`, tone: 'red' })
  if (openCount > 0) insights.push({ icon: 'mark_email_unread', text: `${openCount} offene ${openCount === 1 ? 'Meldung' : 'Meldungen'}`, tone: 'amber' })

  const toneClass = { red: 'text-kh-red bg-kh-red-light', amber: 'text-kh-amber bg-kh-amber-light', muted: 'text-kh-muted bg-kh-bg' }

  return (
    <div className="p-4 space-y-4">
      {insights.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {insights.map((ins, i) => (
            <span key={i} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11.5px] font-bold ${toneClass[ins.tone]}`}>
              <span className="msym text-[14px]">{ins.icon}</span>
              {ins.text}
            </span>
          ))}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Monatsverlauf */}
        <div>
          <div className="text-[11px] font-bold text-kh-muted uppercase tracking-wide mb-2">Verlauf nach Monat</div>
          <div className="flex items-end gap-1.5 h-16">
            {stats.months.map(m => {
              const count = stats.byMonth[m] ?? 0
              return (
                <div key={m} className="flex-1 flex flex-col items-center gap-1 min-w-0" title={`${count} ${count === 1 ? 'Fehltag' : 'Fehltage'}`}>
                  <span className="text-[10px] font-bold text-kh-dark leading-none">{count > 0 ? count : ''}</span>
                  <div
                    className="w-full max-w-[22px] rounded-t-md transition-all"
                    style={{
                      height: count > 0 ? `${Math.max(8, (count / stats.maxMonth) * 40)}px` : '3px',
                      background: count > 0 ? 'linear-gradient(180deg, #5BC392 0%, #2E9C6E 100%)' : '#E3DFD5',
                    }}
                  />
                  <span className="text-[10px] font-semibold text-kh-muted leading-none">{MONTH_SHORT[Number(m.slice(5)) - 1]}</span>
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
              const count = stats.byWeekday[i]
              const isPeak = count > 0 && count === stats.maxWeekday && studentEntries.length >= 3
              return (
                <div key={wd} className="flex-1 flex flex-col items-center gap-1" title={`${count} ${count === 1 ? 'Fehltag' : 'Fehltage'}`}>
                  <span className="text-[10px] font-bold text-kh-dark leading-none">{count > 0 ? count : ''}</span>
                  <div
                    className="w-full max-w-[26px] rounded-t-md transition-all"
                    style={{
                      height: count > 0 ? `${Math.max(8, (count / stats.maxWeekday) * 40)}px` : '3px',
                      background: count === 0 ? '#E3DFD5' : isPeak ? 'linear-gradient(180deg, #E9B857 0%, #C98A2B 100%)' : 'linear-gradient(180deg, #5BC392 0%, #2E9C6E 100%)',
                    }}
                  />
                  <span className="text-[10px] font-semibold text-kh-muted leading-none">{wd}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Alle Fehltage */}
      <div>
        <div className="text-[11px] font-bold text-kh-muted uppercase tracking-wide mb-2">Alle Fehltage</div>
        <div className="max-h-48 overflow-y-auto scrollbar-kh space-y-1 pr-1">
          {studentEntries.map(e => {
            const pending = !e.confirmed_at
            const chip = pending
              ? { label: 'Gemeldet', color: '#C98A2B', bg: '#F8ECD6' }
              : e.status === 'entschuldigt'
                ? { label: 'E', color: '#C98A2B', bg: '#F8ECD6' }
                : { label: 'U', color: '#E06B57', bg: '#FDECEA' }
            return (
              <div key={e.id} className="flex items-center gap-2.5 rounded-lg bg-white px-3 py-1.5">
                <span className="font-bold text-[12.5px] text-kh-dark whitespace-nowrap">{fmtDate(e.date, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                {e.note && <span className="flex-1 text-[12px] text-kh-muted italic truncate">„{e.note}"</span>}
                {!e.note && <span className="flex-1" />}
                <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold whitespace-nowrap" style={{ color: chip.color, background: chip.bg }} title={chip.label === 'E' ? 'Entschuldigt' : chip.label === 'U' ? 'Unentschuldigt' : 'Elternmeldung, noch unbestätigt'}>
                  {chip.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const STATUS_META: Record<RowStatus, { label: string; short: string; color: string; bg: string }> = {
  anwesend:      { label: 'Anwesend',      short: 'Da', color: '#2E9C6E', bg: '#DDF0E7' },
  entschuldigt:  { label: 'Entschuldigt',  short: 'E',  color: '#C98A2B', bg: '#F8ECD6' },
  unentschuldigt:{ label: 'Unentschuldigt',short: 'U',  color: '#E06B57', bg: '#FDECEA' },
}

export default function TeacherView({ students, entries, today }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('tag')
  const [date, setDate] = useState(today)
  const [isPending, startTransition] = useTransition()
  // Optimistische Overrides, bis router.refresh() die Server-Daten nachliefert
  const [overrides, setOverrides] = useState<Record<string, RowStatus>>({})
  // Übersicht: aufgeklapptes Kind (Detail-Statistik)
  const [openStatsId, setOpenStatsId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showBulk, setShowBulk] = useState(false)

  const entryByKey = useMemo(() => {
    const map: Record<string, Attendance> = {}
    for (const e of entries) map[`${e.student_id}|${e.date}`] = e
    return map
  }, [entries])

  const pendingReports = useMemo(
    () => entries.filter(e => !e.confirmed_at).sort((a, b) => a.date.localeCompare(b.date)),
    [entries]
  )

  const studentById = useMemo(
    () => Object.fromEntries(students.map(s => [s.id, s])),
    [students]
  )

  function rowStatus(studentId: string): RowStatus {
    const key = `${studentId}|${date}`
    if (overrides[key]) return overrides[key]
    return entryByKey[key]?.status ?? 'anwesend'
  }

  // Request-Zähler pro Zeile (Schüler:in + Tag): erlaubt schnelles Durchklicken
  // mehrerer Kinder hintereinander, ohne auf die Server-Antwort der vorherigen
  // Zeile zu warten. Nur die jeweils NEUESTE Anfrage einer Zeile darf noch
  // etwas verändern — eine spät zurückkommende ältere Antwort für denselben
  // Schüler/Tag würde sonst einen zwischenzeitlich neueren Klick überschreiben.
  const requestSeq = useRef<Record<string, number>>({})

  function setStatus(studentId: string, next: RowStatus) {
    const key = `${studentId}|${date}`
    setOverrides(prev => ({ ...prev, [key]: next }))
    setError(null)
    const seq = (requestSeq.current[key] ?? 0) + 1
    requestSeq.current[key] = seq
    ;(async () => {
      try {
        if (next === 'anwesend') await clearAttendance(studentId, date)
        else await setAttendanceStatus(studentId, date, next)
        if (requestSeq.current[key] === seq) router.refresh()
      } catch (e) {
        if (requestSeq.current[key] !== seq) return
        setOverrides(prev => { const rest = { ...prev }; delete rest[key]; return rest })
        setError(e instanceof Error ? e.message : 'Speichern fehlgeschlagen')
      }
    })()
  }

  function handleReport(id: string, action: 'confirm' | 'reject') {
    setError(null)
    startTransition(async () => {
      try {
        if (action === 'confirm') await confirmReport(id)
        else await rejectReport(id)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Aktion fehlgeschlagen')
      }
    })
  }

  // Übersicht: Fehltage pro Kind seit Schuljahresbeginn
  const summary = useMemo(() => {
    const counts: Record<string, { e: number; u: number }> = {}
    for (const entry of entries) {
      if (!counts[entry.student_id]) counts[entry.student_id] = { e: 0, u: 0 }
      if (entry.status === 'entschuldigt') counts[entry.student_id].e++
      else counts[entry.student_id].u++
    }
    return students
      .map(s => ({ student: s, e: counts[s.id]?.e ?? 0, u: counts[s.id]?.u ?? 0 }))
      .sort((a, b) => (b.e + b.u) - (a.e + a.u) || a.student.full_name.localeCompare(b.student.full_name))
  }, [students, entries])

  const dayLabel = fmtDate(date, { weekday: 'long', day: 'numeric', month: 'long' })
  const isToday = date === today
  const absentCount = students.filter(s => rowStatus(s.id) !== 'anwesend').length

  return (
    <div className="space-y-5">
      {error && (
        <div className="kh-card-flat p-3.5 text-[13px] font-semibold text-kh-red bg-kh-red-light">{error}</div>
      )}

      {/* Offene Elternmeldungen — oben angepinnt */}
      {pendingReports.length > 0 && (
        <section className="kh-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="msym text-[20px] text-kh-amber">mark_email_unread</span>
            <h2 className="font-extrabold text-[16px] text-kh-dark">
              Offene {pendingReports.length === 1 ? 'Meldung' : 'Meldungen'} ({pendingReports.length})
            </h2>
          </div>
          <div className="space-y-2">
            {pendingReports.map(r => {
              const student = studentById[r.student_id]
              return (
                <div key={r.id} className="kh-card-flat p-3.5 flex items-center gap-3 flex-wrap">
                  {student && <Avatar name={student.full_name} color={student.avatar_color} seed={student.avatar_seed} hairColor={student.avatar_hair_color} skinColor={student.avatar_skin_color} size={34} />}
                  <div className="flex-1 min-w-[160px]">
                    <div className="font-bold text-[14px] text-kh-dark">{student?.full_name ?? 'Unbekannt'}</div>
                    <div className="text-[12.5px] text-kh-muted">
                      {fmtDate(r.date, { weekday: 'short', day: 'numeric', month: 'short' })}
                      {r.note && <span className="italic"> · „{r.note}"</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReport(r.id, 'confirm')}
                      disabled={isPending}
                      className="px-3.5 py-1.5 rounded-full text-[12.5px] font-bold text-white gradient-teal hover:brightness-105 active:brightness-95 transition disabled:opacity-50 disabled:pointer-events-none"
                    >
                      Bestätigen
                    </button>
                    <button
                      onClick={() => handleReport(r.id, 'reject')}
                      disabled={isPending}
                      title="Meldung ablehnen — das Kind gilt als anwesend"
                      className="px-3.5 py-1.5 rounded-full text-[12.5px] font-bold text-kh-red bg-kh-red-light hover:bg-kh-red hover:text-white transition-colors disabled:opacity-50 disabled:pointer-events-none"
                    >
                      Ablehnen
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Tabs + Zeitraum-Eintrag */}
      <div className="flex gap-2 items-center flex-wrap">
        {(['tag', 'uebersicht'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-full text-[13px] font-bold transition-all ${
              tab === t
                ? 'bg-gradient-to-br from-kh-dark to-kh-teal text-white shadow-[0_4px_12px_rgba(20,40,45,.18)]'
                : 'bg-white text-kh-muted shadow-[0_2px_8px_rgba(20,40,45,.06)] hover:text-kh-dark'
            }`}
          >
            {t === 'tag' ? 'Tages-Abgleich' : 'Übersicht'}
          </button>
        ))}
        {/* Ergänzt den Tages-Abgleich um den Fall, den dieser nur mühsam
            abbildet: mehrere Kinder und/oder mehrere Tage auf einmal. */}
        <button
          onClick={() => setShowBulk(true)}
          className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-bold text-kh-teal bg-white shadow-[0_2px_8px_rgba(20,40,45,.06)] hover:text-white hover:bg-kh-teal transition-colors"
        >
          <span className="msym text-[17px]">event_busy</span>
          Abwesenheit eintragen
        </button>
      </div>

      {showBulk && (
        <BulkAbsenceModal students={students} today={today} onClose={() => setShowBulk(false)} />
      )}

      {tab === 'tag' && (
        <section className="kh-card p-5">
          {/* Tages-Navigation */}
          <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <button onClick={() => setDate(addDaysISO(-1, new Date(`${date}T00:00:00`)))} aria-label="Vortag" className="w-8 h-8 rounded-full bg-kh-bg flex items-center justify-center text-kh-dark hover:bg-kh-page transition-colors">
                <span className="msym text-[18px]">chevron_left</span>
              </button>
              <button onClick={() => setDate(addDaysISO(1, new Date(`${date}T00:00:00`)))} aria-label="Nächster Tag" className="w-8 h-8 rounded-full bg-kh-bg flex items-center justify-center text-kh-dark hover:bg-kh-page transition-colors">
                <span className="msym text-[18px]">chevron_right</span>
              </button>
              <span className="font-extrabold text-[15px] text-kh-dark ml-1">{dayLabel}</span>
              {!isToday && (
                <button onClick={() => setDate(today)} className="ml-1 px-2.5 py-1 rounded-full text-[11.5px] font-bold text-kh-teal bg-kh-teal-light hover:bg-kh-teal hover:text-white transition-colors">
                  Heute
                </button>
              )}
            </div>
            <span className="text-[12.5px] font-semibold text-kh-muted">
              {absentCount === 0 ? 'Alle anwesend' : `${absentCount} abwesend`}
            </span>
          </div>

          {/* Klassenliste */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
            {students.length === 0 && <div className="col-span-full text-kh-muted text-[14px] py-6 text-center">Keine Schüler:innen in dieser Klasse.</div>}
            {students.map(s => {
              const status = rowStatus(s.id)
              const key = `${s.id}|${date}`
              const entry = entryByKey[key]
              const isParentPending = entry && !entry.confirmed_at && !overrides[key]
              const hasUnexcused = status === 'unentschuldigt'
              const hasOnlyExcused = status === 'entschuldigt'
              const rowStyle = hasUnexcused
                ? { background: 'linear-gradient(135deg, #FDECEA 0%, #FFFFFF 100%)', boxShadow: '0 4px 12px rgba(224,107,87,.12)' }
                : hasOnlyExcused
                  ? { opacity: 0.6 }
                  : {}
              return (
                <div key={s.id} className="kh-card-flat px-3.5 py-2.5 flex items-center gap-3" style={rowStyle}>
                  <Avatar name={s.full_name} color={s.avatar_color} seed={s.avatar_seed} hairColor={s.avatar_hair_color} skinColor={s.avatar_skin_color} size={34} />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[14px] text-kh-dark truncate flex items-center gap-1.5">
                      {s.full_name}
                      {isParentPending && (
                        <span className="text-[10px] font-bold uppercase tracking-wide text-kh-amber bg-kh-amber-light px-1.5 py-0.5 rounded-full">gemeldet</span>
                      )}
                    </div>
                    {entry?.note && !overrides[key] && (
                      <div className="text-[12px] text-kh-muted italic truncate">„{entry.note}"</div>
                    )}
                  </div>
                  <div className="flex gap-1" role="radiogroup" aria-label={`Status ${s.full_name}`}>
                    {(Object.keys(STATUS_META) as RowStatus[]).map(st => {
                      const meta = STATUS_META[st]
                      const active = status === st
                      return (
                        <button
                          key={st}
                          onClick={() => !active && setStatus(s.id, st)}
                          role="radio"
                          aria-checked={active}
                          title={meta.label}
                          className={`px-2.5 py-1.5 rounded-full text-[12px] font-bold transition-all ${
                            active ? '' : 'opacity-[0.65] hover:opacity-100'
                          }`}
                          style={active
                            ? { background: meta.color, color: '#fff' }
                            : { background: meta.bg, color: meta.color }}
                        >
                          <span className="max-lg:hidden">{meta.label}</span>
                          <span className="lg:hidden">{meta.short}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {tab === 'uebersicht' && (
        <section className="kh-card p-5">
          <div className="flex items-baseline justify-between gap-2 mb-3 flex-wrap">
            <h2 className="font-extrabold text-[16px] text-kh-dark">Fehltage pro Kind</h2>
            <span className="text-[12px] text-kh-muted font-medium">seit Schuljahresbeginn · Schultage, keine Stunden</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
            {summary.map(({ student, e, u }) => {
              const hasDays = e + u > 0
              const open = openStatsId === student.id
              return (
                <Fragment key={student.id}>
                  <div
                    className={`kh-card-flat overflow-hidden ${open ? 'col-span-full' : ''}`}
                    style={open ? { background: 'linear-gradient(180deg, #FAF7F0 0%, #F3EEE1 100%)' } : undefined}
                  >
                    <button
                      onClick={() => hasDays && setOpenStatsId(open ? null : student.id)}
                      disabled={!hasDays}
                      className={`px-3.5 py-2.5 flex items-center gap-3 w-full text-left transition-colors ${
                        hasDays && !open ? 'cursor-pointer hover:bg-kh-bg' : ''
                      } ${hasDays ? 'cursor-pointer' : 'cursor-default'}`}
                      aria-expanded={hasDays ? open : undefined}
                    >
                      <Avatar name={student.full_name} color={student.avatar_color} seed={student.avatar_seed} hairColor={student.avatar_hair_color} skinColor={student.avatar_skin_color} size={34} />
                      <div className="flex-1 font-bold text-[14px] text-kh-dark truncate">{student.full_name}</div>
                      <div className="flex items-center gap-2 text-[12.5px] font-bold">
                        <span className="text-kh-dark">{e + u === 0 ? '—' : `${e + u} ${e + u === 1 ? 'Tag' : 'Tage'}`}</span>
                        {e > 0 && <span className="px-2 py-0.5 rounded-full text-kh-amber bg-kh-amber-light">{e} E</span>}
                        {u > 0 && <span className="px-2 py-0.5 rounded-full text-kh-red bg-kh-red-light">{u} U</span>}
                      </div>
                      {hasDays && (
                        <span className={`msym text-[18px] text-kh-muted transition-transform ${open ? 'rotate-180' : ''}`}>expand_more</span>
                      )}
                    </button>
                    {open && (
                      <StudentStatsDetail
                        studentEntries={entries.filter(en => en.student_id === student.id)}
                        today={today}
                      />
                    )}
                  </div>
                </Fragment>
              )
            })}
          </div>
          <p className="text-[11.5px] text-kh-muted mt-3">E = entschuldigt · U = unentschuldigt. Kein Eintrag bedeutet anwesend.</p>
        </section>
      )}
    </div>
  )
}
