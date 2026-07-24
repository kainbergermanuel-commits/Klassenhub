'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setBulkAbsence } from '@/app/actions/attendance'
import Avatar from '@/components/ui/Avatar'
import IconButton from '@/components/ui/IconButton'
import DatePicker from '@/components/ui/DatePicker'
import type { Profile } from '@/lib/types'

interface Props {
  students: Profile[]
  today: string
  onClose: () => void
}

/** Zählt die Schultage (Mo–Fr) im Zeitraum — dieselbe Wochenend-Regel wie in
 *  der Server-Action, damit die Vorschau nicht mehr verspricht als eingetragen
 *  wird. */
function countSchoolDays(startDate: string, endDate: string): number {
  if (!startDate || !endDate || endDate < startDate) return 0
  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)
  const span = Math.round((end.getTime() - start.getTime()) / 86400000) + 1
  if (span > 400) return 0
  let n = 0
  for (let i = 0; i < span; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const wd = d.getDay()
    if (wd !== 0 && wd !== 6) n++
  }
  return n
}

/**
 * Abwesenheit für mehrere Kinder über einen Zeitraum eintragen — für Fälle,
 * die der Tages-Abgleich nur mühsam abbildet: Skikurs, Wettbewerb, oder ein
 * Kind zwei Wochen krank. Trägt immer "entschuldigt" ein und gilt sofort als
 * bestätigt (die Lehrperson ist hier die meldende Stelle).
 */
export default function BulkAbsenceModal({ students, today, onClose }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const schoolDays = useMemo(() => countSchoolDays(startDate, endDate), [startDate, endDate])
  const canSubmit = selected.size > 0 && schoolDays > 0 && schoolDays <= 30 && !isPending

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setError(null)
  }

  function submit() {
    if (!canSubmit) return
    setError(null)
    startTransition(async () => {
      try {
        await setBulkAbsence([...selected], startDate, endDate, note)
        router.refresh()
        onClose()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Eintragen fehlgeschlagen')
      }
    })
  }

  const rangeHint =
    schoolDays === 0 ? 'Kein Schultag im Zeitraum'
    : schoolDays > 30 ? 'Maximal 30 Tage pro Eintrag'
    : `${schoolDays} ${schoolDays === 1 ? 'Schultag' : 'Schultage'} · Wochenenden werden übersprungen`

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[88vh]"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Abwesenheit eintragen"
      >
        <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-4">
          <div>
            <h2 className="font-extrabold text-[17px] text-kh-dark">Abwesenheit eintragen</h2>
            <p className="text-[12.5px] text-kh-muted mt-0.5">
              Mehrere Kinder, mehrere Tage — wird als <strong className="font-bold">entschuldigt</strong> gespeichert.
            </p>
          </div>
          <IconButton onClick={onClose} aria-label="Schließen" icon="close" size="sm" />
        </div>

        {/* Zeitraum, Grund und die Kinder-Kopfzeile stehen bewusst AUSSERHALB
            des Scrollbereichs: der Kalender des DatePickers klappt absolut
            positioniert auf und würde in einem overflow-y-auto-Container
            abgeschnitten. Nebeneffekt: Datum und Grund bleiben sichtbar,
            während man durch die Klassenliste scrollt. */}
        <div className="px-6">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="block text-[11px] font-bold text-kh-muted uppercase tracking-wide mb-1.5">Von</span>
              <DatePicker
                value={startDate}
                onChange={v => {
                  setStartDate(v)
                  // Enddatum mitziehen, statt den Nutzer in einen ungültigen
                  // Zustand laufen zu lassen.
                  if (endDate < v) setEndDate(v)
                }}
              />
            </div>
            <div>
              <span className="block text-[11px] font-bold text-kh-muted uppercase tracking-wide mb-1.5">Bis</span>
              <DatePicker value={endDate} min={startDate} onChange={setEndDate} />
            </div>
          </div>
          <p className={`text-[12px] font-semibold mt-1.5 ${schoolDays === 0 || schoolDays > 30 ? 'text-kh-red' : 'text-kh-muted'}`}>
            {rangeHint}
          </p>

          {/* Grund */}
          <label className="block mt-4">
            <span className="block text-[11px] font-bold text-kh-muted uppercase tracking-wide mb-1.5">
              Grund <span className="font-medium normal-case tracking-normal">(optional)</span>
            </span>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              maxLength={300}
              placeholder="z.B. Skikurs"
              className="w-full rounded-xl border border-kh-border px-4 py-3 text-sm font-medium text-kh-dark placeholder:text-kh-muted/70 focus:outline-none focus:ring-2 focus:ring-kh-teal/40 focus:border-kh-teal transition"
            />
          </label>

          {/* Kinder */}
          <div className="flex items-center justify-between gap-2 mt-4 mb-2">
            <span className="text-[11px] font-bold text-kh-muted uppercase tracking-wide">
              Kinder {selected.size > 0 && <span className="text-kh-teal">· {selected.size} gewählt</span>}
            </span>
            <div className="flex gap-1.5">
              <button
                onClick={() => setSelected(new Set(students.map(s => s.id)))}
                className="px-2.5 py-1 rounded-full text-[11.5px] font-bold text-kh-teal bg-kh-teal-light hover:bg-kh-teal hover:text-white transition-colors"
              >
                Alle
              </button>
              <button
                onClick={() => setSelected(new Set())}
                disabled={selected.size === 0}
                className="px-2.5 py-1 rounded-full text-[11.5px] font-bold text-kh-muted bg-kh-bg hover:text-kh-dark transition-colors disabled:opacity-40"
              >
                Keine
              </button>
            </div>
          </div>
        </div>

        <div className="px-6 pb-2 overflow-y-auto flex-1 min-h-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {students.map(s => {
              const on = selected.has(s.id)
              return (
                <button
                  key={s.id}
                  onClick={() => toggle(s.id)}
                  role="checkbox"
                  aria-checked={on}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all border ${
                    on
                      ? 'border-kh-teal bg-kh-teal-light'
                      : 'border-kh-border/60 bg-white hover:border-kh-teal/40'
                  }`}
                >
                  <Avatar
                    name={s.full_name} color={s.avatar_color} seed={s.avatar_seed}
                    hairColor={s.avatar_hair_color} skinColor={s.avatar_skin_color} size={28}
                  />
                  <span className="flex-1 min-w-0 text-[13px] font-bold text-kh-dark truncate">{s.full_name}</span>
                  <span
                    className={`msym text-[18px] flex-shrink-0 ${on ? 'text-kh-teal' : 'text-kh-border'}`}
                    style={on ? { fontVariationSettings: "'FILL' 1" } : undefined}
                  >
                    {on ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {error && (
          <p className="mx-6 mt-3 px-3 py-2 rounded-xl text-[12.5px] font-semibold text-kh-red bg-kh-red-light">{error}</p>
        )}

        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-kh-border/50 mt-2">
          <span className="text-[12.5px] font-semibold text-kh-muted">
            {selected.size > 0 && schoolDays > 0
              ? `${selected.size} ${selected.size === 1 ? 'Kind' : 'Kinder'} × ${schoolDays} ${schoolDays === 1 ? 'Tag' : 'Tage'}`
              : 'Kinder und Zeitraum wählen'}
          </span>
          <button
            onClick={submit}
            disabled={!canSubmit}
            className="px-5 py-2 rounded-full text-[13px] font-bold text-white gradient-teal hover:brightness-105 transition disabled:opacity-40 disabled:pointer-events-none"
          >
            {isPending ? 'Wird eingetragen …' : 'Eintragen'}
          </button>
        </div>
      </div>
    </div>
  )
}
