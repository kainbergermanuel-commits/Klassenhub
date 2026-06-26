'use client'

import { useState } from 'react'
import Link from 'next/link'
import FeatureCard from './FeatureCard'
import AgendaPanel from './AgendaPanel'
import StreakLeaderCard, { type StreakEntry } from './StreakLeaderCard'
import AddHomeworkModal from '@/components/homework/AddHomeworkModal'
import { todayISO, getMondayOfWeek, getWeekNumber } from '@/lib/date'
import type { Class, Homework, Reminder } from '@/lib/types'

interface Person {
  id?: string
  full_name: string
  avatar_color?: string | null
}

interface TeacherHomeProps {
  fullName: string
  userId: string
  classId: string
  klass: Class | null
  homeworkList: Homework[]
  hwSubmittedCount: number
  studentCount: number
  students: Person[]
  reminders: Reminder[]
  dutyLines: string[]
  dutyStudents: Person[]
  todoTotal: number
  todoDone: number
  streakEntries: StreakEntry[]
}

export default function TeacherHome({
  fullName, userId, classId, klass, homeworkList, hwSubmittedCount, studentCount,
  students, reminders, dutyLines, dutyStudents, todoTotal, todoDone, streakEntries,
}: TeacherHomeProps) {
  const [showModal, setShowModal] = useState(false)
  const firstName = fullName.split(' ').slice(-1)[0]
  const today = new Date().toLocaleDateString('de-AT', { weekday: 'long', day: 'numeric', month: 'long' })
  const todayStr = todayISO()
  const dueToday = homeworkList.filter(h => h.due_date === todayStr)

  const hwSlots = studentCount * homeworkList.length
  const hwProgress = hwSlots > 0 ? (hwSubmittedCount / hwSlots) * 100 : 0
  const todoProgress = todoTotal > 0 ? (todoDone / todoTotal) * 100 : 0

  return (
    <>
      <header className="flex items-start justify-between gap-3 mb-6 flex-wrap">
        <div>
          <h1 className="text-[26px] font-extrabold text-kh-dark tracking-tight">Guten Morgen, {firstName}!</h1>
          <p className="text-sm text-kh-muted font-medium mt-1">{today} · Klasse {klass?.name}</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 gradient-teal text-white px-[18px] py-[11px] rounded-full font-bold text-sm hover:opacity-90 transition-opacity shadow-sm"
        >
          <span className="msym text-[19px]">add</span>
          Neue Hausübung
        </button>
      </header>

      {showModal && (
        <AddHomeworkModal classId={classId} userId={userId} onClose={() => setShowModal(false)} />
      )}

      <div className="grid lg:grid-cols-[1fr_340px] gap-6 lg:gap-0 items-start">
        <div className="flex flex-col gap-5 min-w-0 lg:pr-6">
          {/* Feature cards */}
          <div className="grid sm:grid-cols-3 gap-4">
            <FeatureCard
              href="/hausaufgaben" gradient="amber" icon="assignment"
              title="Hausübungen"
              meta={homeworkList.length > 0 ? `${homeworkList.length} aktiv · ${hwSubmittedCount}/${hwSlots} abgegeben` : 'Keine aktiven HÜ'}
              progress={homeworkList.length > 0 ? hwProgress : undefined}
              people={students}
            />
            <FeatureCard
              href="/todo" gradient="teal" icon="checklist"
              title="Wochen-To-Do"
              meta={todoTotal > 0 ? `${todoDone}/${todoTotal} erledigt` : 'Noch nichts gepostet'}
              progress={todoTotal > 0 ? todoProgress : undefined}
              badge={todoTotal > 0 ? `${todoTotal}` : undefined}
            />
            <FeatureCard
              href="/dienste" gradient="violet" icon="cleaning_services"
              title={`Dienste · KW ${getWeekNumber(getMondayOfWeek())}`}
              meta={dutyLines.length > 0 ? dutyLines.join(' · ') : 'Noch keine Dienste vergeben'}
              people={dutyStudents}
            />
          </div>

          {/* Today's homework */}
          <div className="bg-white rounded-[20px] p-5 shadow-sm border border-kh-border/50">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-extrabold text-base text-kh-dark">Heute fällig</h2>
              <Link href="/hausaufgaben" className="text-sm font-semibold text-kh-teal hover:underline">Alle</Link>
            </div>
            {dueToday.length === 0 ? (
              <p className="text-sm text-kh-muted font-medium">Heute ist nichts fällig.</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {dueToday.map(hw => (
                  <div key={hw.id} className="flex items-center gap-3 rounded-xl bg-[#FAF8F3] px-3 py-2.5 overflow-hidden">
                    <div
                      className="w-9 h-9 rounded-[10px] flex items-center justify-center font-extrabold text-[13px] text-white flex-shrink-0"
                      style={{ background: `linear-gradient(135deg, ${hw.subject_color}ee 0%, ${hw.subject_color}99 100%)` }}
                    >
                      {hw.subject_short}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[14px] text-kh-dark truncate">{hw.title}</div>
                      <div className="flex items-center gap-1 text-xs font-semibold text-kh-amber mt-0.5">
                        <span className="msym text-[12px]" style={{ fontVariationSettings: "'FILL' 0" }}>event</span>
                        Heute fällig · {hw.subject}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Mini stats */}
          <div className="grid grid-cols-3 gap-4 max-[480px]:grid-cols-1">
            {[
              { val: studentCount, label: 'Schüler:innen', color: 'text-kh-dark' },
              { val: homeworkList.length, label: 'Aktive HÜ', color: 'text-kh-amber' },
              { val: `${todoDone}/${todoTotal}`, label: 'To-Dos erledigt', color: 'text-kh-teal' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-[18px] p-4 shadow-sm border border-kh-border/50 flex flex-col items-center text-center">
                <div className={`text-[26px] font-extrabold ${s.color}`}>{s.val}</div>
                <div className="text-[12.5px] text-kh-muted font-medium mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="hidden lg:block absolute top-0 -left-6 w-6 h-6 bg-white rounded-br-[20px]" />
          <div className="hidden lg:block absolute bottom-0 -left-6 w-6 h-6 bg-white rounded-tr-[20px]" />
          <div className="flex flex-col gap-5 lg:bg-[#EDE9DF] lg:rounded-[24px] lg:p-5 lg:sticky lg:top-7">
            <AgendaPanel reminders={reminders} role="teacher" />
            <StreakLeaderCard entries={streakEntries} />
          </div>
        </div>
      </div>
    </>
  )
}
