'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { todayISO } from '@/lib/date'
import Avatar from '@/components/ui/Avatar'

interface Props {
  classId: string
  userId: string
  isPending?: boolean
  onClose: () => void
}

interface Student {
  id: string
  full_name: string
  avatar_color: string
  avatar_seed: string | null
  avatar_hair_color: string | null
  avatar_skin_color: string | null
}

const MONTHS = ['Jänner','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']
const WEEKDAYS = ['Mo','Di','Mi','Do','Fr','Sa','So']

function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10)
}
function tomorrowISO() { return addDays(todayISO(), 1) }
function formatDisplay(iso: string) {
  return new Date(iso).toLocaleDateString('de-AT', { weekday: 'short', day: 'numeric', month: 'long' })
}
function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate() }
function getFirstWeekday(y: number, m: number) { return (new Date(y, m, 1).getDay() + 6) % 7 }

function DatePicker({ value, min, onChange }: { value: string; min: string; onChange: (v: string) => void }) {
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
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) } else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) } else setViewMonth(m => m + 1)
  }
  function selectDay(day: number) {
    const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    if (iso < min) return
    onChange(iso); setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full rounded-xl border border-kh-border px-4 py-3 text-sm font-medium text-kh-dark text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-kh-teal/40 focus:border-kh-teal transition hover:border-kh-teal/50"
      >
        <span>{value ? formatDisplay(value) : 'Datum wählen'}</span>
        <span className="msym text-[18px] text-kh-muted">calendar_month</span>
      </button>
      {open && (
        <div className="absolute z-50 left-0 top-full mt-1 bg-white rounded-2xl shadow-xl border border-kh-border p-4 w-[280px]">
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F6F3ED] text-kh-muted transition">
              <span className="msym text-[20px]">chevron_left</span>
            </button>
            <span className="font-extrabold text-[14px] text-kh-dark">{MONTHS[viewMonth]} {viewYear}</span>
            <button type="button" onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F6F3ED] text-kh-muted transition">
              <span className="msym text-[20px]">chevron_right</span>
            </button>
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
              const isToday = iso === today
              const isPast = iso < min
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

export default function AddReminderModal({ classId, userId, isPending = false, onClose }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(tomorrowISO())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showTargeting, setShowTargeting] = useState(false)
  const [students, setStudents] = useState<Student[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!showTargeting || students.length > 0) return
    createClient()
      .from('profiles')
      .select('id,full_name,avatar_color,avatar_seed,avatar_hair_color,avatar_skin_color')
      .eq('class_id', classId).eq('role', 'student').order('full_name')
      .then(({ data }) => setStudents(data ?? []))
  }, [showTargeting, classId, students.length])

  function toggleStudent(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const canPost = title.trim() && date && (!showTargeting || selectedIds.size > 0)

  async function save() {
    if (!canPost || saving) return
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const { error: dbError } = await supabase.from('reminders').insert({
      class_id: classId,
      title: title.trim(),
      description: description.trim() || null,
      event_date: date,
      created_by: userId,
      status: isPending ? 'pending' : 'published',
      target_student_ids: selectedIds.size > 0 ? [...selectedIds] : null,
    })
    if (dbError) { setError('Fehler beim Speichern. Bitte erneut versuchen.'); setSaving(false); return }
    router.refresh()
    onClose()
  }

  const modal = (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[74px] px-4 pb-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-extrabold text-kh-dark">Neue Erinnerung</h2>
            {isPending && <p className="text-xs text-kh-amber font-semibold mt-0.5">Wird zuerst von der Lehrperson bestätigt</p>}
          </div>
          <button onClick={onClose} className="msym text-2xl text-kh-muted hover:text-kh-dark transition-colors">close</button>
        </div>

        <div className="flex flex-col gap-3">
          <input
            autoFocus value={title} onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && save()}
            placeholder="Titel *"
            className="w-full border border-kh-border rounded-xl px-4 py-3 text-base font-medium text-kh-dark placeholder:text-[#B0BCBA] outline-none focus:border-kh-teal transition-colors"
          />
          <input
            value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Beschreibung (optional)"
            className="w-full border border-kh-border rounded-xl px-4 py-3 text-base font-medium text-kh-dark placeholder:text-[#B0BCBA] outline-none focus:border-kh-teal transition-colors"
          />
          <div>
            <label className="text-xs font-bold text-kh-muted uppercase tracking-wider block mb-1.5">Datum *</label>
            <DatePicker value={date} min={todayISO()} onChange={setDate} />
          </div>

          {!isPending && (
            <div>
              <button type="button" onClick={() => setShowTargeting(v => !v)}
                className="flex items-center gap-1.5 text-[12px] font-bold text-kh-muted hover:text-kh-dark transition-colors">
                <span className="msym text-[15px]">{showTargeting ? 'expand_less' : 'expand_more'}</span>
                {selectedIds.size > 0 ? `${selectedIds.size} Schüler:in ausgewählt` : 'An alle · Empfänger einschränken'}
              </button>

              {showTargeting && (
                <>
                  <div className="flex gap-1.5 mt-2 mb-1">
                    <button type="button" onClick={() => setSelectedIds(new Set(students.map(s => s.id)))}
                      className="text-[11px] font-bold px-3 py-1 rounded-full border border-kh-border hover:border-kh-teal hover:text-kh-teal text-kh-muted transition-colors">
                      Alle
                    </button>
                    <button type="button" onClick={() => setSelectedIds(new Set())}
                      className="text-[11px] font-bold px-3 py-1 rounded-full border border-kh-border hover:border-kh-teal hover:text-kh-teal text-kh-muted transition-colors">
                      Keinen
                    </button>
                  </div>
                  <div className="mt-1 grid grid-cols-4 gap-2">
                    {students.map(s => {
                      const selected = selectedIds.has(s.id)
                      const firstName = s.full_name.split(' ')[0]
                      const long = firstName.length > 7
                      return (
                        <button key={s.id} type="button" onClick={() => toggleStudent(s.id)}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border transition-all ${
                            selected ? 'border-kh-teal bg-kh-teal/10' : 'border-kh-border hover:border-kh-teal/50'
                          }`}>
                          <Avatar name={s.full_name} color={s.avatar_color} seed={s.avatar_seed}
                            hairColor={s.avatar_hair_color} skinColor={s.avatar_skin_color} size={22} />
                          <span className={`${long ? 'text-[10px]' : 'text-[12px]'} font-semibold leading-tight break-words min-w-0 ${selected ? 'text-kh-teal' : 'text-kh-dark'}`}>
                            {firstName}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {error && <div className="mt-4 text-sm font-semibold text-kh-red bg-kh-red-light px-3.5 py-2.5 rounded-xl">{error}</div>}

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-3 rounded-full border border-kh-border text-sm font-bold text-kh-muted hover:bg-[#F6F3ED] transition-colors">
            Abbrechen
          </button>
          <button onClick={save} disabled={!canPost || saving}
            className="flex-1 py-3 rounded-full gradient-teal text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-40">
            {saving ? 'Speichern…' : isPending ? 'Zur Bestätigung senden' : 'Posten'}
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
