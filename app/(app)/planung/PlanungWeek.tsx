'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { savePlanningNote, copyPreviousWeek } from '@/app/actions/planning'
import { SUBJECTS } from '@/lib/subjects'

const DAY_LABELS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag']

interface Note { day: number; subject: string; content: string }
interface Props {
  weekStart: string
  prevWeek: string
  nextWeek: string
  currentWeek: string
  initialNotes: Note[]
}

function noteKey(day: number, subject: string) { return `${day}|${subject}` }

function dayDate(weekStart: string, day: number): string {
  const d = new Date(`${weekStart}T00:00:00`)
  d.setDate(d.getDate() + (day - 1))
  return d.toLocaleDateString('de-AT', { day: 'numeric', month: 'numeric' })
}

export default function PlanungWeek({ weekStart, prevWeek, nextWeek, currentWeek, initialNotes }: Props) {
  const router = useRouter()
  // Inhalt je Notiz (auch leere, frisch hinzugefügte Fach-Blöcke)
  const [notes, setNotes] = useState<Map<string, string>>(() => {
    const m = new Map<string, string>()
    for (const n of initialNotes) m.set(noteKey(n.day, n.subject), n.content)
    return m
  })
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [pickerDay, setPickerDay] = useState<number | null>(null)
  const [copying, setCopying] = useState(false)
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerDay(null)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const persist = useCallback(async (day: number, subject: string, content: string) => {
    setStatus('saving')
    try {
      await savePlanningNote(weekStart, day, subject, content)
      setStatus('saved')
    } catch {
      setStatus('idle')
    }
  }, [weekStart])

  function onChange(day: number, subject: string, content: string) {
    const k = noteKey(day, subject)
    setNotes(prev => new Map(prev).set(k, content))
    const existing = timers.current.get(k)
    if (existing) clearTimeout(existing)
    timers.current.set(k, setTimeout(() => persist(day, subject, content), 800))
  }

  function addSubjectNote(day: number, subject: string) {
    setPickerDay(null)
    const k = noteKey(day, subject)
    if (!notes.has(k)) setNotes(prev => new Map(prev).set(k, ''))
  }

  async function removeNote(day: number, subject: string) {
    const k = noteKey(day, subject)
    const existing = timers.current.get(k)
    if (existing) clearTimeout(existing)
    setNotes(prev => { const next = new Map(prev); next.delete(k); return next })
    await persist(day, subject, '')
  }

  async function onCopyWeek() {
    setCopying(true)
    try {
      await copyPreviousWeek(weekStart)
      router.refresh()
    } catch {}
    setCopying(false)
  }

  function subjectMeta(subject: string) {
    return SUBJECTS.find(s => s.label === subject) ?? { label: subject, short: subject, color: '#6E7E80' }
  }

  function subjectsOfDay(day: number): string[] {
    const list: string[] = []
    for (const k of notes.keys()) {
      const [d, subject] = [Number(k.split('|')[0]), k.slice(k.indexOf('|') + 1)]
      if (d === day && subject !== '') list.push(subject)
    }
    return list.sort((a, b) => SUBJECTS.findIndex(s => s.label === a) - SUBJECTS.findIndex(s => s.label === b))
  }

  const weekEmpty = notes.size === 0

  return (
    <div>
      {/* Wochen-Navigation + Status */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <Link href={`/planung?w=${prevWeek}`} className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center text-kh-dark hover:bg-kh-page transition-colors" aria-label="Vorherige Woche">
          <span className="material-symbols-rounded text-[20px]">chevron_left</span>
        </Link>
        <Link href={`/planung?w=${nextWeek}`} className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center text-kh-dark hover:bg-kh-page transition-colors" aria-label="Nächste Woche">
          <span className="material-symbols-rounded text-[20px]">chevron_right</span>
        </Link>
        {weekStart !== currentWeek && (
          <Link href="/planung" className="h-9 px-3.5 rounded-xl bg-white shadow-sm flex items-center text-[13px] font-bold text-kh-dark hover:bg-kh-page transition-colors">
            Heute
          </Link>
        )}
        <div className="flex-1" />
        {weekEmpty && (
          <button onClick={onCopyWeek} disabled={copying}
            className="h-9 px-3.5 rounded-xl bg-white shadow-sm flex items-center gap-1.5 text-[13px] font-bold text-kh-dark hover:bg-kh-page transition-colors disabled:opacity-50">
            <span className="material-symbols-rounded text-[18px]">content_copy</span>
            {copying ? 'Kopiere …' : 'Vorwoche übernehmen'}
          </button>
        )}
        <span className={`text-xs font-semibold transition-opacity ${status === 'idle' ? 'opacity-0' : 'opacity-100'} ${status === 'saving' ? 'text-kh-muted' : 'text-emerald-600'}`}>
          {status === 'saving' ? 'Speichert …' : 'Gespeichert ✓'}
        </span>
      </div>

      {/* Wochennotiz */}
      <div className="bg-white rounded-2xl shadow-sm px-5 py-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="material-symbols-rounded text-[18px] text-kh-muted">sticky_note_2</span>
          <h2 className="text-sm font-extrabold text-kh-dark">Wochennotiz</h2>
        </div>
        <textarea
          value={notes.get(noteKey(0, '')) ?? ''}
          onChange={e => onChange(0, '', e.target.value)}
          placeholder="Allgemeine Planung für diese Woche …"
          rows={3}
          className="w-full resize-y rounded-xl bg-kh-page/60 px-3.5 py-2.5 text-sm text-kh-dark placeholder:text-kh-muted/70 outline-none focus:ring-2 focus:ring-kh-teal/30"
        />
      </div>

      {/* Tageskarten Mo–Fr */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5].map(day => (
          <div key={day} className="bg-white rounded-2xl shadow-sm px-5 py-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-extrabold text-kh-dark">
                {DAY_LABELS[day - 1]} <span className="text-kh-muted font-semibold">· {dayDate(weekStart, day)}</span>
              </h3>
              <div className="relative">
                <button onClick={() => setPickerDay(pickerDay === day ? null : day)}
                  className="h-7 px-2.5 rounded-lg bg-kh-page flex items-center gap-1 text-[12px] font-bold text-kh-dark hover:bg-kh-page/70 transition-colors">
                  <span className="material-symbols-rounded text-[16px]">add</span>Fach
                </button>
                {pickerDay === day && (
                  <div ref={pickerRef} className="absolute right-0 top-9 z-20 bg-white rounded-xl shadow-lg p-2 w-52 max-h-64 overflow-y-auto scrollbar-kh">
                    {SUBJECTS.filter(s => !notes.has(noteKey(day, s.label))).map(s => (
                      <button key={s.label} onClick={() => addSubjectNote(day, s.label)}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-[13px] font-semibold text-kh-dark hover:bg-kh-page transition-colors">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <textarea
              value={notes.get(noteKey(day, '')) ?? ''}
              onChange={e => onChange(day, '', e.target.value)}
              placeholder="Notizen für den Tag …"
              rows={2}
              className="w-full resize-y rounded-xl bg-kh-page/60 px-3.5 py-2.5 text-sm text-kh-dark placeholder:text-kh-muted/70 outline-none focus:ring-2 focus:ring-kh-teal/30"
            />

            {subjectsOfDay(day).map(subject => {
              const meta = subjectMeta(subject)
              return (
                <div key={subject} className="mt-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="inline-flex items-center gap-1.5 text-[12px] font-bold" style={{ color: meta.color }}>
                      <span className="w-2 h-2 rounded-full" style={{ background: meta.color }} />
                      {subject}
                    </span>
                    <button onClick={() => removeNote(day, subject)} aria-label={`${subject}-Notiz entfernen`}
                      className="text-kh-muted/60 hover:text-kh-muted transition-colors">
                      <span className="material-symbols-rounded text-[16px]">close</span>
                    </button>
                  </div>
                  <textarea
                    value={notes.get(noteKey(day, subject)) ?? ''}
                    onChange={e => onChange(day, subject, e.target.value)}
                    placeholder={`Planung für ${subject} …`}
                    rows={2}
                    autoFocus={!(notes.get(noteKey(day, subject)) ?? '')}
                    className="w-full resize-y rounded-xl px-3.5 py-2.5 text-sm text-kh-dark placeholder:text-kh-muted/70 outline-none focus:ring-2"
                    style={{ background: `${meta.color}14`, ['--tw-ring-color' as never]: `${meta.color}40` }}
                  />
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
