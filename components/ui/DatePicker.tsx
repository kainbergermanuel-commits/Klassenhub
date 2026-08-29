'use client'

import { useState, useEffect, useRef } from 'react'
import IconButton from '@/components/ui/IconButton'
import { todayISO } from '@/lib/date'

const MONTHS = ['Jänner', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate() }
/** Montag = 0 (getDay() liefert Sonntag = 0, deshalb der Versatz). */
function getFirstWeekday(y: number, m: number) { return (new Date(y, m, 1).getDay() + 6) % 7 }
function formatDisplay(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('de-AT', { weekday: 'short', day: 'numeric', month: 'long' })
}

/**
 * Datumsauswahl im KlassenHub-Stil (Button mit Klartext-Datum + aufklappender
 * Monatskalender). Bewusst KEIN `<input type="date">`: dessen Darstellung
 * unterscheidet sich je nach Browser und Betriebssystem und passt sich nicht
 * an das übrige Formular-Styling an.
 *
 * Diese Datei ist die gemeinsame Fassung einer Komponente, die zuvor mehrfach
 * kopiert im Projekt lag (Hausübungen, Erinnerungen, Termine, Anwesenheit).
 *
 * `min` ist optional: Eltern dürfen Abwesenheiten auch rückwirkend melden,
 * während Hausübungen/Termine nicht in der Vergangenheit liegen sollen.
 *
 * Der heutige Tag bekommt einen dezenten Rahmen — als Orientierungspunkt im
 * Raster, auch wenn er (z.B. bei Hausübungen) gar nicht wählbar ist.
 */
export default function DatePicker({
  value, min, onChange, placeholder = 'Datum wählen',
}: { value: string; min?: string; onChange: (v: string) => void; placeholder?: string }) {
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

  // Springt der Wert von außen in einen anderen Monat (z.B. weil das Enddatum
  // dem Startdatum nachgezogen wird), muss die Kalenderansicht mitwandern.
  useEffect(() => {
    const d = new Date(`${value}T00:00:00`)
    setViewYear(d.getFullYear())
    setViewMonth(d.getMonth())
  }, [value])

  const today = todayISO()
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
        <span>{value ? formatDisplay(value) : placeholder}</span>
        <span className="msym text-[18px] text-kh-muted">calendar_month</span>
      </button>
      {open && (
        <div className="absolute z-50 left-0 top-full mt-1 bg-white rounded-2xl shadow-xl border border-kh-border p-4 w-[280px]">
          <div className="flex items-center justify-between mb-3">
            <IconButton type="button" onClick={prevMonth} icon="chevron_left" size="sm" aria-label="Vorheriger Monat" />
            <span className="font-extrabold text-[14px] text-kh-dark">{MONTHS[viewMonth]} {viewYear}</span>
            <IconButton type="button" onClick={nextMonth} icon="chevron_right" size="sm" aria-label="Nächster Monat" />
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
              const isToday = iso === today
              return (
                <button key={day} type="button" onClick={() => selectDay(day)} disabled={isPast}
                  className={`h-8 w-full rounded-lg text-[13px] font-semibold transition-all
                    ${isSelected ? 'bg-kh-teal text-white font-extrabold' : ''}
                    ${!isSelected && isToday ? 'border border-kh-teal text-kh-teal' : ''}
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
