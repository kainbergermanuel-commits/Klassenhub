'use client'

import { useState } from 'react'
import HomeworkCard from './HomeworkCard'
import AddHomeworkModal from './AddHomeworkModal'
import type { HomeworkWithStatus, Role } from '@/lib/types'

interface Props {
  homework: HomeworkWithStatus[]
  role: Role
  userId: string
  classId: string
  subtitle: string
  stats?: { open: number; done: number; missed: number }
}

function todayLocalISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function monthLabel(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('de-AT', { month: 'long', year: 'numeric' })
}

export default function HomeworkList({ homework, role, userId, classId, subtitle, stats }: Props) {
  const [showModal, setShowModal] = useState(false)

  const today = todayLocalISO()
  const open = homework
    .filter(h => h.due_date > today)
    .sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1
      return a.due_date.localeCompare(b.due_date)
    })
  const past = homework.filter(h => h.due_date <= today).sort((a, b) => b.due_date.localeCompare(a.due_date))

  // Group past by month (most recent first)
  const pastGroups: { label: string; items: HomeworkWithStatus[] }[] = []
  for (const hw of past) {
    const label = monthLabel(hw.due_date)
    const last = pastGroups[pastGroups.length - 1]
    if (last && last.label === label) {
      last.items.push(hw)
    } else {
      pastGroups.push({ label, items: [hw] })
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2.5">
        <div>
          <h1 className="text-[25px] font-extrabold text-kh-dark tracking-tight">Hausübungen</h1>
          {stats ? (
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="flex items-center gap-1.5 bg-[#FFF8ED] text-[#C98A2B] px-3 py-1 rounded-full text-[12px] font-bold">
                <span className="msym text-[14px]" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400" }}>pending</span>
                {stats.open} offen
              </span>
              <span className="flex items-center gap-1.5 bg-[#EDFAF5] text-[#0F8A82] px-3 py-1 rounded-full text-[12px] font-bold">
                <span className="msym text-[14px]" style={{ fontVariationSettings: "'FILL' 1, 'wght' 400" }}>check_circle</span>
                {stats.done} erledigt
              </span>
              <span className="flex items-center gap-1.5 bg-[#FDECEA] text-[#C95040] px-3 py-1 rounded-full text-[12px] font-bold">
                <span className="msym text-[14px]" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400" }}>cancel</span>
                {stats.missed} versäumt
              </span>
            </div>
          ) : (
            <p className="text-[13.5px] text-kh-muted font-medium mt-0.5">{subtitle}</p>
          )}
        </div>
        {role === 'teacher' && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 gradient-teal text-white px-[17px] py-[11px] rounded-full font-bold text-sm hover:opacity-90 transition-opacity"
          >
            <span className="msym text-[19px]">add</span>
            HÜ posten
          </button>
        )}
      </div>

      {homework.length === 0 ? (
        <div className="text-center text-kh-muted py-16 font-medium">
          <span className="msym text-5xl block mb-3 text-kh-teal-light">assignment</span>
          Keine Hausübungen vorhanden.
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Open / upcoming */}
          {open.length > 0 && (
            <div>
              <div className="text-xs font-bold text-[#9AA6A4] uppercase tracking-[.6px] mb-3">
                Offen · {open.length}
              </div>
              <div className="flex flex-col gap-3">
                {open.map(hw => (
                  <HomeworkCard key={hw.id} hw={hw} role={role} userId={userId} />
                ))}
              </div>
            </div>
          )}

          {/* Past grouped by month */}
          {pastGroups.map(group => (
            <div key={group.label}>
              <div className="text-xs font-bold text-[#9AA6A4] uppercase tracking-[.6px] mb-3">
                {group.label}
              </div>
              <div className="flex flex-col gap-3">
                {group.items.map(hw => (
                  <HomeworkCard key={hw.id} hw={hw} role={role} userId={userId} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <AddHomeworkModal
          classId={classId}
          userId={userId}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}
