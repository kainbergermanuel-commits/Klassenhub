'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import AddDutyModal from './AddDutyModal'
import DutyDayStrip from './DutyDayStrip'
import Avatar from '@/components/ui/Avatar'
import PageHeader from '@/components/layout/PageHeader'
import { dutyIcon, STANDARD_DUTIES, DUTY_DESCRIPTIONS } from '@/lib/dutyIcon'
import type { Duty, Profile, Role } from '@/lib/types'

interface Props {
  duties: Duty[]
  students: Profile[]
  role: Role
  userId: string
  /** Wessen Dienst hervorgehoben wird: bei Schüler:innen sie selbst, bei
   *  Eltern ihr Kind (deren eigene ID steht nie in assignee_ids), sonst null. */
  highlightStudentId: string | null
  classId: string
  weekStart: string
  weekLabel: string
  /** "dutyId:studentId" → bestätigte Wochentage. */
  doneMap: Record<string, number[]>
  confirmableUntil: number
  isPreview: boolean
}

const WEEKDAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr']

export default function DutyWeek({
  duties, students, role, userId, highlightStudentId, classId, weekStart, weekLabel,
  doneMap, confirmableUntil, isPreview,
}: Props) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [editDuty, setEditDuty] = useState<Duty | null>(null)
  const [randomizing, setRandomizing] = useState(false)

  async function randomAssign() {
    if (randomizing) return
    setRandomizing(true)
    const shuffled = [...students].sort(() => Math.random() - 0.5)
    const supabase = createClient()
    // Je zwei Kinder pro Dienst, ohne Wiederholung. Reicht die Klasse nicht
    // für alle Dienste, bekommt der letzte eines — und Dienste ohne Kind
    // werden gar nicht erst angelegt statt, wie früher, mit leerer Zuteilung.
    const rows = STANDARD_DUTIES.map((name, i) => ({
      name,
      picks: shuffled.slice(i * 2, i * 2 + 2).map(s => s.id),
    })).filter(r => r.picks.length > 0)
    await Promise.all(rows.map(r =>
      supabase.from('duties').upsert({
        class_id: classId,
        week_start: weekStart,
        duty_name: r.name,
        assignee_ids: r.picks,
        created_by: userId,
      }, { onConflict: 'class_id,week_start,duty_name' })
    ))
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

  // Wochenleiste. Für Schüler:innen zeigt sie den EIGENEN Bestätigungsstand
  // (bester der zugeteilten Dienste), für alle anderen nur den Kalender —
  // vorher stand hier für jeden bloß vergangenen Tag derselbe grüne Haken, der
  // im Startseiten-Modul "ich habe bestätigt" bedeutet.
  const myDuties = highlightStudentId
    ? duties.filter(d => d.assignee_ids.includes(highlightStudentId))
    : []
  const myDoneDays = new Set<number>(
    myDuties.flatMap(d => doneMap[`${d.id}:${highlightStudentId}`] ?? [])
  )
  const showOwnProgress = myDuties.length > 0

  const weekStartDate = new Date(`${weekStart}T00:00:00`)
  const todayMidnight = new Date(); todayMidnight.setHours(0, 0, 0, 0)
  const weekDays = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(weekStartDate); d.setDate(d.getDate() + i)
    return {
      label: WEEKDAY_LABELS[i],
      date: d.getDate(),
      passed: d.getTime() < todayMidnight.getTime(),
      isToday: d.getTime() === todayMidnight.getTime(),
      confirmed: myDoneDays.has(i + 1),
    }
  })

  return (
    <>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2.5">
        <PageHeader icon="cleaning_services" title="Dienste" subtitle={weekLabel} gradient="from-kh-violet to-[#7C86D6]" className="" />
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

      <div className={`grid grid-cols-5 gap-1.5 md:flex md:flex-wrap ${showOwnProgress ? 'mb-2' : 'mb-5'}`}>
        {weekDays.map((d, i) => (
          <div
            key={i}
            className={`flex items-center justify-center gap-1 px-2.5 max-md:px-1 py-1 rounded-full text-[12px] font-semibold border transition-colors ${
              showOwnProgress && d.confirmed
                ? 'bg-kh-teal-light text-kh-teal border-transparent'
                : d.isToday
                ? 'border-kh-teal text-kh-teal'
                : d.passed
                ? 'border-kh-border text-kh-muted/70'
                : 'border-kh-border text-kh-muted'
            }`}
          >
            <span>{d.label}</span>
            <span className="opacity-60">{d.date}</span>
            {showOwnProgress && (
              <span className="msym text-[14px]" style={{ fontVariationSettings: `'FILL' ${d.confirmed ? 1 : 0}` }}>
                {d.confirmed ? 'check_circle' : 'radio_button_unchecked'}
              </span>
            )}
          </div>
        ))}
      </div>
      {showOwnProgress && (
        <p className="text-[11.5px] text-kh-muted font-medium mb-5">
          {role === 'parent' ? 'Bestätigte Diensttage des Kindes.' : 'Deine bestätigten Diensttage.'}
        </p>
      )}

      <div className="flex items-start gap-2.5 mb-5 px-3.5 py-3 rounded-xl bg-[#F6F3ED] text-[12.5px] text-kh-muted leading-relaxed">
        <span className="msym text-[18px] text-kh-teal flex-shrink-0 mt-px" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
        <span>Die Dienste werden in der Regel nach dem Zufallsprinzip vergeben. Gerne darf sich ein nicht-zugeteiltes Kind anbieten, um mit jemandem den Dienst zu tauschen. Mithelfen ist in jedem Fall erlaubt und gerne gesehen.</span>
      </div>

      {duties.length === 0 ? (
        <div className="text-center py-16 text-kh-muted">
          <span className="msym text-5xl block mb-3 text-kh-teal-light">cleaning_services</span>
          <p className="font-medium">Noch keine Dienste für diese Woche.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {duties.map(duty => {
            const assignees = duty.assignee_ids.map(id => studentMap[id]).filter(Boolean)
            const isHighlighted = !!highlightStudentId && duty.assignee_ids.includes(highlightStudentId)
            const onTeal = isHighlighted
            const description = DUTY_DESCRIPTIONS[duty.duty_name]
            return (
              <div
                key={duty.id}
                className="rounded-2xl p-4 shadow-[0_8px_16px_rgba(20,40,45,.10)] flex items-start gap-4 group min-w-0"
                style={onTeal
                  ? { background: 'linear-gradient(135deg, #0F8A82 0%, #3DB5AC 100%)' }
                  : { background: 'linear-gradient(135deg, #ffffff 0%, #ffffff 55%, #EFEAE0 100%)' }}
              >
                <div className="w-12 h-12 rounded-[14px] flex items-center justify-center flex-shrink-0"
                  style={onTeal
                    ? { background: 'rgba(255,255,255,0.2)' }
                    : { background: 'linear-gradient(135deg, #C2E6DF 0%, #E4F3F0 100%)' }
                  }
                >
                  <span
                    className="msym text-[22px]"
                    style={{ color: onTeal ? 'white' : '#0F8A82', fontVariationSettings: "'FILL' 1" }}
                  >
                    {dutyIcon(duty.duty_name)}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-[15px]" style={{ color: onTeal ? 'white' : undefined }}>{duty.duty_name}</div>
                  {/* Erklärtext für alle Rollen: Eltern und Lehrer:innen sollen
                      lesen können, was das Kind lesen kann. */}
                  {description && (
                    <div className="text-[12px] mt-0.5" style={{ color: onTeal ? 'rgba(255,255,255,0.8)' : '#7A9896' }}>{description}</div>
                  )}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {assignees.map(s => {
                      const doneCount = (doneMap[`${duty.id}:${s.id}`] ?? []).length
                      return (
                        <span
                          key={s.id}
                          className="text-xs font-semibold pl-1 pr-2.5 py-1 rounded-full flex items-center gap-1.5"
                          style={onTeal
                            ? { background: 'rgba(255,255,255,0.2)', color: 'white' }
                            : { background: '#E0F0EE', color: '#0F8A82' }}
                        >
                          <Avatar name={s.full_name} color={s.avatar_color} seed={s.avatar_seed} hairColor={s.avatar_hair_color} skinColor={s.avatar_skin_color} size={20} />
                          {s.full_name.split(' ')[0]}
                          {/* Lehrer:innen sehen den Bestätigungsstand je Kind —
                              bisher gab es dafür nirgends einen Ort. */}
                          {role === 'teacher' && (
                            <span className="text-[10.5px] font-extrabold opacity-70 tabular-nums">{doneCount}/5</span>
                          )}
                        </span>
                      )
                    })}
                  </div>

                  {/* Selbstbestätigung direkt auf der Dienste-Seite. Vorher war
                      sie ausschließlich im rechten Nav-Modul der Startseite
                      erreichbar, das auf dem Handy ganz unten landet. */}
                  {role === 'student' && duty.assignee_ids.includes(userId) && (
                    <div className="mt-3">
                      <DutyDayStrip
                        dutyId={duty.id}
                        doneWeekdays={doneMap[`${duty.id}:${userId}`] ?? []}
                        confirmableUntil={confirmableUntil}
                        readOnly={isPreview}
                        tone="onTeal"
                      />
                    </div>
                  )}
                </div>

                {role === 'teacher' && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-150 flex-shrink-0">
                    <button
                      onClick={() => { setEditDuty(duty); setShowModal(true) }}
                      className="msym text-[19px] text-[#CBD5D3] hover:text-kh-teal transition-colors"
                      aria-label={`${duty.duty_name} bearbeiten`}
                    >
                      edit
                    </button>
                    <button
                      onClick={() => deleteDuty(duty.id)}
                      className="msym text-[19px] text-[#CBD5D3] hover:text-kh-red transition-colors"
                      aria-label={`${duty.duty_name} löschen`}
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
