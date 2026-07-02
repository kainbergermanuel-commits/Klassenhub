'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { daysUntil, daysUntilLabel } from '@/lib/date'
import type { Reminder, Role } from '@/lib/types'
import AddReminderModal from '@/components/erinnerungen/AddReminderModal'

interface Props {
  reminders: Reminder[]
  role: Role
  userId?: string
  classId?: string
  myViewedIds?: string[]
}

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

export default function AgendaPanel({ reminders, role, userId, classId, myViewedIds = [] }: Props) {
  const [showAddModal, setShowAddModal] = useState(false)
  const router = useRouter()
  const [viewedSet, setViewedSet] = useState(new Set(myViewedIds))

  async function markSeen(reminderId: string) {
    if (!userId || viewedSet.has(reminderId)) return
    setViewedSet(prev => new Set([...prev, reminderId]))
    const supabase = createClient()
    await supabase.from('reminder_views').upsert({ reminder_id: reminderId, student_id: userId })
    router.refresh()
  }

  // group by date
  const groups: { date: string; items: Reminder[] }[] = []
  for (const r of reminders) {
    const last = groups[groups.length - 1]
    if (last && last.date === r.event_date) last.items.push(r)
    else groups.push({ date: r.event_date, items: [r] })
  }

  return (
    <>
    <div className="bg-white rounded-[20px] p-5 shadow-sm border border-kh-border/50 max-md:rounded-2xl max-md:border-transparent max-md:bg-gradient-to-br max-md:from-white max-md:via-white max-md:to-kh-page max-md:shadow-[0_8px_16px_rgba(20,40,45,.10)]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-extrabold text-[17px] text-kh-dark flex items-center gap-1.5">
          <span className="msym text-[22px] text-kh-muted" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>push_pin</span>
          Erinnerungen
        </h2>
        {role === 'teacher' ? (
          <button
            onClick={() => setShowAddModal(true)}
            className="w-8 h-8 rounded-full gradient-teal text-white flex items-center justify-center hover:opacity-90 transition-opacity"
            aria-label="Neue Erinnerung"
          >
            <span className="msym text-[19px]">add</span>
          </button>
        ) : (
          <Link
            href="/erinnerungen"
            className="w-8 h-8 rounded-full gradient-teal text-white flex items-center justify-center hover:opacity-90 transition-opacity"
            aria-label="Zu Erinnerungen"
          >
            <span className="msym text-[19px]">arrow_forward</span>
          </Link>
        )}
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-10 text-kh-muted">
          <span className="msym text-4xl block mb-2 text-kh-teal-light">push_pin</span>
          <p className="text-sm font-medium">Keine bevorstehenden Erinnerungen.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map(g => (
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
      )}

    </div>

    {showAddModal && classId && userId && (
      <AddReminderModal classId={classId} userId={userId} onClose={() => setShowAddModal(false)} />
    )}
    </>
  )
}
