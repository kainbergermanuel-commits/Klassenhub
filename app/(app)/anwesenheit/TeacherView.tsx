'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { addDaysISO } from '@/lib/date'
import { setAttendanceStatus, clearAttendance, confirmReport, rejectReport } from '@/app/actions/attendance'
import Avatar from '@/components/ui/Avatar'
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
  const [error, setError] = useState<string | null>(null)

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

  function setStatus(studentId: string, next: RowStatus) {
    const key = `${studentId}|${date}`
    setOverrides(prev => ({ ...prev, [key]: next }))
    setError(null)
    startTransition(async () => {
      try {
        if (next === 'anwesend') await clearAttendance(studentId, date)
        else await setAttendanceStatus(studentId, date, next)
        router.refresh()
      } catch (e) {
        setOverrides(prev => { const rest = { ...prev }; delete rest[key]; return rest })
        setError(e instanceof Error ? e.message : 'Speichern fehlgeschlagen')
      }
    })
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

      {/* Tabs */}
      <div className="flex gap-2">
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
      </div>

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
              return (
                <div key={s.id} className="kh-card-flat px-3.5 py-2.5 flex items-center gap-3">
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
                          disabled={isPending && !active}
                          role="radio"
                          aria-checked={active}
                          title={meta.label}
                          className={`px-2.5 py-1.5 rounded-full text-[12px] font-bold transition-all disabled:opacity-60 ${
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
            {summary.map(({ student, e, u }) => (
              <div key={student.id} className="kh-card-flat px-3.5 py-2.5 flex items-center gap-3">
                <Avatar name={student.full_name} color={student.avatar_color} seed={student.avatar_seed} hairColor={student.avatar_hair_color} skinColor={student.avatar_skin_color} size={34} />
                <div className="flex-1 font-bold text-[14px] text-kh-dark truncate">{student.full_name}</div>
                <div className="flex items-center gap-2 text-[12.5px] font-bold">
                  <span className="text-kh-dark">{e + u === 0 ? '—' : `${e + u} ${e + u === 1 ? 'Tag' : 'Tage'}`}</span>
                  {e > 0 && <span className="px-2 py-0.5 rounded-full text-kh-amber bg-kh-amber-light">{e} E</span>}
                  {u > 0 && <span className="px-2 py-0.5 rounded-full text-kh-red bg-kh-red-light">{u} U</span>}
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11.5px] text-kh-muted mt-3">E = entschuldigt · U = unentschuldigt. Kein Eintrag bedeutet anwesend.</p>
        </section>
      )}
    </div>
  )
}
