'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { reportAbsence, withdrawReport } from '@/app/actions/attendance'
import type { Attendance } from '@/lib/types'

interface Props {
  entries: Attendance[]
  childFirstName: string
  today: string
}

const MONTHS = ['Jänner', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate() }
function getFirstWeekday(y: number, m: number) { return (new Date(y, m, 1).getDay() + 6) % 7 }
function fmtDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('de-AT', { weekday: 'short', day: 'numeric', month: 'short' })
}
function formatDisplay(iso: string) { return new Date(`${iso}T00:00:00`).toLocaleDateString('de-AT', { weekday: 'short', day: 'numeric', month: 'long' }) }

/** Gleicher Aufbau wie der DatePicker in termine/AddEventModal.tsx — hier
 *  ohne Vergangenheits-Sperre, weil Eltern auch rückwirkend melden können. */
function DatePicker({ value, min, onChange }: { value: string; min?: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const sel = new Date(`${value}T00:00:00`)
  const [viewYear, setViewYear] = useState(sel.getFullYear())
  const [viewMonth, setViewMonth] = useState(sel.getMonth())

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstWeekday = getFirstWeekday(viewYear, viewMonth)

  function prevMonth() { if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) } else setViewMonth(m => m - 1) }
  function nextMonth() { if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) } else setViewMonth(m => m + 1) }
  function selectDay(day: number) {
    const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    if (min && iso < min) return
    onChange(iso); setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full rounded-xl border border-kh-border px-4 py-3 text-sm font-medium text-kh-dark text-left flex items-center justify-between gap-2 focus:outline-none focus:ring-2 focus:ring-kh-teal/40 focus:border-kh-teal transition hover:border-kh-teal/50"
      >
        <span>{formatDisplay(value)}</span>
        <span className="msym text-[18px] text-kh-muted">calendar_month</span>
      </button>
      {open && (
        <div className="absolute z-50 left-0 top-full mt-1 bg-white rounded-2xl shadow-xl border border-kh-border p-4 w-[280px]">
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F6F3ED] text-kh-muted transition-colors">
              <span className="msym text-[20px]">chevron_left</span>
            </button>
            <span className="font-extrabold text-[14px] text-kh-dark">{MONTHS[viewMonth]} {viewYear}</span>
            <button type="button" onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F6F3ED] text-kh-muted transition-colors">
              <span className="msym text-[20px]">chevron_right</span>
            </button>
          </div>
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map(d => <div key={d} className="text-center text-[11px] font-bold text-kh-muted py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-y-1">
            {Array.from({ length: firstWeekday }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const isSelected = iso === value
              const isPast = !!min && iso < min
              return (
                <button key={day} type="button" onClick={() => selectDay(day)} disabled={isPast}
                  className={`h-8 w-full rounded-lg text-[13px] font-semibold transition-all
                    ${isSelected ? 'bg-kh-teal text-white font-extrabold' : ''}
                    ${!isSelected && !isPast ? 'hover:bg-[#F0FAF8] text-kh-dark' : ''}
                    ${isPast ? 'text-kh-muted/40 cursor-not-allowed' : ''}`}
                >
                  {day}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default function ParentView({ entries, childFirstName, today }: Props) {
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
            <DatePicker value={startDate} onChange={onStartDateChange} />
          </div>
          <div className="w-[168px]">
            <label className="text-xs font-bold text-kh-muted uppercase tracking-wider block mb-1.5">Bis</label>
            <DatePicker value={endDate} min={startDate} onChange={setEndDate} />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-bold text-kh-muted uppercase tracking-wider block mb-1.5">Notiz (freiwillig)</label>
            <input
              type="text" value={note} maxLength={300}
              onChange={e => setNote(e.target.value)}
              placeholder="z. B. Arzttermin"
              className="w-full border border-kh-border rounded-xl px-4 py-3 text-sm font-medium text-kh-dark placeholder:text-[#B0BCBA] outline-none focus:border-kh-teal transition-colors"
            />
          </div>
        </div>
        <div className="flex items-center gap-3 mt-4 flex-wrap">
          <button
            onClick={submit}
            disabled={isPending}
            className="px-5 py-2.5 rounded-full text-[13.5px] font-bold text-white gradient-teal hover:brightness-105 active:brightness-95 transition disabled:opacity-50 disabled:pointer-events-none"
          >
            {isPending ? 'Wird gemeldet …' : 'Abmelden'}
          </button>
          {success && <span className="text-[13px] font-semibold text-kh-green">Meldung gesendet ✓</span>}
          {error && <span className="text-[13px] font-semibold text-kh-red">{error}</span>}
        </div>
      </section>

      {/* Historie */}
      <section className="kh-card p-5">
        <h2 className="font-extrabold text-[16px] text-kh-dark mb-3">Abwesenheiten</h2>
        {entries.length === 0 && (
          <div className="text-kh-muted text-[14px] py-4 text-center">
            Keine Abwesenheiten seit Schuljahresbeginn — {childFirstName} war immer da.
          </div>
        )}
        <div className="space-y-1.5">
          {entries.map(e => {
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
        {entries.length > 0 && (
          <p className="text-[11.5px] text-kh-muted mt-3">
            „Gemeldet" = von dir abgemeldet — die Bestätigung der Lehrperson steht noch aus; danach gilt der Tag als entschuldigt.
          </p>
        )}
      </section>
    </div>
  )
}
