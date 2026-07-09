'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { monthLabel, addDaysISO, getMondayOfWeek } from '@/lib/date'
import { eventCategoryMeta, EVENT_CATEGORIES, type EventCategory } from '@/lib/eventCategories'
import { deleteEvent } from '@/app/actions/events'
import AddEventModal from './AddEventModal'
import type { CalendarEvent, Role } from '@/lib/types'

const MONTHS = ['Jänner', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

interface Props {
  events: CalendarEvent[]
  role: Role
  today: string
  classId: string
  userId: string
}

type Filter = 'alle' | 'klasse' | 'persoenlich'
type CategoryFilter = EventCategory | 'alle'
type CalMode = 'monat' | 'woche'

function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate() }
function getFirstWeekday(y: number, m: number) { return (new Date(y, m, 1).getDay() + 6) % 7 }
function toISO(y: number, m: number, d: number) { return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` }

function dateBadge(dateISO: string) {
  const d = new Date(`${dateISO}T00:00:00`)
  return { month: d.toLocaleDateString('de-AT', { month: 'short' }).toUpperCase().replace('.', ''), day: d.getDate() }
}

function weekRangeLabel(mondayISO: string) {
  const start = new Date(`${mondayISO}T00:00:00`)
  const end = new Date(`${addDaysISO(6, start)}T00:00:00`)
  const startDay = start.getDate()
  const endDay = end.getDate()
  return start.getMonth() === end.getMonth()
    ? `${startDay}. – ${endDay}. ${MONTHS[end.getMonth()]}`
    : `${startDay}. ${MONTHS[start.getMonth()]} – ${endDay}. ${MONTHS[end.getMonth()]}`
}

function daysBetween(fromISO: string, toISO: string) {
  return Math.round((new Date(`${toISO}T00:00:00`).getTime() - new Date(`${fromISO}T00:00:00`).getTime()) / 86400000)
}

function relativeLabel(event: CalendarEvent, today: string) {
  if (event.start_date <= today && today <= event.end_date) return 'Heute'
  const diff = daysBetween(today, event.start_date)
  if (diff === 1) return 'Morgen'
  if (diff >= 2 && diff <= 6) return `in ${diff} Tagen`
  return new Date(`${event.start_date}T00:00:00`).toLocaleDateString('de-AT', { weekday: 'short', day: 'numeric', month: 'short' })
}

function EventRow({ event, canDelete, onDelete }: { event: CalendarEvent; canDelete: boolean; onDelete: (id: string) => void }) {
  const meta = eventCategoryMeta(event.category)
  const badge = dateBadge(event.start_date)
  const isPersonal = !!event.target_student_ids
  const multiDay = event.end_date !== event.start_date
  const dateLabel = multiDay
    ? `${new Date(`${event.start_date}T00:00:00`).toLocaleDateString('de-AT', { day: 'numeric', month: 'short' })} – ${new Date(`${event.end_date}T00:00:00`).toLocaleDateString('de-AT', { day: 'numeric', month: 'short' })}`
    : new Date(`${event.start_date}T00:00:00`).toLocaleDateString('de-AT', { weekday: 'short', day: 'numeric', month: 'short' })
  const timeLabel = !event.all_day && event.start_time
    ? `${event.start_time}${event.end_time ? ` – ${event.end_time}` : ''}`
    : null

  return (
    <div className="kh-card-flat p-4 flex gap-3.5 items-start group">
      <div className="w-12 h-12 rounded-2xl flex flex-col items-center justify-center text-white flex-shrink-0" style={{ background: `linear-gradient(135deg, ${meta.color}ee 0%, ${meta.color}99 100%)` }}>
        <span className="text-[10px] font-bold uppercase opacity-80">{badge.month}</span>
        <span className="text-[18px] font-extrabold leading-none">{badge.day}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          <span className="msym text-[13px]" style={{ color: meta.color }}>{meta.icon}</span>
          <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: meta.color }}>{meta.label}</span>
          {isPersonal && (
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[#8B5CF6] bg-[#8B5CF6]/10 px-1.5 py-0.5 rounded-full">
              <span className="msym text-[11px]">person</span>Persönlich
            </span>
          )}
        </div>
        <div className="font-bold text-[15px] text-kh-dark leading-tight">{event.title}</div>
        {event.description && <div className="text-[13px] text-kh-muted font-medium mt-0.5">{event.description}</div>}
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          <span className="flex items-center gap-1 text-[12px] font-semibold text-kh-muted">
            <span className="msym text-[13px]">event</span>{dateLabel}
          </span>
          {timeLabel && (
            <span className="flex items-center gap-1 text-[12px] font-semibold text-kh-muted">
              <span className="msym text-[13px]">schedule</span>{timeLabel}
            </span>
          )}
          {event.location && (
            <span className="flex items-center gap-1 text-[12px] font-semibold text-kh-muted">
              <span className="msym text-[13px]">location_on</span>{event.location}
            </span>
          )}
        </div>
      </div>
      {canDelete && (
        <button
          onClick={() => onDelete(event.id)}
          aria-label="Termin löschen"
          className="msym text-[18px] text-[#CBD5D3] hover:text-kh-red opacity-0 group-hover:opacity-100 max-md:opacity-100 transition-all duration-150 flex-shrink-0"
        >
          close
        </button>
      )}
    </div>
  )
}

function NextEventCard({ event, today }: { event: CalendarEvent; today: string }) {
  const meta = eventCategoryMeta(event.category)
  const badge = dateBadge(event.start_date)
  const isPersonal = !!event.target_student_ids
  const multiDay = event.end_date !== event.start_date
  const dateLabel = multiDay
    ? `${new Date(`${event.start_date}T00:00:00`).toLocaleDateString('de-AT', { day: 'numeric', month: 'short' })} – ${new Date(`${event.end_date}T00:00:00`).toLocaleDateString('de-AT', { day: 'numeric', month: 'short' })}`
    : new Date(`${event.start_date}T00:00:00`).toLocaleDateString('de-AT', { weekday: 'short', day: 'numeric', month: 'short' })
  const timeLabel = !event.all_day && event.start_time
    ? `${event.start_time}${event.end_time ? ` – ${event.end_time}` : ''}`
    : null

  return (
    <div
      className="rounded-2xl p-4 flex gap-3.5 items-start border"
      style={{ background: `${meta.color}12`, borderColor: `${meta.color}33` }}
    >
      <div className="w-12 h-12 rounded-2xl flex flex-col items-center justify-center text-white flex-shrink-0" style={{ background: `linear-gradient(135deg, ${meta.color}ee 0%, ${meta.color}99 100%)` }}>
        <span className="text-[10px] font-bold uppercase opacity-80">{badge.month}</span>
        <span className="text-[18px] font-extrabold leading-none">{badge.day}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          <span className="text-[11px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full text-white" style={{ background: meta.color }}>
            {relativeLabel(event, today)}
          </span>
          <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide" style={{ color: meta.color }}>
            <span className="msym text-[13px]">{meta.icon}</span>{meta.label}
          </span>
          {isPersonal && (
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[#8B5CF6] bg-[#8B5CF6]/10 px-1.5 py-0.5 rounded-full">
              <span className="msym text-[11px]">person</span>Persönlich
            </span>
          )}
        </div>
        <div className="font-extrabold text-[16px] leading-tight text-kh-dark truncate">{event.title}</div>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap text-[12px] font-semibold text-kh-muted">
          <span className="flex items-center gap-1"><span className="msym text-[13px]">event</span>{dateLabel}</span>
          {timeLabel && <span className="flex items-center gap-1"><span className="msym text-[13px]">schedule</span>{timeLabel}</span>}
          {event.location && <span className="flex items-center gap-1"><span className="msym text-[13px]">location_on</span>{event.location}</span>}
        </div>
      </div>
    </div>
  )
}

export default function TermineView({ events, role, today, classId, userId }: Props) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const now = new Date(`${today}T00:00:00`)
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [calMode, setCalMode] = useState<CalMode>('monat')
  const [weekMonday, setWeekMonday] = useState(getMondayOfWeek(now))
  const [showPast, setShowPast] = useState(false)
  const [filter, setFilter] = useState<Filter>('alle')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('alle')

  const canManage = role === 'teacher'
  const canCreateOwn = role === 'student'
  const personalCount = useMemo(() => events.filter(e => e.target_student_ids).length, [events])
  const presentCategories = useMemo(
    () => EVENT_CATEGORIES.filter(c => events.some(e => e.category === c.value)),
    [events]
  )

  function canDeleteEvent(e: CalendarEvent) {
    return canManage || (role === 'student' && e.created_by === userId)
  }

  async function handleDelete(id: string) {
    try {
      await deleteEvent(id)
      router.refresh()
    } catch {}
  }

  const filteredEvents = useMemo(() => {
    let list = events
    if (filter === 'klasse') list = list.filter(e => !e.target_student_ids)
    else if (filter === 'persoenlich') list = list.filter(e => e.target_student_ids)
    if (categoryFilter !== 'alle') list = list.filter(e => e.category === categoryFilter)
    return list
  }, [events, filter, categoryFilter])

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const e of filteredEvents) {
      let cur = e.start_date
      while (cur <= e.end_date) {
        if (!map.has(cur)) map.set(cur, [])
        map.get(cur)!.push(e)
        cur = addDaysISO(1, new Date(`${cur}T00:00:00`))
      }
    }
    return map
  }, [filteredEvents])

  const upcoming = useMemo(() => filteredEvents.filter(e => e.end_date >= today).sort((a, b) => a.start_date.localeCompare(b.start_date)), [filteredEvents, today])
  const past = useMemo(() => filteredEvents.filter(e => e.end_date < today).sort((a, b) => b.start_date.localeCompare(a.start_date)), [filteredEvents, today])
  const nextEvent = upcoming[0] ?? null
  const restUpcoming = nextEvent ? upcoming.slice(1) : upcoming

  const pastGroups = useMemo(() => {
    const groups: { label: string; items: CalendarEvent[] }[] = []
    for (const e of past) {
      const label = monthLabel(e.start_date)
      const last = groups[groups.length - 1]
      if (last && last.label === label) last.items.push(e)
      else groups.push({ label, items: [e] })
    }
    return groups
  }, [past])

  const selectedDayEvents = selectedDate ? (eventsByDay.get(selectedDate) ?? []) : null

  function prevMonth() { if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) } else setViewMonth(m => m - 1) }
  function nextMonth() { if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) } else setViewMonth(m => m + 1) }
  function prevWeek() { setWeekMonday(w => addDaysISO(-7, new Date(`${w}T00:00:00`))) }
  function nextWeek() { setWeekMonday(w => addDaysISO(7, new Date(`${w}T00:00:00`))) }

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstWeekday = getFirstWeekday(viewYear, viewMonth)
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDaysISO(i, new Date(`${weekMonday}T00:00:00`))),
    [weekMonday]
  )

  return (
    <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-4 items-start">
      {/* Mini-Kalender */}
      <div className="kh-card p-4 md:sticky md:top-4">
        <div className="flex gap-0.5 mb-3 p-0.5 rounded-lg bg-gradient-to-b from-kh-border to-white">
          <button
            onClick={() => setCalMode('monat')}
            className={`flex-1 py-1.5 rounded-md text-[12px] font-bold transition-all ${calMode === 'monat' ? 'bg-white text-kh-dark shadow-sm' : 'text-kh-muted hover:text-kh-dark'}`}
          >
            Monat
          </button>
          <button
            onClick={() => setCalMode('woche')}
            className={`flex-1 py-1.5 rounded-md text-[12px] font-bold transition-all ${calMode === 'woche' ? 'bg-white text-kh-dark shadow-sm' : 'text-kh-muted hover:text-kh-dark'}`}
          >
            Woche
          </button>
        </div>

        {calMode === 'monat' ? (
          <>
            <div className="flex items-center justify-between mb-3">
              <button onClick={prevMonth} className="w-8 h-8 rounded-lg flex items-center justify-center text-kh-muted hover:bg-kh-page hover:text-kh-dark transition-colors" aria-label="Vorheriger Monat">
                <span className="msym text-[20px]">chevron_left</span>
              </button>
              <span className="text-[13px] font-extrabold text-kh-dark">{MONTHS[viewMonth]} {viewYear}</span>
              <button onClick={nextMonth} className="w-8 h-8 rounded-lg flex items-center justify-center text-kh-muted hover:bg-kh-page hover:text-kh-dark transition-colors" aria-label="Nächster Monat">
                <span className="msym text-[20px]">chevron_right</span>
              </button>
            </div>
            <div className="grid grid-cols-7 mb-1">
              {WEEKDAYS.map(d => <div key={d} className="text-center text-[10.5px] font-bold text-kh-muted py-1">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-y-1">
              {Array.from({ length: firstWeekday }).map((_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const iso = toISO(viewYear, viewMonth, day)
                const dayEvents = eventsByDay.get(iso) ?? []
                const isToday = iso === today
                const isSelected = iso === selectedDate
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(isSelected ? null : iso)}
                    className={`h-9 w-full rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all ${
                      isSelected ? 'bg-gradient-to-br from-kh-dark to-kh-teal text-white' : isToday ? 'border border-kh-teal text-kh-teal font-bold' : 'hover:bg-kh-page text-kh-dark'
                    }`}
                  >
                    <span className="text-[12.5px] font-semibold leading-none">{day}</span>
                    {dayEvents.length > 0 && (
                      <span className="flex gap-0.5">
                        {dayEvents.slice(0, 3).map((e, idx) => (
                          <span key={idx} className="w-1 h-1 rounded-full" style={{ background: isSelected ? 'rgba(255,255,255,.8)' : eventCategoryMeta(e.category).color }} />
                        ))}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <button onClick={prevWeek} className="w-8 h-8 rounded-lg flex items-center justify-center text-kh-muted hover:bg-kh-page hover:text-kh-dark transition-colors" aria-label="Vorherige Woche">
                <span className="msym text-[20px]">chevron_left</span>
              </button>
              <span className="text-[13px] font-extrabold text-kh-dark">{weekRangeLabel(weekMonday)}</span>
              <button onClick={nextWeek} className="w-8 h-8 rounded-lg flex items-center justify-center text-kh-muted hover:bg-kh-page hover:text-kh-dark transition-colors" aria-label="Nächste Woche">
                <span className="msym text-[20px]">chevron_right</span>
              </button>
            </div>
            <div className="flex flex-col gap-1">
              {weekDays.map((iso, i) => {
                const dayEvents = eventsByDay.get(iso) ?? []
                const isToday = iso === today
                const isSelected = iso === selectedDate
                const d = new Date(`${iso}T00:00:00`)
                return (
                  <button
                    key={iso}
                    onClick={() => setSelectedDate(isSelected ? null : iso)}
                    className={`w-full text-left rounded-lg px-2 py-1.5 flex items-center gap-2.5 transition-all ${
                      isSelected ? 'bg-gradient-to-br from-kh-dark to-kh-teal text-white' : isToday ? 'border border-kh-teal' : 'hover:bg-kh-page'
                    }`}
                  >
                    <div className="flex flex-col items-center w-8 flex-shrink-0">
                      <span className={`text-[9px] font-bold uppercase ${isSelected ? 'opacity-80' : 'text-kh-muted'}`}>{WEEKDAYS[i]}</span>
                      <span className={`text-[14px] font-extrabold leading-none ${isSelected ? '' : isToday ? 'text-kh-teal' : 'text-kh-dark'}`}>{d.getDate()}</span>
                    </div>
                    <div className="flex-1 min-w-0 flex flex-wrap gap-1">
                      {dayEvents.slice(0, 2).map(e => (
                        <span
                          key={e.id}
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full truncate max-w-[110px]"
                          style={{
                            background: isSelected ? 'rgba(255,255,255,.25)' : `${eventCategoryMeta(e.category).color}1a`,
                            color: isSelected ? '#fff' : eventCategoryMeta(e.category).color,
                          }}
                        >
                          {e.title}
                        </span>
                      ))}
                      {dayEvents.length > 2 && (
                        <span className={`text-[10px] font-bold self-center ${isSelected ? 'opacity-80' : 'text-kh-muted'}`}>+{dayEvents.length - 2}</span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </>
        )}

        {(canManage || canCreateOwn) && (
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 w-full h-10 rounded-xl bg-gradient-to-br from-[#4C93C9] to-[#7EB8E5] text-white flex items-center justify-center gap-1.5 text-[13px] font-bold hover:brightness-105 transition-all"
          >
            <span className="text-[16px] leading-none">+</span>{canManage ? 'Neuer Termin' : 'Persönlicher Termin'}
          </button>
        )}
      </div>

      {/* Liste */}
      <div className="flex flex-col gap-4">
        {personalCount > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {([
              { key: 'alle', label: 'Alle' },
              { key: 'klasse', label: 'Klasse' },
              { key: 'persoenlich', label: 'Persönlich' },
            ] as const).map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3.5 py-1.5 rounded-full text-[12.5px] font-bold transition-all ${
                  filter === f.key ? 'bg-kh-dark text-white' : 'bg-kh-page text-kh-muted hover:text-kh-dark'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
        {presentCategories.length > 1 && (
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setCategoryFilter('alle')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[12.5px] font-bold transition-all border ${
                categoryFilter === 'alle' ? 'bg-gradient-to-br from-kh-dark to-kh-teal text-white border-transparent' : 'border-kh-border text-kh-muted hover:text-kh-dark hover:border-kh-teal/50'
              }`}
            >
              Alle Kategorien
            </button>
            {presentCategories.map(c => (
              <button
                key={c.value}
                onClick={() => setCategoryFilter(c.value)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[12.5px] font-bold border transition-all ${
                  categoryFilter === c.value ? 'text-white border-transparent' : 'border-kh-border text-kh-dark hover:border-kh-teal/50'
                }`}
                style={categoryFilter === c.value ? { background: c.color } : undefined}
              >
                <span className="msym text-[13px]">{c.icon}</span>
                {c.label}
              </button>
            ))}
          </div>
        )}
        {selectedDate ? (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-extrabold text-kh-dark">
                {new Date(`${selectedDate}T00:00:00`).toLocaleDateString('de-AT', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h2>
              <button onClick={() => setSelectedDate(null)} className="text-[12px] font-bold text-kh-teal hover:underline">Alle Termine</button>
            </div>
            {selectedDayEvents && selectedDayEvents.length > 0 ? (
              selectedDayEvents.map(e => <EventRow key={e.id} event={e} canDelete={canDeleteEvent(e)} onDelete={handleDelete} />)
            ) : (
              <p className="text-sm text-kh-muted font-medium">Keine Termine an diesem Tag.</p>
            )}
          </>
        ) : (
          <>
            <div>
              <h2 className="text-[12px] font-bold text-kh-muted uppercase tracking-wide mb-2.5">Bevorstehend</h2>
              {upcoming.length === 0 ? (
                <div className="kh-card-flat p-8 text-center">
                  <span className="msym text-4xl block mb-2 text-kh-teal-light">calendar_month</span>
                  <p className="text-sm text-kh-muted font-medium">
                    {canManage ? 'Noch keine Termine angelegt.' : 'Noch keine bevorstehenden Termine.'}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {nextEvent && <NextEventCard event={nextEvent} today={today} />}
                  {restUpcoming.map(e => <EventRow key={e.id} event={e} canDelete={canDeleteEvent(e)} onDelete={handleDelete} />)}
                </div>
              )}
            </div>

            {pastGroups.length > 0 && (
              <div>
                <button onClick={() => setShowPast(v => !v)} className="flex items-center gap-1.5 text-[12px] font-bold text-kh-muted hover:text-kh-dark transition-colors mb-2.5">
                  <span className="msym text-[16px]">{showPast ? 'expand_less' : 'expand_more'}</span>
                  Vergangene Termine ({past.length})
                </button>
                {showPast && (
                  <div className="flex flex-col gap-4">
                    {pastGroups.map(g => (
                      <div key={g.label}>
                        <div className="text-[11px] font-bold text-kh-muted uppercase tracking-wide mb-2 opacity-70">{g.label}</div>
                        <div className="flex flex-col gap-2.5 opacity-70">
                          {g.items.map(e => <EventRow key={e.id} event={e} canDelete={canDeleteEvent(e)} onDelete={handleDelete} />)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {showModal && (
        <AddEventModal today={today} classId={classId} mode={canManage ? 'teacher' : 'student'} onClose={() => setShowModal(false)} />
      )}
    </div>
  )
}
