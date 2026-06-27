'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Avatar from '@/components/ui/Avatar'
import Link from 'next/link'
import FeatureCard from './FeatureCard'
import AgendaPanel from './AgendaPanel'
import StreakLeaderCard, { type StreakEntry } from './StreakLeaderCard'
import AddHomeworkModal from '@/components/homework/AddHomeworkModal'
import { todayISO, addDaysISO, getMondayOfWeek, getWeekNumber } from '@/lib/date'
import type { Class, HomeworkWithStatus, Reminder } from '@/lib/types'

type StudentStatus = { id: string; full_name: string; done: boolean; avatar_color: string; avatar_seed: string | null; avatar_hair_color: string | null; avatar_skin_color: string | null }

function HwEyeButton({ hw, classId }: { hw: HomeworkWithStatus; classId: string }) {
  const [open, setOpen] = useState(false)
  const [students, setStudents] = useState<StudentStatus[] | null>(null)

  const openPopup = useCallback(async () => {
    setOpen(true)
    if (students !== null) return
    const supabase = createClient()
    const [{ data: allStudents }, { data: completions }] = await Promise.all([
      supabase.from('profiles').select('id,full_name,avatar_color,avatar_seed,avatar_hair_color,avatar_skin_color').eq('class_id', classId).eq('role', 'student').order('full_name'),
      supabase.from('homework_completions').select('student_id').eq('homework_id', hw.id),
    ])
    const doneIds = new Set((completions ?? []).map(c => c.student_id))
    setStudents((allStudents ?? []).map(s => ({ ...s, avatar_color: s.avatar_color ?? '#0F8A82', avatar_seed: s.avatar_seed ?? null, avatar_hair_color: s.avatar_hair_color ?? null, avatar_skin_color: s.avatar_skin_color ?? null, done: doneIds.has(s.id) })))
  }, [hw.id, classId, students])

  return (
    <>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className="text-xs font-bold text-kh-teal">{hw.completion_count ?? 0} gemacht</span>
        <button onClick={openPopup} className="msym text-[17px] text-kh-teal/60 hover:text-kh-teal transition-colors leading-none">visibility</button>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[11px] flex items-center justify-center font-extrabold text-[13px] text-white flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${hw.subject_color}ee 0%, ${hw.subject_color}99 100%)` }}>
                  {hw.subject_short}
                </div>
                <h2 className="text-[16px] font-extrabold text-kh-dark">{hw.title}</h2>
              </div>
              <button onClick={() => setOpen(false)} className="msym text-2xl text-kh-muted hover:text-kh-dark transition-colors">close</button>
            </div>
            {students === null ? (
              <div className="text-center py-8 text-kh-muted text-sm">Lädt…</div>
            ) : (
              <div className="flex flex-col gap-4">
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="msym text-[16px] text-kh-teal" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    <span className="text-[12px] font-extrabold text-kh-teal uppercase tracking-wide">Gemacht · {students.filter(s => s.done).length}</span>
                  </div>
                  {students.filter(s => s.done).length === 0
                    ? <p className="text-xs text-kh-muted pl-1">Noch niemand</p>
                    : <div className="flex flex-wrap gap-1.5">
                        {students.filter(s => s.done).map(s => (
                          <span key={s.id} className="flex items-center gap-1.5 text-[12px] font-semibold bg-[#DDF0E7] text-[#2E9C6E] pl-1 pr-2.5 py-0.5 rounded-full">
                            <Avatar name={s.full_name} color={s.avatar_color} seed={s.avatar_seed} hairColor={s.avatar_hair_color} skinColor={s.avatar_skin_color} size={20} />
                            {s.full_name.split(' ')[0]}
                          </span>
                        ))}
                      </div>
                  }
                </div>
                <div className="border-t border-kh-border/40" />
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="msym text-[16px] text-kh-muted" style={{ fontVariationSettings: "'FILL' 0" }}>radio_button_unchecked</span>
                    <span className="text-[12px] font-extrabold text-kh-muted uppercase tracking-wide">Nicht gemacht · {students.filter(s => !s.done).length}</span>
                  </div>
                  {students.filter(s => !s.done).length === 0
                    ? <p className="text-xs text-kh-muted pl-1">Alle haben gemacht 🎉</p>
                    : <div className="flex flex-wrap gap-1.5">
                        {students.filter(s => !s.done).map(s => (
                          <span key={s.id} className="flex items-center gap-1.5 text-[12px] font-semibold bg-[#F6F3ED] text-kh-muted pl-1 pr-2.5 py-0.5 rounded-full">
                            <Avatar name={s.full_name} color={s.avatar_color} seed={s.avatar_seed} hairColor={s.avatar_hair_color} skinColor={s.avatar_skin_color} size={20} />
                            {s.full_name.split(' ')[0]}
                          </span>
                        ))}
                      </div>
                  }
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

interface Person {
  id?: string
  full_name: string
  avatar_color?: string | null
  avatar_seed?: string | null
  avatar_hair_color?: string | null
  avatar_skin_color?: string | null
}

interface TeacherHomeProps {
  fullName: string
  userId: string
  classId: string
  klass: Class | null
  homeworkList: HomeworkWithStatus[]
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
  const upcoming = [...homeworkList]
    .filter(h => h.due_date >= todayStr)
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .slice(0, 5)

  const hwSlots = studentCount * homeworkList.length
  const hwProgress = hwSlots > 0 ? (hwSubmittedCount / hwSlots) * 100 : 0
  const todoSlots = todoTotal * studentCount
  const todoProgress = todoSlots > 0 ? (todoDone / todoSlots) * 100 : 0

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
              meta={todoTotal > 0 ? `${todoDone}/${todoSlots} erledigt` : 'Noch nichts gepostet'}
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

          {/* Upcoming homework */}
          <div className="bg-white rounded-[20px] p-5 shadow-sm border border-kh-border/50">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-extrabold text-base text-kh-dark">Demnächst fällig</h2>
              <Link href="/hausaufgaben" className="text-sm font-semibold text-kh-teal hover:underline">Alle</Link>
            </div>
            {upcoming.length === 0 ? (
              <p className="text-sm text-kh-muted font-medium">Keine bevorstehenden Hausübungen.</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {upcoming.map(hw => {
                  const isToday = hw.due_date === todayStr
                  const isTomorrow = hw.due_date === addDaysISO(1)
                  const dateLabel = isToday ? 'Heute' : isTomorrow ? 'Morgen' : new Date(hw.due_date).toLocaleDateString('de-AT', { weekday: 'short', day: 'numeric', month: 'short' })
                  const dateColor = isToday ? '#C95040' : isTomorrow ? '#C98A2B' : '#6E7E80'
                  return (
                    <div key={hw.id} className="flex items-center gap-3 rounded-xl bg-[#FAF8F3] px-3 py-2.5 overflow-hidden">
                      <div
                        className="w-9 h-9 rounded-[10px] flex items-center justify-center font-extrabold text-[13px] text-white flex-shrink-0"
                        style={{ background: `linear-gradient(135deg, ${hw.subject_color}ee 0%, ${hw.subject_color}99 100%)` }}
                      >
                        {hw.subject_short}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-[14px] text-kh-dark truncate">{hw.title}</div>
                        <div className="flex items-center gap-1 text-xs font-semibold mt-0.5" style={{ color: dateColor }}>
                          <span className="msym text-[12px]" style={{ fontVariationSettings: "'FILL' 0" }}>event</span>
                          {dateLabel} · {hw.subject}
                        </div>
                      </div>
                      <HwEyeButton hw={hw} classId={classId} />
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Mini stats */}
          <div className="grid grid-cols-3 gap-4 max-[480px]:grid-cols-1">
            {[
              { val: studentCount, label: 'Schüler:innen', color: 'text-kh-dark' },
              { val: homeworkList.length, label: 'Aktive HÜ', color: 'text-kh-amber' },
              { val: `${todoDone}/${todoSlots}`, label: 'To-Do erledigt', color: 'text-kh-teal' },
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
