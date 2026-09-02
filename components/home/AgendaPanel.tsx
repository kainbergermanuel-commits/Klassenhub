'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { daysUntil, daysUntilLabel, todayISO } from '@/lib/date'
import { eventCategoryMeta } from '@/lib/eventCategories'
import type { Reminder, Role, AgendaEvent } from '@/lib/types'
import type { SubjectOption } from '@/lib/subjectsCatalog'
import AddReminderModal from '@/components/erinnerungen/AddReminderModal'
import AddEventModal from '@/app/(app)/termine/AddEventModal'

interface Props {
  reminders: Reminder[]
  events?: AgendaEvent[]
  /** Gesamtzahl bevorstehender Termine. `events` ist bewusst auf sechs
   *  begrenzt, das Zahlenabzeichen darf das nicht sein. */
  eventCount?: number
  /** Fächer-Katalog, damit sich von hier aus auch eine Schularbeit anlegen
   *  lässt. Fehlt er, blendet das Modal die Kategorie aus. */
  subjects?: SubjectOption[]
  role: Role
  userId?: string
  classId?: string
  myViewedIds?: string[]
}

type Tab = 'erinnerungen' | 'termine'

const TICK_COLORS = ['#0F8A82', '#C98A2B', '#5965B8', '#E06B57']

function tickColor(label: string) {
  let h = 0
  for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) >>> 0
  return TICK_COLORS[h % TICK_COLORS.length]
}

function badgeStyle(days: number) {
  if (days <= 1) return { color: '#C98A2B', bg: '#F8ECD6' }
  if (days <= 7) return { color: '#0F8A82', bg: '#E0F0EE' }
  return { color: '#6E7E80', bg: '#ECE6D9' }
}

