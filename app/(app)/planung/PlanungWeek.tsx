'use client'

import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { savePlanningNote, copyPreviousWeek } from '@/app/actions/planning'
import { SUBJECTS } from '@/lib/subjects'

const DAY_LABELS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag']
const DAY_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr']

interface Note { day: number; subject: string; content: string }
interface Props {
  weekStart: string
  prevWeek: string
  nextWeek: string
  currentWeek: string
  weekLabel: string
  initialNotes: Note[]
}

type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'

function noteKey(day: number, subject: string) { return `${day}|${subject}` }

function dayDateISO(weekStart: string, day: number): Date {
  const d = new Date(`${weekStart}T00:00:00`)
  d.setDate(d.getDate() + (day - 1))
  return d
}

function isToday(d: Date): boolean {
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}

/** Textarea, die mit dem Inhalt mitwächst und sich unsichtbar ins Card-Design einfügt. */
function GrowingTextarea({ value, onChange, placeholder, autoFocus }: {
  value: string; onChange: (v: string) => void; placeholder: string; autoFocus?: boolean
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  // Höhe vor dem Messen auf 0 setzen, sonst schrumpft scrollHeight nie
  // und die Textarea wächst bei jedem Re-Render weiter.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = `${Math.max(el.scrollHeight + 2, 56)}px`
  })
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      rows={2}
      className="w-full resize-none bg-transparent text-sm leading-relaxed text-kh-dark placeholder:text-kh-muted/50 outline-none"
    />
  )
}

