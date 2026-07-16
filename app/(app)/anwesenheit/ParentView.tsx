'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { reportAbsence, withdrawReport } from '@/app/actions/attendance'
import type { Attendance } from '@/lib/types'

interface Props {
  entries: Attendance[]
  childFirstName: string
  today: string
}

function fmtDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('de-AT', { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function ParentView({ entries, childFirstName, today }: Props) {
  const router = useRouter()
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

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
        <div className="flex gap-3 flex-wrap">
          <label className="flex flex-col gap-1 text-[12px] font-bold text-kh-muted">
            Von
            <input
              type="date" value={startDate}
              onChange={e => { setStartDate(e.target.value); if (e.target.value > endDate) setEndDate(e.target.value) }}
              className="px-3 py-2 rounded-xl border border-kh-border bg-white text-[14px] text-kh-dark font-semibold"
            />
          </label>
          <label className="flex flex-col gap-1 text-[12px] font-bold text-kh-muted">
            Bis
            <input
              type="date" value={endDate} min={startDate}
              onChange={e => setEndDate(e.target.value)}
              className="px-3 py-2 rounded-xl border border-kh-border bg-white text-[14px] text-kh-dark font-semibold"
            />
          </label>
          <label className="flex flex-col gap-1 text-[12px] font-bold text-kh-muted flex-1 min-w-[200px]">
            Notiz (freiwillig)
            <input
              type="text" value={note} maxLength={300}
              onChange={e => setNote(e.target.value)}
              placeholder="z. B. Arzttermin"
              className="px-3 py-2 rounded-xl border border-kh-border bg-white text-[14px] text-kh-dark"
            />
          </label>
        </div>
        <div className="flex items-center gap-3 mt-4 flex-wrap">
          <button
            onClick={submit}
            disabled={isPending}
            className="px-5 py-2.5 rounded-full text-[13.5px] font-bold text-white gradient-teal disabled:opacity-50"
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
                    className="text-[12px] font-bold text-kh-muted underline underline-offset-2 disabled:opacity-50"
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
