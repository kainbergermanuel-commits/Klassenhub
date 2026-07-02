'use client'

import { useState } from 'react'
import HomeworkCard from './HomeworkCard'
import AddHomeworkModal from './AddHomeworkModal'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { HomeworkWithStatus, Role, SpecialRole } from '@/lib/types'

interface Props {
  homework: HomeworkWithStatus[]
  role: Role
  specialRole?: SpecialRole | null
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

export default function HomeworkList({ homework, role, specialRole, userId, classId, subtitle, stats }: Props) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)

  const canCreate = role === 'teacher' || specialRole === 'hw_admin'
  const asPending = role !== 'teacher'

  async function confirmHomework(id: string) {
    const supabase = createClient()
    await supabase.from('homework').update({ status: 'published' }).eq('id', id)
    router.refresh()
  }

  const today = todayLocalISO()
  const pending = homework.filter(h => h.status === 'pending')
  const published = homework.filter(h => h.status === 'published')
  const open = published
    .filter(h => h.due_date > today)
    .sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1
      return a.due_date.localeCompare(b.due_date)
    })
  const past = published.filter(h => h.due_date <= today).sort((a, b) => b.due_date.localeCompare(a.due_date))

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
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 max-md:w-10 max-md:h-10 rounded-2xl gradient-amber shadow-[0_6px_16px_rgba(20,40,45,.15)] flex items-center justify-center flex-shrink-0">
            <span className="msym text-[24px] max-md:text-[22px] text-white">assignment</span>
          </div>
          <div>
          <h1 className="text-[25px] max-md:text-[22px] font-extrabold text-kh-dark tracking-tight">Hausübungen</h1>
          {stats ? (
            <div className="mt-2">
              <div className="flex items-center gap-2 flex-wrap">
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
              {(() => {
                const total = stats.open + stats.done + stats.missed
                const donePct = total > 0 ? Math.round((stats.done / total) * 100) : 0
                const missedPct = total > 0 ? Math.round((stats.missed / total) * 100) : 0
                const openPct = 100 - donePct - missedPct
                return (
                  <div className="mt-2.5 flex items-center gap-2">
                    <div className="flex-1 h-[5px] rounded-full overflow-hidden bg-[#EDE9E0] flex">
                      {donePct > 0 && <div style={{ width: `${donePct}%`, background: '#0F8A82' }} />}
                      {missedPct > 0 && <div style={{ width: `${missedPct}%`, background: '#C95040' }} />}
                      {openPct > 0 && <div style={{ width: `${openPct}%` }} />}
                    </div>
                    <span className="text-[11px] font-bold text-kh-muted flex-shrink-0">{donePct}% erledigt</span>
                  </div>
                )
              })()}
            </div>
          ) : (
            <p className="text-[13.5px] text-kh-muted font-medium mt-0.5">{subtitle}</p>
          )}
          </div>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowModal(true)}
            className="max-md:hidden flex items-center gap-2 gradient-teal text-white px-[17px] py-[11px] rounded-full font-bold text-sm hover:opacity-90 transition-opacity"
          >
            <span className="msym text-[19px]">add</span>
            Neue Hausübung
          </button>
        )}
      </div>

      {/* Schwebender „Neue HÜ"-Button unter dem Burger (nur Mobile) */}
      {canCreate && (
        <button
          onClick={() => setShowModal(true)}
          className="md:hidden fixed top-[68px] right-4 z-30 w-11 h-11 flex items-center justify-center rounded-2xl gradient-teal text-white shadow-[0_2px_10px_rgba(20,40,45,.18)] active:scale-95 transition-transform"
          aria-label="Neue Hausübung"
        >
          <span className="msym text-[23px]">assignment_add</span>
        </button>
      )}

      {homework.length === 0 ? (
        <div className="text-center text-kh-muted py-16 font-medium">
          <span className="msym text-5xl block mb-3 text-kh-teal-light">assignment</span>
          Keine Hausübungen vorhanden.
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Pending — nur für Lehrer */}
          {role === 'teacher' && pending.length > 0 && (
            <div>
              <div className="text-xs font-bold text-kh-amber uppercase tracking-[.6px] mb-3 flex items-center gap-1.5">
                <span className="msym text-[14px]" style={{ fontVariationSettings: "'FILL' 0" }}>pending</span>
                Ausstehend · Bestätigung erforderlich ({pending.length})
              </div>
              <div className="flex flex-col gap-3">
                {pending.map(hw => (
                  <PendingHomeworkCard key={hw.id} hw={hw} onConfirm={confirmHomework} />
                ))}
              </div>
            </div>
          )}
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
          asPending={asPending}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}

function PendingHomeworkCard({ hw, onConfirm }: { hw: HomeworkWithStatus; onConfirm: (id: string) => void }) {
  return (
    <div className="bg-[#FFFBF2] border border-kh-amber/30 rounded-2xl px-4 py-3.5 flex items-center gap-3">
      <div
        className="w-10 h-10 rounded-[10px] flex items-center justify-center font-extrabold text-[13px] text-white flex-shrink-0"
        style={{ background: `linear-gradient(135deg, ${hw.subject_color}ee 0%, ${hw.subject_color}99 100%)` }}
      >
        {hw.subject_short}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-[14px] text-kh-dark truncate">{hw.title}</div>
        <div className="text-xs text-kh-muted font-medium mt-0.5">
          {hw.subject} · Fällig: {new Date(`${hw.due_date}T00:00:00`).toLocaleDateString('de-AT', { day: 'numeric', month: 'short' })}
        </div>
      </div>
      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#F8ECD6] text-kh-amber flex-shrink-0">Ausstehend</span>
      <button
        onClick={() => onConfirm(hw.id)}
        className="flex items-center gap-1 bg-kh-teal text-white text-[12px] font-bold px-3 py-1.5 rounded-full hover:opacity-90 transition-opacity flex-shrink-0"
      >
        <span className="msym text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
        Bestätigen
      </button>
    </div>
  )
}
