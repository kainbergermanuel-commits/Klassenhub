'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import AddDutyModal from './AddDutyModal'
import type { Duty, Profile, Role } from '@/lib/types'

interface Props {
  duties: Duty[]
  students: Profile[]
  role: Role
  userId: string
  classId: string
  weekStart: string
  weekLabel: string
}

const DUTY_ICONS: Record<string, string> = {
  'Tafel wischen': 'cleaning_services',
  'Lüften': 'air',
  'Blumen gießen': 'local_florist',
  'Ordner austeilen': 'folder_open',
  'Müll entleeren': 'delete',
}

function getDutyIcon(name: string) {
  return DUTY_ICONS[name] ?? 'star'
}

export default function DutyWeek({ duties, students, role, userId, classId, weekStart, weekLabel }: Props) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)

  const studentMap = Object.fromEntries(students.map(s => [s.id, s]))

  async function deleteDuty(id: string) {
    const supabase = createClient()
    await supabase.from('duties').delete().eq('id', id)
    router.refresh()
  }

  // My duty (for student/parent view)
  const myDuties = duties.filter(d => d.assignee_ids.includes(userId))

  return (
    <>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2.5">
        <div>
          <h1 className="text-[25px] font-extrabold text-kh-dark tracking-tight">Dienste</h1>
          <p className="text-[13.5px] text-kh-muted font-medium mt-0.5">{weekLabel}</p>
        </div>
        {role === 'teacher' && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 gradient-teal text-white px-[17px] py-[11px] rounded-full font-bold text-sm hover:opacity-90 transition-opacity"
          >
            <span className="msym text-[19px]">add</span>
            Dienst zuweisen
          </button>
        )}
      </div>

      {/* Student's own duty highlight */}
      {role === 'student' && myDuties.length > 0 && (
        <div className="gradient-teal rounded-2xl p-5 text-white mb-5">
          <div className="flex items-center gap-2 mb-1 opacity-80">
            <span className="msym text-[17px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
            <span className="text-xs font-bold uppercase tracking-wider">Dein Dienst diese Woche</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {myDuties.map(d => (
              <div key={d.id} className="font-extrabold text-[17px]">{d.duty_name}</div>
            ))}
          </div>
        </div>
      )}

      {duties.length === 0 ? (
        <div className="text-center py-16 text-kh-muted">
          <span className="msym text-5xl block mb-3 text-kh-teal-light">cleaning_services</span>
          <p className="font-medium">Noch keine Dienste für diese Woche.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {duties.map(duty => {
            const assignees = duty.assignee_ids.map(id => studentMap[id]).filter(Boolean)
            const isMyDuty = duty.assignee_ids.includes(userId)
            return (
              <div
                key={duty.id}
                className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4 group"
                style={isMyDuty && role === 'student' ? { border: '2px solid #0F8A82' } : {}}
              >
                <div className="w-12 h-12 rounded-[14px] flex items-center justify-center flex-shrink-0"
                  style={isMyDuty && role === 'student'
                    ? { background: 'linear-gradient(135deg,#0F8A82,#3DB5AC)' }
                    : { background: '#E0F0EE' }
                  }
                >
                  <span
                    className="msym text-[22px]"
                    style={{ color: isMyDuty && role === 'student' ? 'white' : '#0F8A82', fontVariationSettings: "'FILL' 1" }}
                  >
                    {getDutyIcon(duty.duty_name)}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-[15px] text-kh-dark">{duty.duty_name}</div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {assignees.map(s => (
                      <span
                        key={s.id}
                        className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{ background: '#E0F0EE', color: '#0F8A82' }}
                      >
                        <span
                          className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-extrabold text-white flex-shrink-0"
                          style={{ background: s.avatar_color }}
                        >
                          {s.full_name[0]}
                        </span>
                        {s.full_name.split(' ')[0]}
                      </span>
                    ))}
                  </div>
                </div>

                {role === 'teacher' && (
                  <button
                    onClick={() => deleteDuty(duty.id)}
                    className="msym text-[19px] text-[#CBD5D3] hover:text-kh-red opacity-0 group-hover:opacity-100 transition-all duration-150 flex-shrink-0"
                  >
                    delete
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <AddDutyModal
          classId={classId}
          userId={userId}
          weekStart={weekStart}
          students={students}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}
