'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toggleDutyCompletion } from '@/app/actions/toggleDutyCompletion'

const DAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr']

interface Props {
  dutyId: string
  /** Bereits bestätigte Wochentage (1..5) dieses Kindes für diesen Dienst. */
  doneWeekdays: number[]
  /** Bis zu welchem Wochentag bestätigt werden darf; 0 = Woche noch nicht
   *  begonnen. Kommt aus confirmableWeekday(weekStart) auf dem Server. */
  confirmableUntil: number
  /** Lehrer-Vorschau. Die Datenbank-Session ist dort die des Lehrers, ein
   *  Schreibversuch scheitert an der RLS-Policy (student_id = auth.uid()) —
   *  und DARF auch nicht gelingen: der Dienst ist die Selbstbestätigung des
   *  Kindes, keine Lehrer-Eingabe. Statt eines toten Knopfes schaltet die
   *  Leiste hier auf reine Simulation: sie reagiert wie im Echtbetrieb,
   *  speichert aber nichts. */
  preview?: boolean
  /** 'light' = auf hellem Grund (Startseite), 'onTeal' = auf der türkisen
   *  Eigene-Dienst-Karte der Dienste-Seite. */
  tone?: 'light' | 'onTeal'
  onCountChange?: (count: number) => void
}

/** Die fünf antippbaren Wochentage der Dienst-Selbstbestätigung.
 *  Gemeinsame Quelle für das Startseiten-Modul und die Dienste-Seite — vorher
 *  gab es das Abhaken NUR auf der Startseite, während die Dienste-Seite
 *  kalendarisch vergangene Tage mit demselben grünen Haken zeigte. */
export default function DutyDayStrip({
  dutyId, doneWeekdays, confirmableUntil, preview = false, tone = 'light', onCountChange,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [done, setDone] = useState<Set<number>>(new Set(doneWeekdays))
  const [error, setError] = useState<string | null>(null)
  // Welcher Tag gerade bestätigt wurde (für den kleinen Pop) und ob damit die
  // Woche vollständig geworden ist (für den einen grossen Moment). Beides nur
  // beim Bestätigen, nie beim Zurücknehmen — dieselbe Regel wie bei den
  // Hausübungen: gefeiert wird das Erledigen.
  const [justDone, setJustDone] = useState<number | null>(null)
  const [weekJustComplete, setWeekJustComplete] = useState(false)
  // Tippt ein Kind zwei Tage schnell hintereinander an, würde der Timer des
  // ersten die Animation des zweiten mitten im Lauf abräumen. Deshalb je ein
  // Handle, das beim nächsten Tippen zurückgesetzt wird.
  const dayTimer = useRef<number | null>(null)
  const weekTimer = useRef<number | null>(null)
  useEffect(() => () => {
    if (dayTimer.current) window.clearTimeout(dayTimer.current)
    if (weekTimer.current) window.clearTimeout(weekTimer.current)
  }, [])

  /** "Auf Stand": jeder bereits vergangene Diensttag ist bestätigt. Bewusst
   *  dieselbe Bedingung wie dutyKeptUp() in lib/duty.ts, die auch das
   *  Heldenbuch und die Eltern-Karte verwenden — der gefeierte Moment ist
   *  damit genau der, der anderswo zählt. */
  function isCaughtUp(set: Set<number>): boolean {
    if (confirmableUntil === 0) return false
    for (let wd = 1; wd <= confirmableUntil; wd++) if (!set.has(wd)) return false
    return true
  }

  function toggle(weekday: number) {
    if (weekday > confirmableUntil || pending) return
    const next = new Set(done)
    const willBeDone = !next.has(weekday)
    if (willBeDone) next.add(weekday)
    else next.delete(weekday)
    setDone(next)
    setError(null)
    onCountChange?.(next.size)

    if (willBeDone) {
      if (dayTimer.current) window.clearTimeout(dayTimer.current)
      setJustDone(weekday)
      dayTimer.current = window.setTimeout(() => setJustDone(null), 450)
      if (!isCaughtUp(done) && isCaughtUp(next)) {
        if (weekTimer.current) window.clearTimeout(weekTimer.current)
        setWeekJustComplete(true)
        weekTimer.current = window.setTimeout(() => setWeekJustComplete(false), 900)
      }
    }

    // Vorschau: nur die Anzeige mitführen, nichts schreiben.
    if (preview) return
    startTransition(async () => {
      try {
        await toggleDutyCompletion(dutyId, weekday, willBeDone)
        router.refresh()
      } catch {
        // Optimismus zurücknehmen und den Fehlschlag sichtbar machen, statt
        // den Haken kommentarlos zurückspringen zu lassen.
        const rolledBack = new Set(next)
        if (willBeDone) rolledBack.delete(weekday)
        else rolledBack.add(weekday)
        setDone(rolledBack)
        onCountChange?.(rolledBack.size)
        setError('Konnte nicht gespeichert werden.')
      }
    })
  }

  const onTeal = tone === 'onTeal'

  return (
    <div>
      <div className={`flex gap-1.5 rounded-xl ${weekJustComplete ? 'animate-duty-week' : ''}`}>
        {DAY_LABELS.map((label, i) => {
          const weekday = i + 1
          const isDone = done.has(weekday)
          const isLocked = weekday > confirmableUntil
          const isToday = weekday === confirmableUntil && confirmableUntil > 0
          const disabled = isLocked || pending
          return (
            <button
              key={label}
              type="button"
              onClick={() => toggle(weekday)}
              disabled={disabled}
              className={`flex-1 flex flex-col items-center gap-1 py-1.5 rounded-xl transition-all ${
                isLocked ? 'cursor-default' : 'hover:-translate-y-0.5 tap-sm'
              } ${isLocked ? 'opacity-40' : ''} ${justDone === weekday ? 'animate-duty-day' : ''}`}
              style={{
                background: isDone
                  ? 'linear-gradient(135deg, #2E9C6E, #7FD3A6)'
                  : onTeal
                    ? 'rgba(255,255,255,0.18)'
                    : isToday ? 'rgba(89,101,184,.10)' : '#F3F0EA',
              }}
              aria-label={`${label} ${isDone ? 'erledigt' : isLocked ? 'noch nicht möglich' : 'offen'}`}
              aria-pressed={isDone}
            >
              <span className={`text-[10.5px] font-bold ${
                isDone ? 'text-white' : onTeal ? 'text-white/90' : isToday ? 'text-kh-violet' : 'text-kh-muted'
              }`}>{label}</span>
              <span
                className={`msym text-[15px] ${isDone ? 'text-white' : onTeal ? 'text-white/70' : 'text-kh-muted/50'} ${
                  justDone === weekday ? 'animate-hw-check-icon' : ''
                }`}
                style={{ fontVariationSettings: `'FILL' ${isDone ? 1 : 0}` }}
              >
                {isDone ? 'check_circle' : 'radio_button_unchecked'}
              </span>
            </button>
          )
        })}
      </div>
      {preview && (
        <p className={`text-[11px] mt-1.5 font-medium ${onTeal ? 'text-white/75' : 'text-kh-muted'}`}>
          Vorschau: wird nicht gespeichert.
        </p>
      )}
      {confirmableUntil === 0 && !preview && (
        <p className={`text-[11px] mt-1.5 font-medium ${onTeal ? 'text-white/75' : 'text-kh-muted'}`}>
          Diese Woche beginnt erst am Montag.
        </p>
      )}
      {error && (
        <p className={`text-[11px] mt-1.5 font-semibold ${onTeal ? 'text-white' : 'text-kh-red'}`}>{error}</p>
      )}
    </div>
  )
}
