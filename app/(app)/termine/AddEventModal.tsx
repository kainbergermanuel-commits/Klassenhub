'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createEvent, createOwnEvent, updateEvent } from '@/app/actions/events'
import { EVENT_CATEGORIES, hasSubjectField, type EventCategory } from '@/lib/eventCategories'
import { findCollisions, type SchularbeitLike } from '@/lib/schularbeit'
import type { SubjectOption } from '@/lib/subjectsCatalog'
import Avatar from '@/components/ui/Avatar'
import IconButton from '@/components/ui/IconButton'
import DatePicker from '@/components/ui/DatePicker'
import type { CalendarEvent } from '@/lib/types'

interface Props {
  today: string
  classId: string
  mode?: 'teacher' | 'student'
  /** Gesetzt = Bearbeiten statt Anlegen. Alle Felder werden vorbelegt. */
  editEvent?: CalendarEvent
  /** Fächer-Katalog für Schularbeit/Prüfung. */
  subjects?: SubjectOption[]
  /** Bereits eingetragene Termine der Klasse, für die Kollisionsprüfung. */
  existingEvents?: SchularbeitLike[]
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

export default function AddEventModal({
  today, classId, mode = 'teacher', editEvent, subjects = [], existingEvents = [], onClose,
}: Props) {
  const isStudent = mode === 'student'
  const isEdit = !!editEvent
  const router = useRouter()
  const [title, setTitle] = useState(editEvent?.title ?? '')
  const [description, setDescription] = useState(editEvent?.description ?? '')
  const [location, setLocation] = useState(editEvent?.location ?? '')
  const [category, setCategory] = useState<EventCategory>((editEvent?.category as EventCategory) ?? 'sonstiges')
  const [startDate, setStartDate] = useState(editEvent?.start_date ?? today)
  const [endDate, setEndDate] = useState(editEvent?.end_date ?? today)
  const [multiDay, setMultiDay] = useState(!!editEvent && editEvent.end_date !== editEvent.start_date)
  const [allDay, setAllDay] = useState(editEvent ? editEvent.all_day : true)
  const [startTime, setStartTime] = useState(editEvent?.start_time ?? '08:00')
  const [endTime, setEndTime] = useState(editEvent?.end_time ?? '')
  const [subjectShort, setSubjectShort] = useState<string | null>(editEvent?.subject_short ?? null)
  // Merkt sich, ob der Titel noch unberührt ist. Nur dann darf die Fachauswahl
  // ihn vorschlagen — eine eigene Formulierung wird nie überschrieben.
  const [titleTouched, setTitleTouched] = useState(!!editEvent)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Beim Bearbeiten eines gezielten Termins ist die Zielgruppe von Anfang an
  // offen und vorbelegt — sonst ginge sie beim Speichern verloren.
  const [showTargeting, setShowTargeting] = useState(!!editEvent?.target_student_ids)
  const [students, setStudents] = useState<Student[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(editEvent?.target_student_ids ?? [])
  )

  // Ein bereits vergangener Termin muss sein eigenes Datum behalten dürfen,
  // sonst stünde im Bearbeiten-Formular ein im Kalender gesperrter Tag.
  const minDate = editEvent && editEvent.start_date < today ? editEvent.start_date : today
  // Ohne Fächer-Katalog gäbe es keine Fachauswahl — eine Schularbeit liesse
  // sich dann anwählen, aber nicht speichern (Fach ist Pflicht). Deshalb
  // erscheint die Kategorie erst gar nicht.
  const availableCategories = subjects.length > 0
    ? EVENT_CATEGORIES
    : EVENT_CATEGORIES.filter(c => c.value !== 'schularbeit')
  const showSubject = hasSubjectField(category)
  const subjectMeta = subjects.find(x => x.short === subjectShort) ?? null

  function pickSubject(short: string) {
    const next = subjectShort === short ? null : short
    setSubjectShort(next)
    // Bequemlichkeit: leerer Titel + Fach gewählt = "Deutsch-Schularbeit".
    if (!titleTouched && next && category === 'schularbeit') {
      const label = subjects.find(x => x.short === next)?.label
      if (label) setTitle(`${label}-Schularbeit`)
    }
  }

  // Kollisionen nur bei Schularbeiten und nur gegen die bereits geladenen
  // Termine der Klasse — kein zusätzlicher Query, keine Serverlogik.
  const collisions = category === 'schularbeit'
    ? findCollisions(startDate, existingEvents, today,
        short => subjects.find(x => x.short === short)?.label ?? short ?? 'Schularbeit',
        editEvent?.id)
    : []

  // Escape schliesst das Formular. Bisher ging das nur ueber den Abbrechen-
  // Knopf oder einen Klick auf den Hintergrund.
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    if (isStudent || !showTargeting || students.length > 0) return
    createClient()
      .from('profiles')
      .select('id,full_name,avatar_color,avatar_seed,avatar_hair_color,avatar_skin_color')
      .eq('class_id', classId).eq('role', 'student').order('full_name')
      .then(({ data }) => setStudents(data ?? []))
  }, [isStudent, showTargeting, classId, students.length])

  function toggleStudent(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function onStartDateChange(v: string) {
    setStartDate(v)
    if (!multiDay || v > endDate) setEndDate(v)
  }

  // Beim Anlegen erzwingt eine geöffnete Zielgruppe mindestens eine Auswahl.
  // Beim Bearbeiten nicht: "keine Auswahl" ist dort die gültige Absicht,
  // einen persönlichen Termin wieder zum Klassentermin zu machen.
  // Endzeit muss nach der Startzeit liegen — gleiche Regel wie serverseitig
  // in validateEventInput, hier nur frueher sichtbar.
  const timeInvalid = !allDay && !!startTime && !!endTime && endTime <= startTime
  // Eine Schularbeit ohne Fach ist sinnlos — das Fach IST ihre Identität.
  // Bei einer Prüfung bleibt es freiwillig.
  const subjectMissing = category === 'schularbeit' && !subjectShort
  const canPost = title.trim().length > 0 && startDate && endDate >= startDate && !timeInvalid
    && !subjectMissing
    && (isStudent || isEdit || !showTargeting || selectedIds.size > 0)

  async function save() {
    if (!canPost || saving) return
    setSaving(true)
    setError(null)
    try {
      const base = {
        title, description, location, category,
        startDate, endDate: multiDay ? endDate : startDate,
        allDay, startTime: allDay ? null : startTime, endTime: allDay ? null : (endTime || null),
        subjectShort: showSubject ? subjectShort : null,
      }
      if (isEdit) {
        // Zielgruppe nur mitschicken, wenn die Lehrperson sie auch gesehen hat.
        // Sonst bleibt sie serverseitig unangetastet (siehe updateEvent).
        await updateEvent(editEvent.id, {
          ...base,
          ...(isStudent || !showTargeting
            ? {}
            : { targetStudentIds: selectedIds.size > 0 ? [...selectedIds] : null }),
        })
      } else if (isStudent) {
        await createOwnEvent(base)
      } else {
        await createEvent({ ...base, targetStudentIds: selectedIds.size > 0 ? [...selectedIds] : null })
      }
      router.refresh()
      onClose()
    } catch {
      setError('Fehler beim Speichern. Bitte erneut versuchen.')
      setSaving(false)
    }
  }

  const modal = (
    <div className="modal-backdrop fixed inset-0 z-[200] flex items-start justify-center pt-[74px] px-4 pb-4 bg-black/40 overflow-y-auto" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? 'Termin bearbeiten' : isStudent ? 'Neuer persönlicher Termin' : 'Neuer Termin'}
        className="modal-panel bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl my-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-extrabold text-kh-dark">
              {isEdit ? 'Termin bearbeiten' : isStudent ? 'Neuer persönlicher Termin' : 'Neuer Termin'}
            </h2>
            {/* Vorher stand hier "Nur für dich sichtbar". Das war eine falsche
                Zusage: die Lesepolicy gibt Lehrpersonen ausnahmslos alle
                Termine ihrer Klasse frei, Eltern jeden Termin ihres Kindes.
                Ein Kind, das hier etwas Privates einträgt, muss wissen, wer
                mitliest. */}
            {isStudent && (
              <p className="text-xs text-kh-muted font-semibold mt-0.5">
                Nicht für die Klasse sichtbar. Deine Lehrkraft und deine Eltern sehen ihn.
              </p>
            )}
          </div>
          <IconButton onClick={onClose} aria-label="Schließen" icon="close" size="sm" />
        </div>

        <div className="flex flex-col gap-3">
          <input
            autoFocus value={title} onChange={e => { setTitle(e.target.value); setTitleTouched(true) }}
            placeholder="Titel *"
            className="w-full border border-kh-border rounded-xl px-4 py-3 text-base font-medium text-kh-dark placeholder:text-[#B0BCBA] outline-none focus:border-kh-teal transition-colors"
          />
          <input
            value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Beschreibung (optional)"
            className="w-full border border-kh-border rounded-xl px-4 py-3 text-base font-medium text-kh-dark placeholder:text-[#B0BCBA] outline-none focus:border-kh-teal transition-colors"
          />
          <input
            value={location} onChange={e => setLocation(e.target.value)}
            placeholder="Ort (optional)"
            className="w-full border border-kh-border rounded-xl px-4 py-3 text-base font-medium text-kh-dark placeholder:text-[#B0BCBA] outline-none focus:border-kh-teal transition-colors"
          />

          {/* Kategorie */}
          <div>
            <label className="text-xs font-bold text-kh-muted uppercase tracking-wider block mb-1.5">Kategorie</label>
            <div className="flex flex-wrap gap-1.5">
              {availableCategories.map(c => (
                <button key={c.value} type="button" onClick={() => setCategory(c.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[12.5px] font-semibold transition-all ${
                    category === c.value ? 'text-white border-transparent' : 'border-kh-border text-kh-dark hover:border-kh-teal/50'
                  }`}
                  style={category === c.value ? { background: c.color } : undefined}
                >
                  <span className="msym text-[14px]">{c.icon}</span>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Fach — nur bei Schularbeit und Prüfung, damit das Formular bei
              allen anderen Kategorien unverändert schlank bleibt. */}
          {showSubject && subjects.length > 0 && (
            <div>
              <label className="text-xs font-bold text-kh-muted uppercase tracking-wider block mb-1.5">
                Fach {category === 'schularbeit' ? '*' : '(optional)'}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {subjects.map(sub => {
                  const active = subjectShort === sub.short
                  return (
                    <button key={sub.short} type="button" onClick={() => pickSubject(sub.short)}
                      aria-pressed={active}
                      className={`px-3 py-1.5 rounded-full border text-[12.5px] font-bold transition-all ${
                        active ? 'text-white border-transparent' : 'border-kh-border text-kh-dark hover:border-kh-teal/50'
                      }`}
                      style={active ? { background: sub.color } : undefined}
                    >
                      {sub.short}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Datum */}
          <div>
            <label className="text-xs font-bold text-kh-muted uppercase tracking-wider block mb-1.5">
              {multiDay ? 'Von' : 'Datum'} *
            </label>
            <DatePicker value={startDate} min={minDate} onChange={onStartDateChange} />
          </div>
          {multiDay && (
            <div>
              <label className="text-xs font-bold text-kh-muted uppercase tracking-wider block mb-1.5">Bis *</label>
              <DatePicker value={endDate} min={startDate} onChange={setEndDate} />
            </div>
          )}
          {/* Kollisionshinweise. Bewusst warm-gelb und nicht rot: es ist nichts
              falsch, die Lehrperson soll es nur wissen. Halten nicht auf. */}
          {collisions.length > 0 && (
            <div className="flex flex-col gap-2">
              {collisions.map(c => (
                <div key={c.kind}
                  className="flex gap-2.5 items-start rounded-xl px-3.5 py-3"
                  style={{ background: '#FDF6E7', border: '1px solid #EBD9AE' }}>
                  <span className="msym text-[17px] flex-shrink-0" style={{ color: '#C98A2B' }}>info</span>
                  <span className="text-[12.5px] font-semibold leading-relaxed" style={{ color: '#7A5A17' }}>{c.text}</span>
                </div>
              ))}
            </div>
          )}

          <button type="button" onClick={() => setMultiDay(v => !v)} className="flex items-center gap-1.5 text-[12px] font-bold text-kh-muted hover:text-kh-dark transition-colors self-start">
            <span className="msym text-[15px]">{multiDay ? 'check_box' : 'check_box_outline_blank'}</span>
            Mehrtägig
          </button>

          {/* Uhrzeit */}
          <button type="button" onClick={() => setAllDay(v => !v)} className="flex items-center gap-1.5 text-[12px] font-bold text-kh-muted hover:text-kh-dark transition-colors self-start">
            <span className="msym text-[15px]">{!allDay ? 'check_box' : 'check_box_outline_blank'}</span>
            Uhrzeit festlegen
          </button>
          {!allDay && (
            <div className="flex gap-2.5">
              <div className="flex-1">
                <label className="text-xs font-bold text-kh-muted uppercase tracking-wider block mb-1.5">Von</label>
                <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                  className="w-full border border-kh-border rounded-xl px-3 py-2.5 text-base md:text-sm font-medium text-kh-dark outline-none focus:border-kh-teal transition-colors" />
              </div>
              <div className="flex-1">
                <label className="text-xs font-bold text-kh-muted uppercase tracking-wider block mb-1.5">Bis (optional)</label>
                <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                  aria-invalid={timeInvalid}
                  className={`w-full border rounded-xl px-3 py-2.5 text-base md:text-sm font-medium text-kh-dark outline-none transition-colors ${
                    timeInvalid ? 'border-kh-red' : 'border-kh-border focus:border-kh-teal'
                  }`} />
              </div>
            </div>
          )}
          {timeInvalid && (
            <p className="text-[12px] font-semibold text-kh-red -mt-1">Die Endzeit muss nach der Startzeit liegen.</p>
          )}

          {/* Zielgruppe */}
          {!isStudent && (
          <div>
            <button type="button" onClick={() => setShowTargeting(v => !v)}
              className="flex items-center gap-1.5 text-[12px] font-bold text-kh-muted hover:text-kh-dark transition-colors">
              <span className="msym text-[15px]">{showTargeting ? 'expand_less' : 'expand_more'}</span>
              {selectedIds.size > 0 ? `${selectedIds.size} Schüler:in ausgewählt · Persönlicher Termin` : 'Für die ganze Klasse · Empfänger einschränken'}
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
            className="flex-1 py-3 rounded-full bg-gradient-to-br from-[#4C93C9] to-[#7EB8E5] text-white text-sm font-bold hover:brightness-105 transition-[filter,opacity] duration-150 tap disabled:opacity-40">
            {saving ? 'Speichern…' : isEdit ? 'Änderungen speichern' : isStudent ? 'Persönlich anlegen' : 'Termin anlegen'}
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
