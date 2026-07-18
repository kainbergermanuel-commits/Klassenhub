'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { todayISO } from '@/lib/date'
import type { SubjectOption } from '@/lib/subjectsCatalog'

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const MONTHS = ['Jänner','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function tomorrowISO() {
  return addDays(todayISO(), 1)
}

function formatDisplay(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('de-AT', { weekday: 'short', day: 'numeric', month: 'long' })
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstWeekday(year: number, month: number) {
  // 0=Su,1=Mo…6=Sa → convert to Mo=0
  return (new Date(year, month, 1).getDay() + 6) % 7
}

interface DatePickerProps {
  value: string
  min: string
  onChange: (v: string) => void
}

function DatePicker({ value, min, onChange }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const sel = new Date(value)
  const [viewYear, setViewYear] = useState(sel.getFullYear())
  const [viewMonth, setViewMonth] = useState(sel.getMonth())

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const today = todayISO()
  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstWeekday = getFirstWeekday(viewYear, viewMonth)

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  function selectDay(day: number) {
    const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    if (iso < min) return
    onChange(iso)
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full rounded-xl border border-kh-border px-4 py-3 text-sm font-medium text-kh-dark text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-kh-teal/40 focus:border-kh-teal transition hover:border-kh-teal/50"
      >
        <span>{formatDisplay(value)}</span>
        <span className="msym text-[18px] text-kh-muted">calendar_month</span>
      </button>

      {open && (
        <div className="absolute z-50 left-0 top-full mt-1 bg-white rounded-2xl shadow-xl border border-kh-border p-4 w-[280px]">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F6F3ED] text-kh-muted transition">
              <span className="msym text-[20px]">chevron_left</span>
            </button>
            <span className="font-extrabold text-[14px] text-kh-dark">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button type="button" onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F6F3ED] text-kh-muted transition">
              <span className="msym text-[20px]">chevron_right</span>
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-center text-[11px] font-bold text-kh-muted py-1">{d}</div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-y-1">
            {Array.from({ length: firstWeekday }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const isSelected = iso === value
              const isToday = iso === today
              const isPast = iso < min
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => selectDay(day)}
                  disabled={isPast}
                  className={`h-8 w-full rounded-lg text-[13px] font-semibold transition-all
                    ${isSelected ? 'bg-kh-teal text-white font-extrabold' : ''}
                    ${!isSelected && isToday ? 'border border-kh-teal text-kh-teal' : ''}
                    ${!isSelected && !isPast ? 'hover:bg-[#F0FAF8] text-kh-dark' : ''}
                    ${isPast ? 'text-kh-muted/40 cursor-not-allowed' : ''}
                  `}
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
  const [dueDate, setDueDate] = useState(tomorrowISO())
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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[74px] px-4 pb-4 bg-black/40 overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl my-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-extrabold text-kh-dark">Neue Hausübung</h2>
            {asPending && (
              <p className="text-xs text-kh-amber font-semibold mt-0.5">Wird zuerst von der Lehrperson bestätigt</p>
            )}
          </div>
          <button onClick={onClose} className="msym text-2xl text-kh-muted hover:text-kh-red transition-colors">close</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-bold text-kh-dark mb-1.5 block">Fach</label>
            {subjects.length === 0 ? (
              <p className="text-[12.5px] text-kh-muted font-medium">Noch keine Fächer angelegt — die Administration verwaltet den Fächer-Katalog unter „Fächer-Katalog".</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {subjects.map((s, i) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => setSubjectIdx(i)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold transition-all"
                    style={i === subjectIdx
                      ? { background: s.color, color: '#fff' }
                      : { background: '#F6F3ED', color: '#46565A' }
                    }
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>

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
            <label className="text-xs font-bold text-kh-dark mb-1.5 block">Fällig am</label>
            <DatePicker value={dueDate} min={todayISO()} onChange={setDueDate} />
          </div>

          {error && (
            <div className="bg-kh-red-light text-kh-red text-sm font-semibold rounded-xl px-4 py-3">{error}</div>
          )}

          <button
            type="submit"
            disabled={isPending || saving || subjects.length === 0}
            className="w-full bg-kh-teal text-white font-bold rounded-xl py-3.5 text-sm flex items-center justify-center gap-2 hover:bg-kh-dark transition disabled:opacity-60"
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