export default function AgendaPanel({ reminders, events = [], eventCount, subjects = [], role, userId, classId, myViewedIds = [] }: Props) {
  const [tab, setTab] = useState<Tab>('erinnerungen')
  const [showAddReminder, setShowAddReminder] = useState(false)
  const [showAddEvent, setShowAddEvent] = useState(false)
  const router = useRouter()
  const [viewedSet, setViewedSet] = useState(new Set(myViewedIds))

  async function markSeen(reminderId: string) {
    if (!userId || viewedSet.has(reminderId)) return
    setViewedSet(prev => new Set([...prev, reminderId]))
    const supabase = createClient()
    await supabase.from('reminder_views').upsert({ reminder_id: reminderId, student_id: userId })
    router.refresh()
  }

  // Erinnerungen nach Datum gruppieren
  const reminderGroups: { date: string; items: Reminder[] }[] = []
  for (const r of reminders) {
    const last = reminderGroups[reminderGroups.length - 1]
    if (last && last.date === r.event_date) last.items.push(r)
    else reminderGroups.push({ date: r.event_date, items: [r] })
  }

  // Termine nach Startdatum gruppieren
  const eventGroups: { date: string; items: AgendaEvent[] }[] = []
  for (const e of events) {
    const last = eventGroups[eventGroups.length - 1]
    if (last && last.date === e.start_date) last.items.push(e)
    else eventGroups.push({ date: e.start_date, items: [e] })
  }

  const canAdd = tab === 'erinnerungen'
    ? role === 'teacher'
    : role === 'teacher' || role === 'student'
  const addLink = tab === 'erinnerungen' ? '/erinnerungen' : '/termine'

  function TabButton({ value, label, count }: { value: Tab; label: string; count: number }) {
    const active = tab === value
    return (
      <button
        onClick={() => setTab(value)}
        className={`flex-1 py-1.5 rounded-md text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
          active ? 'bg-white/70 text-kh-dark shadow-sm' : 'text-kh-muted hover:text-kh-dark'
        }`}
      >
        {label}
        {count > 0 && (
          <span className={`text-[10px] font-bold px-1.5 rounded-full ${active ? 'bg-kh-dark/10 text-kh-dark' : 'bg-kh-muted/15 text-kh-muted'}`}>{count}</span>
        )}
      </button>
    )
  }

  return (
    <>
    <div className="bg-white rounded-[20px] p-5 shadow-sm border border-kh-border/50 max-md:rounded-2xl max-md:border-0 max-md:bg-gradient-to-br max-md:from-white max-md:via-white max-md:to-kh-page max-md:shadow-[0_8px_16px_rgba(20,40,45,.10)]">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 flex gap-0.5 p-0.5 rounded-lg bg-gradient-to-b from-[#ECE7DD] to-white">
          <TabButton value="erinnerungen" label="Erinnerungen" count={reminders.length} />
          <TabButton value="termine" label="Termine" count={eventCount ?? events.length} />
        </div>
        {canAdd ? (
          <button
            onClick={() => (tab === 'erinnerungen' ? setShowAddReminder(true) : setShowAddEvent(true))}
            className="w-8 h-8 rounded-full gradient-teal text-white flex items-center justify-center hover:brightness-105 transition-[filter,opacity] duration-150 tap flex-shrink-0"
            aria-label={tab === 'erinnerungen' ? 'Neue Erinnerung' : 'Neuer Termin'}
          >
            <span className="msym text-[19px]">add</span>
          </button>
        ) : (
          <Link
            href={addLink}
            className="w-8 h-8 rounded-full gradient-teal text-white flex items-center justify-center hover:brightness-105 transition-[filter,opacity] duration-150 tap flex-shrink-0"
            aria-label={tab === 'erinnerungen' ? 'Zu Erinnerungen' : 'Zu Terminen'}
          >
            <span className="msym text-[19px]">arrow_forward</span>
          </Link>
        )}
      </div>

      {tab === 'erinnerungen' ? (
        reminderGroups.length === 0 ? (
          <div className="text-center py-10 text-kh-muted">
            <span className="msym text-4xl block mb-2 text-kh-teal-light">push_pin</span>
            <p className="text-sm font-medium">Keine bevorstehenden Erinnerungen.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {reminderGroups.map(g => (
              <div key={g.date}>
                <div className="flex items-center gap-1.5 mb-2.5">
                  <span className="msym text-[14px] text-kh-amber" style={{ fontVariationSettings: "'FILL' 0" }}>warning</span>
                  <span className="text-[12.5px] font-bold text-kh-muted">
                    {new Date(g.date).toLocaleDateString('de-AT', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </span>
                </div>
                <div className="flex flex-col gap-2.5">
                  {g.items.map(r => {
                    const days = daysUntil(r.event_date)
                    const badge = badgeStyle(days)
                    const seen = viewedSet.has(r.id)
                    return (
                      <div key={r.id} className="flex gap-3 items-start">
                        <span className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: tickColor(r.title) }} />
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-[14px] text-kh-dark leading-snug">{r.title}</div>
                          {r.description && (
                            <div className="text-[12px] text-kh-muted font-medium mt-0.5 line-clamp-2">{r.description}</div>
                          )}
                          {role === 'student' && (
                            <button
                              onClick={() => markSeen(r.id)}
                              disabled={seen}
                              className={`mt-1.5 flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full transition-all duration-200 ${
                                seen
                                  ? 'bg-kh-teal/10 text-kh-teal cursor-default'
                                  : 'bg-[#ECE6D9] text-kh-muted hover:bg-kh-teal/10 hover:text-kh-teal'
                              }`}
                            >
                              <span className="msym text-[13px]" style={{ fontVariationSettings: seen ? "'FILL' 1" : "'FILL' 0" }}>
                                {seen ? 'check_circle' : 'visibility'}
                              </span>
                              {seen ? 'Gesehen' : 'Als gesehen markieren'}
                            </button>
                          )}
                        </div>
                        <span
                          className="text-[10.5px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5"
                          style={{ color: badge.color, background: badge.bg }}
                        >
                          {daysUntilLabel(r.event_date)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        eventGroups.length === 0 ? (
          <div className="text-center py-10 text-kh-muted">
            <span className="msym text-4xl block mb-2 text-kh-teal-light">calendar_month</span>
            <p className="text-sm font-medium">Keine bevorstehenden Termine.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {eventGroups.map(g => (
              <div key={g.date}>
                <div className="flex items-center gap-1.5 mb-2.5">
                  <span className="msym text-[14px] text-kh-muted" style={{ fontVariationSettings: "'FILL' 0" }}>event</span>
                  <span className="text-[12.5px] font-bold text-kh-muted">
                    {new Date(`${g.date}T00:00:00`).toLocaleDateString('de-AT', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </span>
                </div>
                <div className="flex flex-col gap-2.5">
                  {g.items.map(e => {
                    const meta = eventCategoryMeta(e.category)
                    const isPersonal = !!e.target_student_ids
                    const timeLabel = !e.all_day && e.start_time ? e.start_time : null
                    return (
                      <div key={e.id} className="flex gap-3 items-start">
                        <span className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: meta.color }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="msym text-[13px] flex-shrink-0" style={{ color: meta.color }}>{meta.icon}</span>
                            <span className="font-bold text-[14px] text-kh-dark leading-snug truncate min-w-0">{e.title}</span>
                            {isPersonal && (
                              <span className="flex items-center gap-0.5 text-[9.5px] font-bold uppercase tracking-wide text-[#8B5CF6] bg-[#8B5CF6]/10 px-1.5 py-0.5 rounded-full flex-shrink-0">
                                <span className="msym text-[11px]">person</span>Persönlich
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[11.5px] font-semibold text-kh-muted">
                            <span style={{ color: meta.color }}>{meta.label}</span>
                            {timeLabel && <span className="flex items-center gap-0.5"><span className="msym text-[12px]">schedule</span>{timeLabel}</span>}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )
      )}

    </div>

    {showAddReminder && classId && userId && (
      <AddReminderModal classId={classId} userId={userId} onClose={() => setShowAddReminder(false)} />
    )}
    {showAddEvent && classId && (
      <AddEventModal
        today={todayISO()}
        classId={classId}
        mode={role === 'student' ? 'student' : 'teacher'}
        subjects={subjects}
        onClose={() => setShowAddEvent(false)}
      />
    )}
    </>
  )
}
