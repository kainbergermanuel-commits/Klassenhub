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

/** Anwesenheit auf der Eltern-Startseite: Kind mit EINEM Tap für heute
 *  abmelden (Inline-Bestätigung statt Modal) — der häufigste Fall („Kind ist
 *  krank aufgewacht") braucht so keine eigene Seite. Gemeldete/kommende
 *  Abwesenheiten sind sofort sichtbar, unbestätigte direkt zurückziehbar. */
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
    <div className="animate-card-enter rounded-2xl p-5 shadow-[0_8px_16px_rgba(20,40,45,.10)]" style={{ background: 'linear-gradient(135deg, #F0FAF6 0%, #FEFEFC 100%)' }}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="flex items-center gap-2 font-extrabold text-base text-kh-dark whitespace-nowrap min-w-0">
          <span className="msym text-[20px] text-kh-teal flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>event_busy</span>
          <span className="truncate">Anwesenheit</span>
        </h2>
        <Link href="/anwesenheit" className="text-sm font-semibold text-kh-teal hover:underline flex-shrink-0">Mehr</Link>
      </div>

      {error && <div className="text-[12.5px] font-semibold text-kh-red mb-2">{error}</div>}

      {/* Gemeldete / kommende Abwesenheiten */}
      {(upcomingEntries.length > 0 || sent) && (
        <div className="flex flex-col gap-1.5 mb-3">
          {sent && !todayEntry && (
            <div className="flex items-center gap-2.5 rounded-xl bg-white px-3 py-2">
              <span className="font-bold text-[13px] text-kh-dark">Heute</span>
              <span className="flex-1" />
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold text-kh-amber bg-kh-amber-light">Gemeldet ✓</span>
            </div>
          )}
          {upcomingEntries.map(e => {
            const pending = !e.confirmed_at
            const chip = pending
              ? { label: 'Gemeldet', color: '#C98A2B', bg: '#F8ECD6' }
              : e.status === 'entschuldigt'
                ? { label: 'Entschuldigt', color: '#2E9C6E', bg: '#DDF0E7' }
                : { label: 'Unentschuldigt', color: '#E06B57', bg: '#FDECEA' }
            return (
              <div key={e.id} className="flex items-center gap-2.5 rounded-xl bg-white px-3 py-2 flex-wrap">
                <span className="font-bold text-[13px] text-kh-dark">{fmtDate(e.date, today)}</span>
                <span className="flex-1" />
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold" style={{ color: chip.color, background: chip.bg }}>
                  {chip.label}
                </span>
                {pending && e.source === 'parent' && (
                  <button
                    onClick={() => withdraw(e.id)}
                    disabled={busy}
                    className="text-[11.5px] font-bold text-kh-muted underline underline-offset-2 hover:text-kh-red transition-colors disabled:opacity-50"
                  >
                    Zurückziehen
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
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-semibold text-kh-dark">{childFirstName} heute abmelden?</span>
            <button
              onClick={reportToday}
              disabled={busy}
              className="px-4 py-2 rounded-full text-[12.5px] font-bold text-white gradient-teal hover:brightness-105 active:brightness-95 transition disabled:opacity-50"
            >
              {busy ? 'Wird gemeldet …' : 'Ja, abmelden'}
            </button>
            <button
              onClick={() => setConfirming(false)}
              disabled={busy}
              className="px-3 py-2 rounded-full text-[12.5px] font-bold text-kh-muted hover:bg-kh-bg transition-colors"
            >
              Abbrechen
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setConfirming(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[12.5px] font-bold text-kh-teal bg-kh-teal-light hover:bg-kh-teal hover:text-white transition-colors"
            >
              <span className="msym text-[16px]">event_busy</span>
              {childFirstName} heute abmelden
            </button>
            <span className="text-[12px] text-kh-muted font-medium">Krank? Ein Tap genügt — die Lehrperson sieht es sofort.</span>
          </div>
        )
      )}

      {upcomingEntries.length === 0 && !sent && !showQuickAction && (
        <p className="text-[13px] text-kh-muted font-medium">
          {isWeekend ? 'Wochenende — abmelden geht ab Montag wieder.' : `${childFirstName} ist heute abgemeldet.`}
        </p>
      )}
    </div>
  )
}
