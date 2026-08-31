import Link from 'next/link'
import HeuteAgenda, { type AgendaData } from './HeuteAgenda'
import ChildStatsPanel, { type ChildStats } from './ChildStatsPanel'
import AgendaPanel from './AgendaPanel'
import ParentHwConfirmList, { type PendingConfirmation } from './ParentHwConfirmList'
import AttendanceParentCard, { type ChildAbsenceEntry } from './AttendanceParentCard'
import Avatar from '@/components/ui/Avatar'
import type { HomeworkWithStatus, Reminder, AgendaEvent } from '@/lib/types'
import { flameCount } from '@/lib/streak'
import { greeting, dueInfo } from '@/lib/date'
import { dueDateFor } from '@/lib/homework'
import HomeworkDetails from '@/components/homework/HomeworkDetails'
import AnimateIn from '@/components/ui/AnimateIn'

interface ParentHomeProps {
  fullName: string
  childName: string
  childColor: string
  childSeed: string | null
  childHairColor: string | null
  childSkinColor: string | null
  className: string
  childHomework: HomeworkWithStatus[]
  reminders: Reminder[]
  upcomingEvents: AgendaEvent[]
  /** Eltern-bestätigter Streak des Kindes – bestimmt die Flammen in der Kopfzeile. */
  childConfirmedStreak: number
  pendingConfirmations: PendingConfirmation[]
  /** Botenfeder (Balance-Fahrplan Phase 3): HÜ-IDs, bei denen das Kind aktiv
   *  um Bestätigung gebeten hat — hebt den Eintrag in der Liste dezent hervor. */
  nudgedHomeworkIds?: Set<string>
  /** Heutige + kommende Abwesenheiten des Kindes (Anwesenheits-Startkarte) */
  childUpcomingAbsences: ChildAbsenceEntry[]
  today: string
  /** Stundenplan des Kindes für die "Stundenplan"-Header-Card (Fokus morgen). */
  agenda: AgendaData
  /** Kind-Kennzahlen (inkl. Wochenrückblick) fürs Statistik-Panel der rechten Nav. */
  childStats: ChildStats
}

