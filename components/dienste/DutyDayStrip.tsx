'use client'

import { useState, useTransition } from 'react'
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
  /** Lehrer-Vorschau: sichtbar, aber nicht bedienbar (RLS würde still scheitern). */
  readOnly?: boolean
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
  dutyId, doneWeekdays, confirmableUntil, readOnly = false, tone = 'light', onCountChange,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [done, setDone] = useState<Set<number>>(new Set(doneWeekdays))
  const [error, setError] = useState<string | null>(null)

  function toggle(weekday: number) {
    if (readOnly || weekday > confirmableUntil || pending) return
    const next = new Set(done)
    const willBeDone = !next.has(weekday)
    if (willBeDone) next.add(weekday)
    else next.delete(weekday)
    setDone(next)
    setError(null)
    onCountChange?.(next.size)
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
      <div className="flex gap-1.5">
        {DAY_LABELS.map((label, i) => {
          const weekday = i + 1
          const isDone = done.has(weekday)
          const isLocked = weekday > confirmableUntil
          const isToday = weekday === confirmableUntil && confirmableUntil > 0
          const disabled = readOnly || isLocked || pending
          return (
            <button
              key={label}
              type="button"
              onClick={() => toggle(weekday)}
              disabled={disabled}
              className={`flex-1 flex flex-col items-center gap-1 py-1.5 rounded-xl transition-all ${
                isLocked || readOnly ? 'cursor-default' : 'hover:-translate-y-0.5'
              } ${isLocked ? 'opacity-40' : ''}`}
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
                className={`msym text-[15px] ${isDone ? 'text-white' : onTeal ? 'text-white/70' : 'text-kh-muted/50'}`}
                style={{ fontVariationSettings: `'FILL' ${isDone ? 1 : 0}` }}
              >
                {isDone ? 'check_circle' : 'radio_button_unchecked'}
              </span>
            </button>
          )
        })}
      </div>
      {readOnly && (
        <p className={`text-[11px] mt-1.5 font-medium ${onTeal ? 'text-white/75' : 'text-kh-muted'}`}>
          In der Vorschau nur zum Ansehen.
        </p>
      )}
      {confirmableUntil === 0 && !readOnly && (
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
