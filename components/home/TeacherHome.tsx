'use client'

import { useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import Avatar from '@/components/ui/Avatar'
import Link from 'next/link'
import HeuteAgenda, { type AgendaData } from './HeuteAgenda'
import AgendaPanel from './AgendaPanel'
import TeacherStatsPanel, { type TeacherStats } from './TeacherStatsPanel'
import AddHomeworkModal from '@/components/homework/AddHomeworkModal'
import AttendanceTeacherCard, { type PendingAttendanceReport, type AbsentTodayEntry } from './AttendanceTeacherCard'
import { todayISO, addDaysISO, greeting } from '@/lib/date'
import type { Class, HomeworkWithStatus, Reminder, AgendaEvent } from '@/lib/types'
import type { SubjectOption } from '@/lib/subjectsCatalog'
import AnimateIn from '@/components/ui/AnimateIn'

type StudentStatus = { id: string; full_name: string; done: boolean; avatar_color: string; avatar_seed: string | null; avatar_hair_color: string | null; avatar_skin_color: string | null }

type HwEyeItem = Pick<HomeworkWithStatus, 'id' | 'title' | 'subject_color' | 'subject_short' | 'completion_count'>

function HwEyeButton({ hw, classId }: { hw: HwEyeItem; classId: string }) {
  const [open, setOpen] = useState(false)
  const [students, setStudents] = useState<StudentStatus[] | null>(null)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

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
      {open && mounted && createPortal(
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => setOpen(false)}>
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
        </div>,
        document.body,
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
  reminders: Reminder[]
  upcomingEvents: AgendaEvent[]
  /** Gesamtzahl bevorstehender Termine (upcomingEvents ist auf sechs begrenzt). */
  upcomingEventCount: number
  recentHomework: { id: string; title: string; subject: string; subject_short: string; subject_color: string; due_date: string; completion_count: number }[]
  attendancePendingReports: PendingAttendanceReport[]
  absentToday: AbsentTodayEntry[]
  /** Alle Schüler:innen der Klasse (für Avatare der Anwesenheits-Karte) */
  students: (Person & { id: string })[]
  /** Kennzahlen (inkl. Wochenrückblick) fürs Statistik-Panel der rechten Nav. */
  teacherStats: TeacherStats
  /** Stundenplan + Planungs-Notizen für die "Heutige Agenda"-Header-Card. */
  agenda: AgendaData
  /** Fächer-Katalog fürs "Neue Hausübung"-Modal (siehe lib/subjectsCatalog.ts). */
  subjects: SubjectOption[]
}

export default function TeacherHome({
  fullName, userId, classId, klass, homeworkList, reminders, upcomingEvents, upcomingEventCount, recentHomework,
  attendancePendingReports, absentToday, students, teacherStats, agenda, subjects,
}: TeacherHomeProps) {
  const [showModal, setShowModal] = useState(false)
  const firstName = fullName.split(' ')[0]
  const today = new Date().toLocaleDateString('de-AT', { weekday: 'long', day: 'numeric', month: 'long' })
  const todayStr = todayISO()
  const upcoming = [...homeworkList]
    .filter(h => h.due_date >= todayStr)
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .slice(0, 5)

  const hasAttendanceContent = attendancePendingReports.length > 0 || absentToday.length > 0

  return (
    <>
      <header className="flex items-center gap-3 min-w-0 mb-6 max-md:pr-16">
        <div className="md:hidden w-10 h-10 rounded-2xl gradient-teal shadow-[0_6px_16px_rgba(20,40,45,.15)] flex items-center justify-center flex-shrink-0">
          <span className="msym text-[22px] text-white" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
        </div>
        <div className="min-w-0">
          <h1 className="text-[26px] max-md:text-[22px] font-extrabold text-kh-dark tracking-tight">{greeting()}, {firstName}!</h1>
          <p className="text-sm text-kh-muted font-medium mt-1">{today} · Klasse {klass?.name}</p>
        </div>
      </header>

      {/* Schwebender „Neue HÜ"-Button unter dem Burger (nur Mobile, nur Startseite) */}
      <button
        onClick={() => setShowModal(true)}
        className="md:hidden fixed top-[68px] right-4 z-30 w-11 h-11 flex items-center justify-center rounded-2xl gradient-teal text-white shadow-[0_2px_10px_rgba(20,40,45,.18)] active:scale-95 transition-transform"
        aria-label="Neue Hausübung"
      >
        <span className="msym text-[23px]">assignment_add</span>
      </button>


      {showModal && (
        <AddHomeworkModal classId={classId} userId={userId} subjects={subjects} onClose={() => setShowModal(false)} />
      )}

      <div className="grid lg:grid-cols-[1fr_340px] gap-6 lg:gap-0 items-start">
        <div className="flex flex-col gap-5 min-w-0 lg:pr-6">
          {/* Anwesenheit — nur Mobile hier oben; auf Desktop wandert die Karte
              in die rechte Spalte unter das Agenda-Panel */}
          {hasAttendanceContent && (
            <div className="lg:hidden">
              <AttendanceTeacherCard
                pendingReports={attendancePendingReports}
                absentToday={absentToday}
                students={students}
              />
            </div>
          )}

          {/* Heutige Agenda — Header-Card: eigener Unterricht + Planungs-Notizen,
              umschaltbar Tag/Woche (ersetzt die drei Feature-Minicards). */}
          <AnimateIn delay={0}>
            <HeuteAgenda data={agenda} />
          </AnimateIn>

          {/* Upcoming + Recent homework */}
          <AnimateIn delay={180} className="rounded-2xl p-5 shadow-[0_8px_16px_rgba(20,40,45,.10)]" style={{ background: 'linear-gradient(135deg, #FBF9F3 0%, #FEFEFC 100%)' }}>
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="flex items-center gap-2 font-extrabold text-base text-kh-dark whitespace-nowrap min-w-0">
                <span className="msym text-[20px] text-kh-teal flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>assignment</span>
                <span className="truncate">Demnächst fällig</span>
              </h2>
              <div className="flex items-center gap-3 flex-shrink-0">
                <button
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-1.5 gradient-teal text-white px-3.5 py-1.5 rounded-full font-bold text-[12.5px] hover:opacity-90 transition-opacity shadow-sm"
                >
                  <span className="msym text-[16px]">add</span>
                  Neue Hausübung
                </button>
                <Link href="/hausaufgaben" className="text-sm font-semibold text-kh-teal hover:underline flex-shrink-0">Alle</Link>
              </div>
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

            {recentHomework.length > 0 && (
              <>
                <div className="flex items-center gap-2 mt-4 mb-2.5">
                  <div className="flex-1 h-px bg-kh-border/60" />
                  <span className="text-[11px] font-bold text-kh-muted uppercase tracking-wide">Kürzlich abgeschlossen</span>
                  <div className="flex-1 h-px bg-kh-border/60" />
                </div>
                <div className="flex flex-col gap-1.5">
                  {recentHomework.map(hw => (
                    <div key={hw.id} className="flex items-center gap-3 rounded-xl px-3 py-2">
                      <div
                        className="w-7 h-7 rounded-[8px] flex items-center justify-center font-extrabold text-[11px] text-white flex-shrink-0 opacity-50"
                        style={{ background: `linear-gradient(135deg, ${hw.subject_color}ee 0%, ${hw.subject_color}99 100%)` }}
                      >
                        {hw.subject_short}
                      </div>
                      <div className="flex-1 min-w-0 opacity-50">
                        <div className="font-semibold text-[13px] text-kh-dark truncate">{hw.title}</div>
                        <div className="text-[11px] text-kh-muted font-medium">
                          {new Date(hw.due_date).toLocaleDateString('de-AT', { day: 'numeric', month: 'short' })} · {hw.subject}
                        </div>
                      </div>
                      <HwEyeButton hw={hw} classId={classId} />
                    </div>
                  ))}
                </div>
              </>
            )}
          </AnimateIn>

        </div>

        <div className="relative">
          <div className="flex flex-col gap-5 lg:bg-[#EDE9DF] lg:rounded-2xl lg:p-5 lg:sticky lg:top-7">
            <AnimateIn delay={120}>
              <AgendaPanel reminders={reminders} events={upcomingEvents} eventCount={upcomingEventCount} role="teacher" classId={classId} userId={userId} />
            </AnimateIn>
            {/* Anwesenheit direkt unter Terminen/Erinnerungen — nur Desktop
                (auf Mobile sitzt die Karte oben in der Hauptspalte) */}
            {hasAttendanceContent && (
              <AnimateIn delay={150} className="max-lg:hidden">
                <AttendanceTeacherCard
                  pendingReports={attendancePendingReports}
                  absentToday={absentToday}
                  students={students}
                />
              </AnimateIn>
            )}
            <AnimateIn delay={180}>
              <TeacherStatsPanel stats={teacherStats} />
            </AnimateIn>
          </div>
        </div>
      </div>
    </>
  )
}