export default function ParentHome({
  fullName, childName, childColor, childSeed, childHairColor, childSkinColor, className, childHomework, reminders, upcomingEvents, childConfirmedStreak, pendingConfirmations, nudgedHomeworkIds, childUpcomingAbsences, today: todayIso, agenda, childStats,
}: ParentHomeProps) {
  const childFirst = childName.split(' ')[0]
  const today = new Date().toLocaleDateString('de-AT', { weekday: 'long', day: 'numeric', month: 'long' })
  const hwTotal = childHomework.length
  const hwOpen = childHomework.filter(h => !h.done).length

  return (
    <>
      {/* Kopfzeile mit dem Avatar des Kindes. Lehrer- und Schüler-Startseite
          tragen an dieser Stelle ein generisches Schul-Symbol, und zwar nur
          auf Mobile — dort handelt die Seite von der betrachtenden Person
          selbst, deren Avatar ohnehin in der Seitenleiste steht. Die
          Eltern-Seite handelt von jemand anderem, dessen Gesicht sonst
          nirgends im Rahmen vorkommt. Deshalb hier auf allen Größen, und auf
          Mobile anstelle des Symbols statt zusätzlich. */}
      <header className="mb-5">
        <div className="flex items-center gap-3 min-w-0 max-md:pr-16">
          <div className="rounded-full flex-shrink-0" style={{ boxShadow: '0 0 0 2px rgba(15,138,130,.18)' }}>
            <Avatar name={childName} color={childColor} seed={childSeed} hairColor={childHairColor} skinColor={childSkinColor} size={42} />
          </div>
          <h1 className="text-[26px] max-md:text-[22px] font-extrabold text-kh-dark tracking-tight min-w-0">{greeting()}, Familie {fullName.split(' ').slice(-1)[0]}!</h1>
        </div>
        <div className="flex items-center gap-2 mt-1 min-w-0">
          <p className="text-sm text-kh-muted font-medium truncate">{today} · {childFirst}, {className}</p>
          {flameCount(childConfirmedStreak) > 0 && (
            <span
              className="flex items-center flex-shrink-0"
              title={`${childConfirmedStreak} Hausübungen in Folge, von euch bestätigt`}
            >
              {Array.from({ length: flameCount(childConfirmedStreak) }).map((_, i) => (
                <img key={i} src="/flame.svg" alt="" className="w-[15px] h-[15px]" style={{ marginLeft: i === 0 ? 0 : '-3px' }} />
              ))}
            </span>
          )}
        </div>
      </header>

      {/* HÜ-Bestätigungen – bestätigte HÜ verdienen automatisch die Streak-Flammen */}
      <ParentHwConfirmList items={pendingConfirmations} childFirstName={childFirst} nudgedHomeworkIds={nudgedHomeworkIds} />

      <div className="grid lg:grid-cols-[1fr_340px] gap-6 lg:gap-0 items-start">
        <div className="flex flex-col gap-5 min-w-0 lg:pr-6">
          {/* Anwesenheit — nur Mobile hier oben; auf Desktop sitzt die Karte
              in der rechten Spalte unter dem Agenda-Panel */}
          <div className="lg:hidden">
            <AttendanceParentCard
              childFirstName={childFirst}
              upcomingEntries={childUpcomingAbsences}
              today={todayIso}
            />
          </div>

          {/* Stundenplan des Kindes — Header-Card (Fokus morgen, Toggle Woche),
              ersetzt die zwei Feature-Minicards. */}
          <AnimateIn delay={0}>
            <HeuteAgenda data={agenda} />
          </AnimateIn>

          {/* Child's homework */}
          <AnimateIn delay={180} className="rounded-2xl p-5 shadow-[0_8px_16px_rgba(20,40,45,.10)]" style={{ background: 'linear-gradient(135deg, #FBF9F3 0%, #FEFEFC 100%)' }}>
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="flex items-center gap-2 font-extrabold text-base text-kh-dark whitespace-nowrap min-w-0">
                <span className="msym text-[20px] text-kh-teal flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>assignment</span>
                <span className="truncate">{childFirst}s Hausübungen</span>
              </h2>
              <Link href="/hausaufgaben" className="text-sm font-semibold text-kh-teal hover:underline flex-shrink-0">Alle</Link>
            </div>
            {childHomework.length === 0 ? (
              <p className="text-sm text-kh-muted font-medium">Keine aktiven Hausübungen 🎉</p>
            ) : hwOpen === 0 ? (
              <div className="flex flex-col items-center text-center py-5">
                <span className="msym text-[34px] text-kh-green mb-1.5" style={{ fontVariationSettings: "'FILL' 1" }}>task_alt</span>
                <p className="font-bold text-[15px] text-kh-dark">Alles erledigt!</p>
                <p className="text-[13px] text-kh-muted font-medium mt-0.5">
                  {childFirst} hat {hwTotal === 1 ? 'die Hausübung' : 'alle Hausübungen'} gemacht.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {childHomework.slice(0, 5).map(hw => {
                  const due = dueInfo(dueDateFor(hw))
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
                      <div
                        className="flex items-center gap-1 text-xs font-semibold mt-0.5"
                        style={{ color: hw.done ? '#2E9C6E' : due.color }}
                        title={due.tooltip}
                      >
                        <span className="msym text-[12px]" style={{ fontVariationSettings: "'FILL' 0" }}>event</span>
                        {hw.done ? 'Erledigt' : due.label}
                      </div>
                      {hw.details && <HomeworkDetails text={hw.details} clamp={1} className="mt-1" />}
                    </div>
                    {!hw.done && due.warn && (
                      <span
                        className="msym text-[20px] flex-shrink-0"
                        title={due.tooltip}
                        style={{ fontVariationSettings: "'FILL' 1", color: due.color }}
                      >warning</span>
                    )}
                    {hw.done
                      ? <span className="msym text-kh-green text-xl flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      : <span className="text-[11px] font-bold text-[#C95040] bg-[#FDECEA] px-2 py-1 rounded-full flex-shrink-0">Offen</span>
                    }
                  </div>
                  )
                })}
              </div>
            )}
          </AnimateIn>
        </div>

        <div className="relative">
          <div className="flex flex-col gap-5 lg:bg-[#EDE9DF] lg:rounded-2xl lg:p-5 lg:sticky lg:top-7">
            <AnimateIn delay={120}>
              <AgendaPanel reminders={reminders} events={upcomingEvents} role="parent" />
            </AnimateIn>
            {/* Anwesenheit unter Terminen/Erinnerungen — nur Desktop
                (auf Mobile sitzt die Karte oben in der Hauptspalte) */}
            <AnimateIn delay={160} className="max-lg:hidden">
              <AttendanceParentCard
                childFirstName={childFirst}
                upcomingEntries={childUpcomingAbsences}
                today={todayIso}
              />
            </AnimateIn>
            <AnimateIn delay={180}>
              <ChildStatsPanel stats={childStats} childFirst={childFirst} />
            </AnimateIn>
          </div>
        </div>
      </div>
    </>
  )
}
