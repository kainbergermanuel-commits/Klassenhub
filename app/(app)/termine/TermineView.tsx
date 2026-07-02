'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { monthLabel, addDaysISO } from '@/lib/date'
import { eventCategoryMeta } from '@/lib/eventCategories'
import { deleteEvent } from '@/app/actions/events'
import AddEventModal from './AddEventModal'
import type { Event, Role } from '@/lib/types'

const MONTHS = ['Jänner', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

interface Props {
  events: Event[]
  role: Role
  today: string
}

function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate() }
function getFirstWeekday(y: number, m: number) { return (new Date(y, m, 1).getDay() + 6) % 7 }
function toISO(y: number, m: number, d: number) { return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` }

function dateBadge(dateISO: string) {
  const d = new Date(`${dateISO}T00:00:00`)
  return { month: d.toLocaleDateString('de-AT', { month: 'short' }).toUpperCase().replace('.', ''), day: d.getDate() }
}

function EventRow({ event, canDelete, onDelete }: { event: Event; canDelete: boolean; onDelete: (id: string) => void }) {
  const meta = eventCategoryMeta(event.category)
  const badge = dateBadge(event.start_date)
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
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="msym text-[13px]" style={{ color: meta.color }}>{meta.icon}</span>
          <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: meta.color }}>{meta.label}</span>
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

export default function TermineView({ events, role, today }: Props) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const now = new Date(`${today}T00:00:00`)
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [showPast, setShowPast] = useState(false)

  const canManage = role === 'teacher'

  async function handleDelete(id: string) {
    try {
      await deleteEvent(id)
      router.refresh()
    } catch {}
  }

  const eventsByDay = useMemo(() => {
    const map = new Map<string, Event[]>()
    for (const e of events) {
      let cur = e.start_date
      while (cur <= e.end_date) {
        if (!map.has(cur)) map.set(cur, [])
        map.get(cur)!.push(e)
        cur = addDaysISO(1, new Date(`${cur}T00:00:00`))
      }
    }
    return map
  }, [events])

  const upcoming = useMemo(() => events.filter(e => e.end_date >= today).sort((a, b) => a.start_date.localeCompare(b.start_date)), [events, today])
  const past = useMemo(() => events.filter(e => e.end_date < today).sort((a, b) => b.start_date.localeCompare(a.start_date)), [events, today])

  const pastGroups = useMemo(() => {
    const groups: { label: string; items: Event[] }[] = []
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

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstWeekday = getFirstWeekday(viewYear, viewMonth)

  return (
    <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-4 items-start">
      {/* Mini-Kalender */}
      <div className="kh-card p-4 md:sticky md:top-4">
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
                  isSelected ? 'bg-kh-dark text-white' : isToday ? 'border border-kh-teal text-kh-teal font-bold' : 'hover:bg-kh-page text-kh-dark'
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

        {canManage && (
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 w-full h-10 rounded-xl bg-gradient-to-br from-kh-red to-[#F2907E] text-white flex items-center justify-center gap-1.5 text-[13px] font-bold hover:brightness-105 transition-all"
          >
            <span className="text-[16px] leading-none">+</span>Neuer Termin
          </button>
        )}
      </div>

      {/* Liste */}
      <div className="flex flex-col gap-4">
        {selectedDate ? (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-extrabold text-kh-dark">
                {new Date(`${selectedDate}T00:00:00`).toLocaleDateString('de-AT', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h2>
              <button onClick={() => setSelectedDate(null)} className="text-[12px] font-bold text-kh-teal hover:underline">Alle Termine</button>
            </div>
            {selectedDayEvents && selectedDayEvents.length > 0 ? (
              selectedDayEvents.map(e => <EventRow key={e.id} event={e} canDelete={canManage} onDelete={handleDelete} />)
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
                  {upcoming.map(e => <EventRow key={e.id} event={e} canDelete={canManage} onDelete={handleDelete} />)}
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
                          {g.items.map(e => <EventRow key={e.id} event={e} canDelete={canManage} onDelete={handleDelete} />)}
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
        <AddEventModal today={today} onClose={() => setShowModal(false)} />
      )}
    </div>
  )
}
