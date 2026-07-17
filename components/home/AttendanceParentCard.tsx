'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { reportAbsence, withdrawReport } from '@/app/actions/attendance'

export interface ChildAbsenceEntry {
  id: string
  date: string
  status: 'entschuldigt' | 'unentschuldigt'
  source: 'teacher' | 'parent'
  confirmed_at: string | null
}

interface Props {
  childFirstName: string
  /** Heutige + kommende Einträge des Kindes (aufsteigend sortiert) */
  upcomingEntries: ChildAbsenceEntry[]
  today: string
}

function fmtDate(iso: string, today: string) {
  if (iso === today) return 'Heute'
  const d = new Date(`${iso}T00:00:00`)
  const tomorrow = new Date(`${today}T00:00:00`)
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (d.getTime() === tomorrow.getTime()) return 'Morgen'
  return d.toLocaleDateString('de-AT', { weekday: 'short', day: 'numeric', month: 'short' })
}

/** Anwesenheits-Modul für die rechte Seitenspalte der Eltern-Startseite:
 *  Kind mit EINEM Tap für heute abmelden (Inline-Bestätigung statt Modal) —
 *  der häufigste Fall („Kind ist krank aufgewacht") braucht so keine eigene
 *  Seite. Gemeldete/kommende Abwesenheiten sind sofort sichtbar,
 *  unbestätigte direkt zurückziehbar. */
export default function AttendanceParentCard({ childFirstName, upcomingEntries, today }: Props) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  // 'sent' überbrückt optimistisch die Zeit bis router.refresh() die Meldung liefert
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const todayEntry = upcomingEntries.find(e => e.date === today)
  const weekday = new Date(`${today}T00:00:00`).getDay()
  const isWeekend = weekday === 0 || weekday === 6
  const showQuickAction = !todayEntry && !sent && !isWeekend

  async function reportToday() {
    setBusy(true)
    setError(null)
    try {
      await reportAbsence(today, today, '')
      setSent(true)
      setConfirming(false)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Melden fehlgeschlagen')
    } finally {
      setBusy(false)
    }
  }

  async function withdraw(id: string) {
    setBusy(true)
    setError(null)
    try {
      await withdrawReport(id)
      setSent(false)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Zurückziehen fehlgeschlagen')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-white rounded-[20px] p-5 shadow-sm border border-kh-border/50 max-md:rounded-2xl max-md:border-0 max-md:bg-gradient-to-br max-md:from-white max-md:via-white max-md:to-kh-page max-md:shadow-[0_8px_16px_rgba(20,40,45,.10)]">
      <div className="flex items-center gap-2 mb-4">
        <span className="msym text-[19px] text-kh-teal flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>event_busy</span>
        <h2 className="flex-1 font-extrabold text-[15px] text-kh-dark truncate">Anwesenheit</h2>
        <Link
          href="/anwesenheit"
          className="w-8 h-8 rounded-full gradient-teal text-white flex items-center justify-center hover:opacity-90 transition-opacity flex-shrink-0"
          aria-label="Zur Anwesenheit"
        >
          <span className="msym text-[19px]">arrow_forward</span>
        </Link>
      </div>

      {error && <div className="text-[12px] font-semibold text-kh-red mb-2">{error}</div>}

      {/* Gemeldete / kommende Abwesenheiten */}
      {(upcomingEntries.length > 0 || sent) && (
        <div className="flex flex-col gap-0.5 mb-3">
          {sent && !todayEntry && (
            <div className="flex items-center gap-2.5 px-1 py-[5px]">
              <span className="flex-1 font-semibold text-[13px] text-kh-dark">Heute</span>
              <span className="text-[11px] font-bold text-kh-amber">Gemeldet ✓</span>
            </div>
          )}
          {upcomingEntries.map(e => {
            const pending = !e.confirmed_at
            const tone = pending
              ? { label: 'Gemeldet', color: '#C98A2B' }
              : e.status === 'entschuldigt'
                ? { label: 'Entschuldigt', color: '#2E9C6E' }
                : { label: 'Unentschuldigt', color: '#E06B57' }
            return (
              <div key={e.id} className="flex items-center gap-2.5 px-1 py-[5px]">
                <span className="flex-1 min-w-0 font-semibold text-[13px] text-kh-dark truncate">{fmtDate(e.date, today)}</span>
                <span className="text-[11px] font-bold flex-shrink-0" style={{ color: tone.color }}>{tone.label}</span>
                {pending && e.source === 'parent' && (
                  <button
                    onClick={() => withdraw(e.id)}
                    disabled={busy}
                    title="Meldung zurückziehen"
                    aria-label={`Meldung für ${fmtDate(e.date, today)} zurückziehen`}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-kh-muted hover:text-kh-red hover:bg-kh-red-light transition-colors disabled:opacity-50 flex-shrink-0"
                  >
                    <span className="msym text-[14px]">close</span>
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Ein-Tap-Abmeldung für heute (Inline-Bestätigung, kein Modal) */}
      {showQuickAction && (
        confirming ? (
          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-semibold text-kh-dark">{childFirstName} heute abmelden?</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={reportToday}
                disabled={busy}
                className="flex-1 py-2 rounded-full text-[12.5px] font-bold text-white gradient-teal hover:brightness-105 active:brightness-95 transition disabled:opacity-50"
              >
                {busy ? 'Wird gemeldet …' : 'Ja, abmelden'}
              </button>
              <button
                onClick={() => setConfirming(false)}
                disabled={busy}
                className="px-3.5 py-2 rounded-full text-[12.5px] font-bold text-kh-muted hover:bg-kh-bg transition-colors"
              >
                Abbrechen
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <button
              onClick={() => setConfirming(true)}
              className="flex items-center justify-center gap-1.5 w-full py-2 rounded-full text-[12.5px] font-bold text-kh-teal bg-kh-teal-light hover:bg-kh-teal hover:text-white transition-colors"
            >
              <span className="msym text-[16px]">event_busy</span>
              {childFirstName} heute abmelden
            </button>
            <span className="text-[11.5px] text-kh-muted font-medium text-center">Krank? Ein Tap genügt — die Lehrperson sieht es sofort.</span>
          </div>
        )
      )}

      {upcomingEntries.length === 0 && !sent && !showQuickAction && isWeekend && (
        <p className="text-[12.5px] text-kh-muted font-medium">Wochenende — abmelden geht ab Montag wieder.</p>
      )}
    </div>
  )
}
