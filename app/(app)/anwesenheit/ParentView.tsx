'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { reportAbsence, withdrawReport } from '@/app/actions/attendance'
import DatePicker from '@/components/ui/DatePicker'
import PersonalAttendanceStats from './PersonalAttendanceStats'
import { isAbsence, partialLabel } from '@/lib/attendance'
import type { WeekdaySlots } from '@/lib/attendanceHours'
import type { Attendance } from '@/lib/types'

interface Props {
  /** Alle Zeilen, auch die Teilabwesenheiten (status 'anwesend'). */
  entries: Attendance[]
  /** Stundenplan des Kindes, für die Fehlstunden. */
  slots: WeekdaySlots
  childFirstName: string
  today: string
}


function fmtDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('de-AT', { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function ParentView({ entries, slots, childFirstName, today }: Props) {
  // Fehltage und Teilabwesenheiten sind zwei verschiedene Dinge und stehen
  // deshalb in zwei getrennten Listen statt gemischt untereinander.
  const absences = entries.filter(isAbsence)
  const partials = entries.filter(e => !isAbsence(e))
  const router = useRouter()
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  function onStartDateChange(v: string) {
    setStartDate(v)
    if (v > endDate) setEndDate(v)
  }

  function submit() {
    setError(null)
    setSuccess(false)
    startTransition(async () => {
      try {
        await reportAbsence(startDate, endDate, note)
        setNote('')
        setSuccess(true)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Melden fehlgeschlagen')
      }
    })
  }

  function withdraw(id: string) {
    setError(null)
    startTransition(async () => {
      try {
        await withdrawReport(id)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Zurückziehen fehlgeschlagen')
      }
    })
  }

  return (
    <div className="space-y-5">
      {/* Abmelden */}
      <section className="kh-card p-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="msym text-[20px] text-kh-teal">event_busy</span>
          <h2 className="font-extrabold text-[16px] text-kh-dark">{childFirstName} abmelden</h2>
        </div>
        <p className="text-[12.5px] text-kh-muted mb-4">
          Die Lehrperson sieht die Meldung sofort und bestätigt sie mit einem Tap. Eine Begründung ist freiwillig.
        </p>
        <div className="flex gap-3 flex-wrap items-start">
          <div className="w-[168px]">
            <label className="text-xs font-bold text-kh-muted uppercase tracking-wider block mb-1.5">Von</label>
            <DatePicker value={startDate} onChange={onStartDateChange} disableWeekends />
          </div>
          <div className="w-[168px]">
            <label className="text-xs font-bold text-kh-muted uppercase tracking-wider block mb-1.5">Bis</label>
            <DatePicker value={endDate} min={startDate} onChange={setEndDate} disableWeekends />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-bold text-kh-muted uppercase tracking-wider block mb-1.5">Notiz (freiwillig)</label>
            <input
              type="text" value={note} maxLength={300}
              onChange={e => setNote(e.target.value)}
              placeholder="z. B. Arzttermin"
              className="w-full border border-kh-border rounded-xl px-4 py-3 text-[16px] md:text-sm font-medium text-kh-dark placeholder:text-[#B0BCBA] outline-none focus:border-kh-teal transition-colors"
            />
          </div>
        </div>
        <div className="flex items-center gap-3 mt-4 flex-wrap">
          <button
            onClick={submit}
            disabled={isPending}
            className="px-5 py-2.5 rounded-full text-[13.5px] font-bold text-white gradient-teal hover:brightness-105 transition-[filter,opacity] duration-150 tap disabled:opacity-50 disabled:pointer-events-none"
          >
            {isPending ? 'Wird gemeldet …' : 'Abmelden'}
          </button>
          {success && <span className="text-[13px] font-semibold text-kh-green">Meldung gesendet ✓</span>}
          {error && <span className="text-[13px] font-semibold text-kh-red">{error}</span>}
        </div>
      </section>

      {/* Persönliche Statistik */}
      <PersonalAttendanceStats entries={entries} slots={slots} today={today} role="parent" />

      {/* Historie */}
      <section className="kh-card p-5">
        <h2 className="font-extrabold text-[16px] text-kh-dark mb-3">Abwesenheiten</h2>
        {absences.length === 0 && (
          <div className="text-kh-muted text-[14px] py-4 text-center">
            Keine Abwesenheiten seit Schuljahresbeginn — {childFirstName} war immer da.
          </div>
        )}
        <div className="space-y-1.5">
          {absences.map(e => {
            const pending = !e.confirmed_at
            const chip = pending
              ? { label: 'Gemeldet', color: '#C98A2B', bg: '#F8ECD6' }
              : e.status === 'entschuldigt'
                ? { label: 'Entschuldigt', color: '#2E9C6E', bg: '#DDF0E7' }
                : { label: 'Unentschuldigt', color: '#E06B57', bg: '#FDECEA' }
            return (
              <div key={e.id} className="kh-card-flat px-3.5 py-2.5 flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-[140px]">
                  <div className="font-bold text-[14px] text-kh-dark">{fmtDate(e.date)}</div>
                  {e.note && <div className="text-[12px] text-kh-muted italic truncate">„{e.note}"</div>}
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11.5px] font-bold" style={{ color: chip.color, background: chip.bg }}>
                  {chip.label}
                </span>
                {pending && e.source === 'parent' && (
                  <button
                    onClick={() => withdraw(e.id)}
                    disabled={isPending}
                    className="text-[12px] font-bold text-kh-muted underline underline-offset-2 hover:text-kh-red transition-colors disabled:opacity-50 disabled:pointer-events-none"
                  >
                    Zurückziehen
                  </button>
                )}
              </div>
            )
          })}
        </div>
        {absences.length > 0 && (
          <p className="text-[11.5px] text-kh-muted mt-3">
            „Gemeldet" = von dir abgemeldet, die Bestätigung der Lehrperson steht noch aus; danach gilt der Tag als entschuldigt.
          </p>
        )}
      </section>

      {/* Zu spät gekommen / vorzeitig gegangen — eigene Liste, weil das
          Kind an diesen Tagen da war und sie keine Fehltage sind. */}
      {partials.length > 0 && (
        <section className="kh-card p-5">
          <h2 className="font-extrabold text-[16px] text-kh-dark mb-1">Zu spät gekommen oder früher gegangen</h2>
          <p className="text-[12.5px] text-kh-muted mb-3">
            An diesen Tagen war {childFirstName} da. Sie zählen nicht als Fehltage.
          </p>
          <div className="space-y-1.5">
            {partials.map(e => (
              <div key={e.id} className="kh-card-flat px-3.5 py-2.5 flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-[140px] font-bold text-[14px] text-kh-dark">{fmtDate(e.date)}</div>
                <span className="px-2.5 py-1 rounded-full text-[11.5px] font-bold text-kh-teal bg-kh-teal-light">
                  {partialLabel(e)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
