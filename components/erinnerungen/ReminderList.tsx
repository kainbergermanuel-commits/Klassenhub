'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { daysUntil } from '@/lib/date'
import AddReminderModal from './AddReminderModal'
import PageHeader from '@/components/layout/PageHeader'
import type { Reminder, Role, SpecialRole } from '@/lib/types'

interface Props {
  reminders: Reminder[]
  role: Role
  specialRole?: SpecialRole | null
  userId: string
  classId: string
  viewersByReminder?: Record<string, string[]>
  allStudentNames?: string[]
  myViewedIds?: string[]
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('de-AT', { weekday: 'short', day: 'numeric', month: 'long' })
}

function urgencyLabel(days: number) {
  if (days < 0) return null
  if (days === 0) return { text: 'Heute', color: '#C98A2B', bg: '#F8ECD6' }
  if (days === 1) return { text: 'Morgen', color: '#C98A2B', bg: '#F8ECD6' }
  if (days <= 7) return { text: `in ${days} Tagen`, color: '#0F8A82', bg: '#E0F0EE' }
  return { text: `in ${days} Tagen`, color: '#6E7E80', bg: '#ECE6D9' }
}

export default function ReminderList({ reminders, role, specialRole, userId, classId, viewersByReminder = {}, allStudentNames = [], myViewedIds = [] }: Props) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [viewedSet, setViewedSet] = useState(new Set(myViewedIds))

  const canCreate = role === 'teacher' || specialRole === 'klassensprecher' || specialRole === 'stv_klassensprecher'
  const isPendingCreator = role !== 'teacher'

  const today = new Date(); today.setHours(0,0,0,0)
  const pending = reminders.filter(r => r.status === 'pending')
  const published = reminders.filter(r => r.status === 'published')
  const upcoming = published.filter(r => new Date(r.event_date) >= today)
  const past = published.filter(r => new Date(r.event_date) < today)

  async function deleteReminder(id: string) {
    const supabase = createClient()
    await supabase.from('reminders').delete().eq('id', id)
    router.refresh()
  }

  async function confirmReminder(id: string) {
    const supabase = createClient()
    await supabase.from('reminders').update({ status: 'published' }).eq('id', id)
    router.refresh()
  }

  async function markSeen(reminderId: string) {
    if (viewedSet.has(reminderId)) return
    setViewedSet(prev => new Set([...prev, reminderId]))
    const supabase = createClient()
    await supabase.from('reminder_views').upsert({ reminder_id: reminderId, student_id: userId })
    router.refresh()
  }

  return (
    <>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2.5">
        <PageHeader icon="push_pin" title="Erinnerungen" subtitle={`${upcoming.length} bevorstehend`} gradient="from-[#2F86C5] to-[#56AEE6]" />
        {canCreate && (
          <button
            onClick={() => setShowModal(true)}
            className="max-md:hidden flex items-center gap-2 gradient-teal text-white px-[17px] py-[11px] rounded-full font-bold text-sm hover:opacity-90 transition-opacity"
          >
            <span className="msym text-[19px]">add</span>
            Neue Erinnerung
          </button>
        )}
      </div>

      {/* Schwebender „Neue Erinnerung"-Button unter dem Burger (nur Mobile) */}
      {canCreate && (
        <button
          onClick={() => setShowModal(true)}
          className="md:hidden fixed top-[68px] right-4 z-30 w-11 h-11 flex items-center justify-center rounded-2xl gradient-teal text-white shadow-[0_2px_10px_rgba(20,40,45,.18)] active:scale-95 transition-transform"
          aria-label="Neue Erinnerung"
        >
          <span className="relative flex items-center justify-center">
            <span className="msym text-[22px]">push_pin</span>
            <span className="msym text-[13px] absolute -right-1.5 -bottom-1.5 bg-white text-kh-teal rounded-full" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
          </span>
        </button>
      )}

      {upcoming.length === 0 && past.length === 0 && pending.length === 0 ? (
        <div className="text-center py-16 text-kh-muted">
          <span className="msym text-5xl block mb-3 text-kh-teal-light">push_pin</span>
          <p className="font-medium">Noch keine Erinnerungen.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Pending — nur für Lehrer sichtbar */}
          {role === 'teacher' && pending.length > 0 && (
            <div>
              <div className="text-xs font-bold text-kh-amber uppercase tracking-[.6px] mb-3 flex items-center gap-1.5">
                <span className="msym text-[14px]" style={{ fontVariationSettings: "'FILL' 0" }}>pending</span>
                Ausstehend · Bestätigung erforderlich ({pending.length})
              </div>
              <div className="flex flex-col gap-3">
                {pending.map(r => (
                  <ReminderCard
                    key={r.id}
                    reminder={r}
                    role={role}
                    userId={userId}
                    onDelete={deleteReminder}
                    onConfirm={confirmReminder}
                    onMarkSeen={markSeen}
                    viewedByMe={false}
                    viewers={[]}
                    allStudentNames={allStudentNames}
                  />
                ))}
              </div>
            </div>
          )}
          {upcoming.length > 0 && (
            <div>
              <div className="text-xs font-bold text-[#9AA6A4] uppercase tracking-[.6px] mb-3">Bevorstehend</div>
              <div className="flex flex-col gap-3">
                {upcoming.map(r => (
                  <ReminderCard
                    key={r.id}
                    reminder={r}
                    role={role}
                    userId={userId}
                    onDelete={deleteReminder}
                    onConfirm={confirmReminder}
                    onMarkSeen={markSeen}
                    viewedByMe={viewedSet.has(r.id)}
                    viewers={viewersByReminder[r.id] ?? []}
                    allStudentNames={allStudentNames}
                  />
                ))}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <div className="text-xs font-bold text-[#9AA6A4] uppercase tracking-[.6px] mb-3">Vergangen</div>
              <div className="flex flex-col gap-3 opacity-50">
                {past.slice(0, 5).map(r => (
                  <ReminderCard
                    key={r.id}
                    reminder={r}
                    role={role}
                    userId={userId}
                    onDelete={deleteReminder}
                    onConfirm={confirmReminder}
                    onMarkSeen={markSeen}
                    viewedByMe={viewedSet.has(r.id)}
                    viewers={viewersByReminder[r.id] ?? []}
                    allStudentNames={allStudentNames}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <AddReminderModal classId={classId} userId={userId} isPending={isPendingCreator} onClose={() => setShowModal(false)} />
      )}
    </>
  )
}

function ReminderCard({
  reminder: r, role, userId, onDelete, onConfirm, onMarkSeen, viewedByMe, viewers, allStudentNames,
}: {
  reminder: Reminder
  role: Role
  userId: string
  onDelete: (id: string) => void
  onConfirm: (id: string) => void
  onMarkSeen: (id: string) => void
  viewedByMe: boolean
  viewers: string[]
  allStudentNames: string[]
}) {
  const days = daysUntil(r.event_date)
  const urgency = urgencyLabel(days)
  const isPending = r.status === 'pending'
  const canDelete = role === 'teacher' || r.created_by === userId
  const isPast = days < 0

  return (
    <div className={`rounded-2xl p-5 flex gap-4 items-start group ${isPending ? 'shadow-sm bg-[#FFFBF2] border border-kh-amber/30' : 'kh-card-flat'}`}>
      <div className="w-12 h-12 rounded-[14px] gradient-teal flex flex-col items-center justify-center text-white flex-shrink-0">
        <span className="text-[10px] font-bold uppercase opacity-80">
          {new Date(r.event_date).toLocaleDateString('de-AT', { month: 'short' })}
        </span>
        <span className="text-[18px] font-extrabold leading-none">
          {new Date(r.event_date).getDate()}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="font-extrabold text-[16px] text-kh-dark">{r.title}</div>
            {isPending && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#F8ECD6] text-kh-amber">Ausstehend</span>
            )}
          </div>
          {canDelete && (
            <button
              onClick={() => onDelete(r.id)}
              className="msym text-[18px] text-[#CBD5D3] hover:text-kh-red opacity-0 group-hover:opacity-100 transition-all duration-150 flex-shrink-0"
            >
              delete
            </button>
          )}
        </div>
        {r.description && <p className="text-sm text-kh-muted font-medium mt-0.5">{r.description}</p>}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className="text-[12.5px] font-semibold text-[#6E7E80]">
            {formatDate(r.event_date)}
          </span>
          {urgency && (
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ color: urgency.color, background: urgency.bg }}>
              {urgency.text}
            </span>
          )}
        </div>

        {/* Teacher: Bestätigen-Button für pending */}
        {role === 'teacher' && isPending && (
          <button
            onClick={() => onConfirm(r.id)}
            className="mt-3 flex items-center gap-1.5 bg-kh-teal text-white text-[12.5px] font-bold px-3.5 py-2 rounded-full hover:opacity-90 transition-opacity"
          >
            <span className="msym text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            Bestätigen & veröffentlichen
          </button>
        )}

        {/* Teacher: viewer info */}
        {role === 'teacher' && !isPending && allStudentNames.length > 0 && (
          <div className="mt-3 flex flex-col gap-1.5">
            {viewers.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="msym text-[14px] text-kh-teal" style={{ fontVariationSettings: "'FILL' 1" }}>visibility</span>
                <span className="text-[12px] font-semibold text-kh-teal">
                  Gesehen ({viewers.length}/{allStudentNames.length}):
                </span>
                <span className="text-[11.5px] text-kh-muted">
                  {viewers.join(', ')}
                </span>
              </div>
            )}
            {(() => {
              const notSeen = allStudentNames.filter(n => !viewers.includes(n))
              return notSeen.length > 0 ? (
                <div className="flex items-center gap-2">
                  <span className="msym text-[14px] text-kh-amber">schedule</span>
                  <span className="text-[12px] font-semibold text-kh-amber">
                    Noch nicht gesehen ({notSeen.length}):
                  </span>
                  <span className="text-[11.5px] text-kh-muted">
                    {notSeen.join(', ')}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="msym text-[14px] text-kh-teal" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  <span className="text-[12px] font-semibold text-kh-teal">Alle haben gesehen</span>
                </div>
              )
            })()}
          </div>
        )}

        {/* Student: mark as seen button */}
        {role === 'student' && !isPast && (
          <button
            onClick={() => onMarkSeen(r.id)}
            className={`mt-3 flex items-center gap-1.5 text-[12.5px] font-bold px-3 py-1.5 rounded-full transition-all duration-200 ${
              viewedByMe
                ? 'bg-kh-teal-light text-kh-teal cursor-default'
                : 'bg-[#ECE6D9] text-kh-muted hover:bg-kh-teal-light hover:text-kh-teal'
            }`}
          >
            <span className="msym text-[15px]" style={{ fontVariationSettings: viewedByMe ? "'FILL' 1" : "'FILL' 0" }}>
              {viewedByMe ? 'check_circle' : 'visibility'}
            </span>
            {viewedByMe ? 'Gesehen' : 'Als gesehen markieren'}
          </button>
        )}
      </div>
    </div>
  )
}
