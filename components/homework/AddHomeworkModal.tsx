'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { addDaysISO } from '@/lib/date'
import IconButton from '@/components/ui/IconButton'
import DatePicker from '@/components/ui/DatePicker'
import SubjectPicker from './SubjectPicker'
import type { SubjectOption } from '@/lib/subjectsCatalog'

/** Frühestes wählbares Fälligkeitsdatum: morgen. Eine heute fällige HÜ wäre
 *  nach der Fälligkeitsregel im Moment des Anlegens bereits versäumt (siehe
 *  isOver in lib/date.ts), die darf man gar nicht erst auswählen können. */
const EARLIEST_DUE = () => addDaysISO(1)

/** Obergrenze für die Details. Bewusst nur hier und nicht als CHECK in der
 *  Datenbank — eine spätere Lockerung soll keine Migration brauchen. */
const DETAILS_MAX = 500

interface Props {
  classId: string
  userId: string
  /** Fächer-Katalog (Admin-verwaltet, siehe lib/subjectsCatalog.ts) — vom
   *  Aufrufer server-seitig geladen und durchgereicht, damit hier keine
   *  eigene Kopie der Liste existiert. */
  subjects: SubjectOption[]
  asPending?: boolean
  onClose: () => void
}

export default function AddHomeworkModal({ classId, userId, subjects, asPending = false, onClose }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [subjectIdx, setSubjectIdx] = useState(0)
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState(EARLIEST_DUE())
  const [details, setDetails] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const subject = subjects[subjectIdx]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return
    if (!subject) { setError('Kein Fach ausgewählt.'); return }
    if (!title.trim() || !dueDate) { setError('Bitte alle Felder ausfüllen.'); return }
    setError(null)
    setSaving(true)

    const supabase = createClient()
    const { error: dbError } = await supabase.from('homework').insert({
      class_id: classId,
      subject: subject.label,
      subject_short: subject.short,
      subject_color: subject.color,
      title: title.trim(),
      due_date: dueDate,
      details: details.trim() || null,
      created_by: userId,
      status: asPending ? 'pending' : 'published',
    })

    if (dbError) { setError('Fehler beim Speichern. Bitte erneut versuchen.'); setSaving(false); return }

    startTransition(() => {
      router.refresh()
      onClose()
    })
  }

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-start justify-center pt-[74px] px-4 pb-4 bg-black/40 overflow-y-auto" onClick={onClose}>
      <div className="modal-panel w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl my-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-extrabold text-kh-dark">Neue Hausübung</h2>
            {asPending && (
              <p className="text-xs text-kh-amber font-semibold mt-0.5">Wird zuerst von der Lehrperson bestätigt</p>
            )}
          </div>
          <IconButton onClick={onClose} aria-label="Schließen" icon="close" size="sm" />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <SubjectPicker
            subjects={subjects}
            value={subject?.label ?? ''}
            onChange={label => setSubjectIdx(subjects.findIndex(x => x.label === label))}
          />

          <div>
            <label className="text-xs font-bold text-kh-dark mb-1.5 block" htmlFor="hw-title">Aufgabe</label>
            <input
              id="hw-title"
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="z.B. Übungsblatt S. 42, Nr. 1–6"
              className="w-full rounded-xl border border-kh-border px-4 py-3 text-base font-medium text-kh-dark placeholder:text-kh-muted focus:outline-none focus:ring-2 focus:ring-kh-teal/40 focus:border-kh-teal transition"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-kh-dark mb-1.5 block" htmlFor="hw-details">
              Details <span className="font-semibold text-kh-muted">(optional)</span>
            </label>
            <textarea
              id="hw-details"
              rows={3}
              maxLength={DETAILS_MAX}
              value={details}
              onChange={e => setDetails(e.target.value)}
              placeholder="Was genau ist zu tun? Was mitbringen?"
              className="w-full rounded-xl border border-kh-border px-4 py-3 text-base font-medium text-kh-dark placeholder:text-kh-muted focus:outline-none focus:ring-2 focus:ring-kh-teal/40 focus:border-kh-teal transition resize-y"
            />
            {details.length > DETAILS_MAX - 80 && (
              <p className="text-[11px] text-kh-muted font-semibold mt-1 text-right">
                noch {DETAILS_MAX - details.length} Zeichen
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-bold text-kh-dark mb-1.5 block">Fällig am</label>
            <DatePicker value={dueDate} min={EARLIEST_DUE()} onChange={setDueDate} />
          </div>

          {error && (
            <div className="bg-kh-red-light text-kh-red text-sm font-semibold rounded-xl px-4 py-3">{error}</div>
          )}

          <button
            type="submit"
            disabled={isPending || saving || subjects.length === 0}
            className="w-full gradient-teal text-white font-bold rounded-xl py-3.5 text-sm flex items-center justify-center gap-2 hover:brightness-105 transition-[filter,opacity] duration-150 tap disabled:opacity-60"
          >
            {isPending || saving
              ? <span className="msym animate-spin text-lg">progress_activity</span>
              : <><span className="msym text-lg">check</span> {asPending ? 'Zur Bestätigung senden' : 'Hausübung posten'}</>
            }
          </button>
        </form>
      </div>
    </div>
  )
}
