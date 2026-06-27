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

const STANDARD_DUTIES = ['Tafel wischen', 'Boden säubern', 'Lüften', 'Blumen gießen', 'Ordner austeilen', 'Müll entleeren']

const DUTY_ICONS: Record<string, string> = {
  'Tafel wischen': 'water_drop',
  'Boden säubern': 'cleaning_services',
  'Lüften': 'air',
  'Blumen gießen': 'local_florist',
  'Ordner austeilen': 'folder_open',
  'Müll entleeren': 'delete',
}

const DUTY_DESCRIPTIONS: Record<string, string> = {
  'Tafel wischen': 'Nimm den nassen Schwamm und wisch die Tafel nach jeder Stunde sauber, damit beim nächsten Mal wieder Platz ist.',
  'Boden säubern': 'Schau, ob unter den Tischen Papier oder Dreck liegt, und kehr alles mit dem Besen zusammen, bevor ihr geht.',
  'Lüften': 'Öffne in jeder Pause die Fenster für ein paar Minuten, damit frische Luft ins Klassenzimmer kommt.',
  'Blumen gießen': 'Gieß alle Pflanzen im Klassenzimmer – aber nicht zu viel! Die Erde soll leicht feucht, nicht nass sein.',
  'Ordner austeilen': 'Hol die Klassenordner aus dem Regal und leg jedem Schüler seinen Ordner auf den Tisch, bevor es losgeht.',
  'Müll entleeren': 'Nimm den Mistkübel, leere ihn in den großen Mülleimer auf dem Gang und stell den leeren Kübel wieder hin.',
}

function getDutyIcon(name: string) {
  return DUTY_ICONS[name] ?? 'star'
}

export default function DutyWeek({ duties, students, role, userId, classId, weekStart, weekLabel }: Props) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [editDuty, setEditDuty] = useState<Duty | null>(null)
  const [randomizing, setRandomizing] = useState(false)

  async function randomAssign() {
    if (randomizing) return
    setRandomizing(true)
    const shuffled = [...students].sort(() => Math.random() - 0.5)
    const supabase = createClient()
    await Promise.all(STANDARD_DUTIES.map((name, i) => {
      const picks = shuffled.slice(i * 2, i * 2 + 2).map(s => s.id)
      return supabase.from('duties').upsert({
        class_id: classId,
        week_start: weekStart,
        duty_name: name,
        assignee_ids: picks,
        created_by: userId,
      }, { onConflict: 'class_id,week_start,duty_name' })
    }))
    setRandomizing(false)
    router.refresh()
  }

  const studentMap = Object.fromEntries(students.map(s => [s.id, s]))
  const assignedStudentIds = [...new Set(duties.flatMap(d => d.assignee_ids))]

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
          <div className="flex items-center gap-2">
            <button
              onClick={randomAssign}
              disabled={randomizing}
              className="flex items-center gap-2 gradient-violet text-white px-[17px] py-[11px] rounded-full font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              <span className="msym text-[19px]">{randomizing ? 'hourglass_empty' : 'shuffle'}</span>
              Zufällig zuweisen
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 gradient-teal text-white px-[17px] py-[11px] rounded-full font-bold text-sm hover:opacity-90 transition-opacity"
            >
              <span className="msym text-[19px]">add</span>
              Dienst zuweisen
            </button>
          </div>
        )}
      </div>


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
                className="rounded-2xl p-4 shadow-sm flex items-center gap-4 group"
                style={isMyDuty && role === 'student'
                  ? { background: 'linear-gradient(135deg, #0F8A82 0%, #3DB5AC 100%)' }
                  : { background: 'white' }}
              >
                <div className="w-12 h-12 rounded-[14px] flex items-center justify-center flex-shrink-0"
                  style={isMyDuty && role === 'student'
                    ? { background: 'rgba(255,255,255,0.2)' }
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
                  <div className="font-extrabold text-[15px]" style={{ color: isMyDuty && role === 'student' ? 'white' : undefined }}>{duty.duty_name}</div>
                  {role === 'student' && DUTY_DESCRIPTIONS[duty.duty_name] && (
                    <div className="text-[12px] mt-0.5" style={{ color: isMyDuty ? 'rgba(255,255,255,0.8)' : '#7A9896' }}>{DUTY_DESCRIPTIONS[duty.duty_name]}</div>
                  )}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {assignees.map(s => (
                      <span
                        key={s.id}
                        className="text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={isMyDuty && role === 'student'
                          ? { background: 'rgba(255,255,255,0.2)', color: 'white' }
                          : { background: '#E0F0EE', color: '#0F8A82' }}
                      >
                        {s.full_name.split(' ')[0]}
                      </span>
                    ))}
                  </div>
                </div>

                {role === 'teacher' && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-150 flex-shrink-0">
                    <button
                      onClick={() => { setEditDuty(duty); setShowModal(true) }}
                      className="msym text-[19px] text-[#CBD5D3] hover:text-kh-teal transition-colors"
                    >
                      edit
                    </button>
                    <button
                      onClick={() => deleteDuty(duty.id)}
                      className="msym text-[19px] text-[#CBD5D3] hover:text-kh-red transition-colors"
                    >
                      delete
                    </button>
                  </div>
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
          assignedStudentIds={assignedStudentIds}
          editDuty={editDuty ?? undefined}
          onClose={() => { setShowModal(false); setEditDuty(null) }}
        />
      )}
    </>
  )
}
