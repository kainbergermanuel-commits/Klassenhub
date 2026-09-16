'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setAttendancePartial } from '@/app/actions/attendance'
import IconButton from '@/components/ui/IconButton'
import Avatar from '@/components/ui/Avatar'
import type { Attendance, Profile } from '@/lib/types'

interface Props {
  student: Profile
  date: string
  /** Vorhandener Eintrag des Tages, falls es schon einen gibt. */
  entry: Attendance | undefined
  onClose: () => void
}

const SLOTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

/** Teilabwesenheit eines Kindes für einen Tag: zu spät gekommen und/oder
 *  vorzeitig gegangen. Das Kind war da — hier entsteht kein Fehltag.
 *
 *  Bewusst ohne Grund-Feld: ein Freitext an dieser Stelle füllt sich im Alltag
 *  mit Gesundheitsdaten (DSGVO Art. 9), die die Anwesenheit nirgends speichert. */
export default function PartialAbsenceModal({ student, date, entry, onClose }: Props) {
  const router = useRouter()
  const partial = entry?.status === 'anwesend' ? entry : undefined
  const [late, setLate] = useState(partial?.late ?? false)
  const [goneFrom, setGoneFrom] = useState<number | null>(partial?.gone_from_slot ?? null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Der Tages-Abgleich zeigt die Uhr nur bei anwesenden Kindern, über die
  // Übersicht kann man aber auf einem Fehltag landen. Dann ist klarzustellen,
  // dass das Speichern den ganzen Fehltag ersetzt.
  const replacesAbsence = entry !== undefined && entry.status !== 'anwesend'
  const nothingSet = !late && goneFrom === null

  function submit() {
    setError(null)
    startTransition(async () => {
      try {
        await setAttendancePartial(student.id, date, late, goneFrom)
        router.refresh()
        onClose()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Speichern fehlgeschlagen')
      }
    })
  }

  return (
    <div
      className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="modal-panel bg-white rounded-3xl w-full max-w-sm shadow-2xl"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Zeiten für ${student.full_name}`}
      >
        <div className="flex items-start gap-3 px-6 pt-5 pb-4">
          <Avatar
            name={student.full_name} color={student.avatar_color} seed={student.avatar_seed}
            hairColor={student.avatar_hair_color} skinColor={student.avatar_skin_color} size={36}
          />
          <div className="flex-1 min-w-0">
            <h2 className="font-extrabold text-[16px] text-kh-dark truncate">{student.full_name}</h2>
            <p className="text-[12.5px] text-kh-muted mt-0.5">War da, aber nicht die ganze Zeit.</p>
          </div>
          <IconButton onClick={onClose} aria-label="Schließen" icon="close" size="sm" />
        </div>

        <div className="px-6 pb-2 space-y-4">
          {/* Zu spät — echter Ja/Nein-Fall, keine Fehlstunde */}
          <button
            onClick={() => setLate(v => !v)}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl border-2 transition-colors ${
              late ? 'border-kh-teal bg-kh-teal-light' : 'border-kh-border/60 bg-white hover:border-kh-teal/40'
            }`}
          >
            <span className={`msym text-[20px] ${late ? 'text-kh-teal' : 'text-kh-muted'}`}>schedule</span>
            <span className="flex-1 text-left">
              <span className="block text-[13.5px] font-bold text-kh-dark">Zu spät gekommen</span>
              <span className="block text-[11.5px] text-kh-muted">Verspätung, keine Fehlstunde</span>
            </span>
            <span
              className={`msym text-[20px] flex-shrink-0 ${late ? 'text-kh-teal' : 'text-kh-border'}`}
              style={late ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {late ? 'check_circle' : 'radio_button_unchecked'}
            </span>
          </button>

          {/* Vorzeitig gegangen — die Stunde wird mitgespeichert, damit am
              Semesterende eine Zahl dasteht und nicht nur ein Häkchen. */}
          <div>
            <span className="block text-[11px] font-bold text-kh-muted uppercase tracking-wide mb-2">
              Vorzeitig gegangen ab Stunde
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setGoneFrom(null)}
                className={`px-3 py-1.5 rounded-full text-[12.5px] font-bold transition-colors ${
                  goneFrom === null ? 'bg-kh-teal text-white' : 'bg-kh-bg text-kh-muted hover:text-kh-dark'
                }`}
              >
                Nein
              </button>
              {SLOTS.map(slot => {
                const on = goneFrom === slot
                return (
                  <button
                    key={slot}
                    onClick={() => setGoneFrom(on ? null : slot)}
                    aria-label={`Ab der ${slot}. Stunde weg`}
                    className={`w-9 py-1.5 rounded-full text-[12.5px] font-bold transition-colors ${
                      on ? 'bg-kh-teal text-white' : 'bg-kh-bg text-kh-muted hover:text-kh-dark'
                    }`}
                  >
                    {slot}.
                  </button>
                )
              })}
            </div>
            <p className="text-[11.5px] text-kh-muted mt-2">
              {goneFrom === null
                ? 'War bis Schulschluss da.'
                : `Ab der ${goneFrom}. Stunde nicht mehr da.`}
            </p>
          </div>

          {replacesAbsence && !nothingSet && (
            <p className="px-3 py-2 rounded-xl text-[12px] font-semibold text-kh-amber bg-kh-amber-light">
              Für diesen Tag ist ein ganzer Fehltag eingetragen. Speichern ersetzt ihn.
            </p>
          )}

          {error && (
            <p className="px-3 py-2 rounded-xl text-[12.5px] font-semibold text-kh-red bg-kh-red-light">{error}</p>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-kh-border/50 mt-2">
          <span className="text-[12px] font-semibold text-kh-muted">
            {nothingSet ? 'Nichts gewählt = ganz normal da' : 'Zählt nicht als Fehltag'}
          </span>
          <button
            onClick={submit}
            disabled={isPending}
            className="px-5 py-2 rounded-full text-[13px] font-bold text-white gradient-teal hover:brightness-105 transition disabled:opacity-40 disabled:pointer-events-none"
          >
            {isPending ? 'Wird gespeichert …' : nothingSet && partial ? 'Entfernen' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  )
}
