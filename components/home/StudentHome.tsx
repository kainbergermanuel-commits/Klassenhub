import FeatureCard from './FeatureCard'
import TermineCard, { type NextEvent } from './TermineCard'
import AgendaPanel from './AgendaPanel'
import StudentOpenHomework from './StudentWeekHomework'
import StreakBanner from './StreakBanner'
import StreakLeaderCard, { type StreakEntry } from './StreakLeaderCard'
import type { HomeworkWithStatus, Reminder } from '@/lib/types'
import { dutyIcon } from '@/lib/dutyIcon'
import { greeting } from '@/lib/date'

interface StudentHomeProps {
  fullName: string
  userId: string
  allHomework: HomeworkWithStatus[]
  hwOpenCount: number
  hwTotal: number
  reminders: Reminder[]
  myViewedIds: string[]
  nextEvent: NextEvent | null
  moreEventCount: number
  myDuty: { name: string; partners: { full_name: string; avatar_color: string; avatar_seed: string | null; avatar_hair_color: string | null; avatar_skin_color: string | null }[] } | null
  streak: number
  confirmedStreak: number
  pendingMilestone: number | null
  streakEntries: StreakEntry[]
}

export default function StudentHome({
  fullName, userId, allHomework, hwOpenCount, hwTotal, reminders, myViewedIds, nextEvent, moreEventCount, myDuty, streak, confirmedStreak, pendingMilestone, streakEntries,
}: StudentHomeProps) {
  const firstName = fullName.split(' ')[0]
  const today = new Date().toLocaleDateString('de-AT', { weekday: 'long', day: 'numeric', month: 'long' })
  const hwDone = hwTotal - hwOpenCount

  // Duty week day pills
  const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr']
  const now = new Date()
  const nowDay = now.getDay() // 0=Sun,1=Mon,...
  const nowMins = now.getHours() * 60 + now.getMinutes()
  const DONE_MINS = 13 * 60 + 35
  const dutyDayFooter = myDuty ? (
    <div className="flex gap-1.5">
      {DAYS.map((label, i) => {
        const weekDay = i + 1 // Mon=1...Fri=5
        const isDone = nowDay > weekDay || (nowDay === weekDay && nowMins >= DONE_MINS)
        const isToday = nowDay === weekDay
        return (
          <div
            key={label}
            className="flex-1 rounded-lg py-1 flex items-center justify-center"
            style={{ background: isDone ? 'rgba(255,255,255,0.08)' : isToday ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.15)' }}
          >
            <span className="text-[10px] font-bold" style={{ color: isDone ? 'rgba(255,255,255,0.35)' : 'white' }}>{label}</span>
          </div>
        )
      })}
    </div>
  ) : null

  return (
    <>
      <header className="mb-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 max-md:pr-16">
            <div className="md:hidden w-10 h-10 rounded-2xl gradient-teal shadow-[0_6px_16px_rgba(20,40,45,.15)] flex items-center justify-center flex-shrink-0">
              <span className="msym text-[22px] text-white" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
            </div>
            <h1 className="text-[26px] max-md:text-[22px] font-extrabold text-kh-dark tracking-tight min-w-0">{greeting()}, {firstName}!</h1>
          </div>
        </div>
        <p className="text-sm text-kh-muted font-medium mt-1">{today}</p>
      </header>

      <div className="grid lg:grid-cols-[1fr_340px] gap-6 lg:gap-0 items-start">
        <div className="flex flex-col gap-5 min-w-0 lg:pr-6 mx-auto w-full">
          {/* Cards — auf Mobile ausgeblendet (Stats wandern in den Header) */}
          <div className="grid sm:grid-cols-3 gap-4 max-md:hidden">
            {[
              <FeatureCard
                href="/hausaufgaben" gradient="amber" icon="assignment"
                title="Hausübungen"
                meta={hwTotal > 0 ? `${hwDone}/${hwTotal} erledigt` : 'Keine aktiven HÜ'}
                progress={hwTotal > 0 ? (hwDone / hwTotal) * 100 : undefined}
              />,
              <FeatureCard
                href="/dienste" gradient="violet" icon={myDuty ? dutyIcon(myDuty.name) : 'cleaning_services'}
                title={myDuty ? `Dienst: ${myDuty.name}` : 'Dienste'}
                meta={myDuty
                  ? (myDuty.partners.length > 0 ? `mit ${myDuty.partners.map(p => p.full_name.split(' ')[0]).join(', ')}` : 'Diese Woche · Mo–Fr')
                  : 'Diese Woche kein Dienst'}
                people={myDuty?.partners}
                peopleInline
                footer={dutyDayFooter}
              />,
              <TermineCard nextEvent={nextEvent} moreCount={moreEventCount} />,
            ].map((card, i) => (
              <div key={i} className="animate-card-enter h-full" style={{ animationDelay: `${i * 60}ms` }}>
                {card}
              </div>
            ))}
          </div>

          {/* Streak */}
          <div className="animate-card-enter" style={{ animationDelay: '180ms' }}>
            <StreakBanner streak={streak} confirmedStreak={confirmedStreak} pendingMilestone={pendingMilestone} />
          </div>

          {/* Open homework — all, sorted by urgency */}
          <div className="animate-card-enter" style={{ animationDelay: '240ms' }}>
            <StudentOpenHomework homework={allHomework} userId={userId} />
          </div>
        </div>

        <div className="relative">
          <div className="hidden lg:block absolute top-0 -left-6 w-6 h-6 bg-white rounded-br-2xl" />
          <div className="hidden lg:block absolute bottom-0 -left-6 w-6 h-6 bg-white rounded-tr-2xl" />
          <div className="flex flex-col gap-5 lg:bg-[#EDE9DF] lg:rounded-2xl lg:p-5 lg:sticky lg:top-7">
            <div className="animate-card-enter" style={{ animationDelay: '120ms' }}>
              <AgendaPanel reminders={reminders} role="student" userId={userId} myViewedIds={myViewedIds} />
            </div>
            <div className="animate-card-enter" style={{ animationDelay: '180ms' }}>
              <StreakLeaderCard entries={streakEntries} />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