export default function PlanungWeek({ weekStart, prevWeek, nextWeek, currentWeek, weekLabel, initialNotes }: Props) {
  const router = useRouter()
  const [notes, setNotes] = useState<Map<string, string>>(() => {
    const m = new Map<string, string>()
    for (const n of initialNotes) m.set(noteKey(n.day, n.subject), n.content)
    return m
  })
  const todayIdx = [1, 2, 3, 4, 5].find(d => isToday(dayDateISO(weekStart, d))) ?? 1
  const [selectedDay, setSelectedDay] = useState<number>(weekStart === currentWeek ? todayIdx : 1)
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [copying, setCopying] = useState(false)
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const pending = useRef(0)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const persist = useCallback(async (day: number, subject: string, content: string) => {
    pending.current += 1
    setStatus('saving')
    try {
      await savePlanningNote(weekStart, day, subject, content)
      pending.current -= 1
      if (pending.current === 0) setStatus('saved')
    } catch {
      pending.current -= 1
      setStatus('error')
    }
  }, [weekStart])

  function onChange(day: number, subject: string, content: string) {
    const k = noteKey(day, subject)
    setNotes(prev => new Map(prev).set(k, content))
    setStatus('dirty')
    const existing = timers.current.get(k)
    if (existing) clearTimeout(existing)
    timers.current.set(k, setTimeout(() => persist(day, subject, content), 800))
  }

  function addSubjectNote(subject: string) {
    setPickerOpen(false)
    const k = noteKey(selectedDay, subject)
    if (!notes.has(k)) setNotes(prev => new Map(prev).set(k, ''))
  }

  async function removeNote(subject: string) {
    const k = noteKey(selectedDay, subject)
    const existing = timers.current.get(k)
    if (existing) clearTimeout(existing)
    setNotes(prev => { const next = new Map(prev); next.delete(k); return next })
    await persist(selectedDay, subject, '')
  }

  async function onCopyWeek() {
    setCopying(true)
    try {
      await copyPreviousWeek(weekStart)
      router.refresh()
    } catch {}
    setCopying(false)
  }

  /** Fach-Notizen eines Tages, sortiert nach SUBJECTS-Reihenfolge. */
  function subjectsOfDay(day: number): string[] {
    const list: string[] = []
    for (const k of notes.keys()) {
      const sep = k.indexOf('|')
      const d = Number(k.slice(0, sep))
      const subject = k.slice(sep + 1)
      if (d === day && subject !== '') list.push(subject)
    }
    return list.sort((a, b) => SUBJECTS.findIndex(s => s.label === a) - SUBJECTS.findIndex(s => s.label === b))
  }

  /** Farbpunkte für die Tagesliste: Fächer mit Inhalt + grauer Punkt für allgemeine Notiz. */
  function dayDots(day: number): string[] {
    const dots: string[] = []
    if ((notes.get(noteKey(day, '')) ?? '').trim()) dots.push('#9AA6A7')
    for (const s of subjectsOfDay(day)) {
      if ((notes.get(noteKey(day, s)) ?? '').trim()) {
        dots.push(SUBJECTS.find(x => x.label === s)?.color ?? '#6E7E80')
      }
    }
    return dots.slice(0, 4)
  }

  function subjectMeta(subject: string) {
    return SUBJECTS.find(s => s.label === subject) ?? { label: subject, short: subject, color: '#6E7E80' }
  }

  const weekEmpty = notes.size === 0
  const selDate = dayDateISO(weekStart, selectedDay)
  const selDateLabel = selDate.toLocaleDateString('de-AT', { day: 'numeric', month: 'long' })

  const statusView = {
    idle:   { text: '', cls: '' },
    dirty:  { text: '· · ·', cls: 'text-kh-muted/70' },
    saving: { text: 'Speichert …', cls: 'text-kh-muted' },
    saved:  { text: 'Gespeichert ✓', cls: 'text-emerald-600' },
    error:  { text: 'Speichern fehlgeschlagen', cls: 'text-red-500' },
  }[status]

  return (
    <div className="grid grid-cols-1 md:grid-cols-[264px_1fr] gap-4 items-start">

      {/* Linke Card: Woche + Tagesliste + Wochennotiz */}
      <div className="bg-white rounded-2xl shadow-sm p-4 md:sticky md:top-4">
        <div className="flex items-center justify-between mb-3">
          <Link href={`/planung?w=${prevWeek}`} className="w-8 h-8 rounded-lg flex items-center justify-center text-kh-muted hover:bg-kh-page hover:text-kh-dark transition-colors" aria-label="Vorherige Woche">
            <span className="material-symbols-rounded text-[20px]">chevron_left</span>
          </Link>
          <div className="text-center">
            <div className="text-[13px] font-extrabold text-kh-dark">{weekLabel}</div>
            {weekStart !== currentWeek && (
              <Link href="/planung" className="text-[11px] font-bold text-kh-teal hover:underline">Zur aktuellen Woche</Link>
            )}
          </div>
          <Link href={`/planung?w=${nextWeek}`} className="w-8 h-8 rounded-lg flex items-center justify-center text-kh-muted hover:bg-kh-page hover:text-kh-dark transition-colors" aria-label="Nächste Woche">
            <span className="material-symbols-rounded text-[20px]">chevron_right</span>
          </Link>
        </div>

        {/* Tage: mobil als Chips nebeneinander, ab md untereinander */}
        <div className="flex md:flex-col gap-1.5">
          {[1, 2, 3, 4, 5].map(day => {
            const d = dayDateISO(weekStart, day)
            const active = day === selectedDay
            const today = isToday(d)
            const dots = dayDots(day)
            return (
              <button key={day} onClick={() => setSelectedDay(day)}
                className={`flex-1 md:w-full flex md:items-center max-md:flex-col max-md:items-center gap-0.5 md:gap-3 rounded-xl px-2 md:px-3.5 py-2 md:py-2.5 text-left transition-colors ${
                  active ? 'bg-gradient-to-br from-kh-dark to-kh-teal text-white' : 'hover:bg-kh-page text-kh-dark'
                }`}>
                <span className={`text-[15px] font-extrabold w-auto md:w-7 ${active ? 'text-white' : today ? 'text-kh-teal' : ''}`}>
                  {DAY_SHORT[day - 1]}
                </span>
                <span className={`text-[12px] font-semibold ${active ? 'text-white/70' : 'text-kh-muted'}`}>
                  {d.toLocaleDateString('de-AT', { day: 'numeric', month: 'numeric' })}
                </span>
                <span className="flex gap-1 md:ml-auto min-h-[6px]">
                  {dots.map((c, i) => (
                    <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: active ? 'rgba(255,255,255,.8)' : c }} />
                  ))}
                </span>
              </button>
            )
          })}
        </div>

        {/* Wochennotiz */}
        <div className="mt-4 pt-4 border-t border-kh-page">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="material-symbols-rounded text-[16px] text-kh-muted">sticky_note_2</span>
            <span className="text-[12px] font-extrabold text-kh-dark uppercase tracking-wide">Wochennotiz</span>
          </div>
          <GrowingTextarea
            value={notes.get(noteKey(0, '')) ?? ''}
            onChange={v => onChange(0, '', v)}
            placeholder="Für die ganze Woche …"
          />
        </div>

        {weekEmpty && (
          <button onClick={onCopyWeek} disabled={copying}
            className="mt-3 w-full h-9 rounded-xl bg-gradient-to-br from-kh-page to-kh-teal-light flex items-center justify-center gap-1.5 text-[12px] font-bold text-kh-dark hover:brightness-95 transition-colors disabled:opacity-50">
            <span className="material-symbols-rounded text-[16px]">content_copy</span>
            {copying ? 'Kopiere …' : 'Vorwoche übernehmen'}
          </button>
        )}
      </div>

      {/* Rechte Card: Tagesplanung */}
      <div className="rounded-2xl shadow-sm p-6 max-md:p-5 min-h-[420px] bg-gradient-to-br from-white via-white to-kh-page">
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <h2 className="text-[19px] font-extrabold text-kh-dark tracking-tight">{DAY_LABELS[selectedDay - 1]}</h2>
            <p className="text-[13px] text-kh-muted font-medium">{selDateLabel}{isToday(selDate) ? ' · Heute' : ''}</p>
          </div>
          <div className="flex items-center gap-3">
            <span aria-live="polite" className={`text-xs font-semibold ${statusView.cls}`}>{statusView.text}</span>
            <div className="relative">
              <button onClick={() => setPickerOpen(o => !o)}
                className="h-8 px-3 rounded-lg bg-gradient-to-br from-kh-teal to-emerald-400 shadow-sm flex items-center gap-1 text-[12px] font-bold text-white hover:brightness-110 transition-all">
                <span className="material-symbols-rounded text-[13px]">add</span>Fach
              </button>
              {pickerOpen && (
                <div ref={pickerRef} className="absolute right-0 top-10 z-20 bg-white rounded-xl shadow-lg p-2 w-52 max-h-64 overflow-y-auto scrollbar-kh">
                  {SUBJECTS.filter(s => !notes.has(noteKey(selectedDay, s.label))).map(s => (
                    <button key={s.label} onClick={() => addSubjectNote(s.label)}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-[13px] font-semibold text-kh-dark hover:bg-kh-page transition-colors">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Allgemeine Tagesnotiz */}
        <GrowingTextarea
          value={notes.get(noteKey(selectedDay, '')) ?? ''}
          onChange={v => onChange(selectedDay, '', v)}
          placeholder={`Was steht am ${DAY_LABELS[selectedDay - 1]} an?`}
        />

        {/* Fach-Abschnitte */}
        {subjectsOfDay(selectedDay).map(subject => {
          const meta = subjectMeta(subject)
          return (
            <div key={subject} className="mt-4 pt-3 border-t border-kh-dark/5 group">
              <div className="flex items-center justify-between mb-0.5">
                <span className="inline-flex items-center gap-1.5 text-[12px] font-extrabold uppercase tracking-wide" style={{ color: meta.color }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: meta.color }} />
                  {subject}
                </span>
                <button onClick={() => removeNote(subject)} aria-label={`${subject}-Notiz entfernen`}
                  className="text-kh-muted/40 hover:text-kh-muted transition-colors md:opacity-0 md:group-hover:opacity-100">
                  <span className="material-symbols-rounded text-[16px]">close</span>
                </button>
              </div>
              <GrowingTextarea
                value={notes.get(noteKey(selectedDay, subject)) ?? ''}
                onChange={v => onChange(selectedDay, subject, v)}
                placeholder={`Planung für ${subject} …`}
                autoFocus={!(notes.get(noteKey(selectedDay, subject)) ?? '')}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
