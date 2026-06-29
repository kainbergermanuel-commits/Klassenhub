import FeatureCard from './FeatureCard'
import AgendaPanel from './AgendaPanel'
import StudentOpenHomework from './StudentWeekHomework'
import StreakBanner from './StreakBanner'
import StreakLeaderCard, { type StreakEntry } from './StreakLeaderCard'
import type { HomeworkWithStatus, Reminder } from '@/lib/types'
import { dutyIcon } from '@/lib/dutyIcon'

interface StudentHomeProps {
  fullName: string
  userId: string
  allHomework: HomeworkWithStatus[]
  hwOpenCount: number
  hwTotal: number
  reminders: Reminder[]
  myViewedIds: string[]
  todoTotal: number
  todoDone: number
  myDuty: { name: string; partners: { full_name: string; avatar_color: string; avatar_seed: string | null; avatar_hair_color: string | null; avatar_skin_color: string | null }[] } | null
  streak: number
  confirmedStreak: number
  pendingMilestone: number | null
  streakEntries: StreakEntry[]
}

export default function StudentHome({
  fullName, userId, allHomework, hwOpenCount, hwTotal, reminders, myViewedIds, todoTotal, todoDone, myDuty, streak, confirmedStreak, pendingMilestone, streakEntries,
}: StudentHomeProps) {
  const firstName = fullName.split(' ')[0]
  const today = new Date().toLocaleDateString('de-AT', { weekday: 'long', day: 'numeric', month: 'long' })
  const hwDone = hwTotal - hwOpenCount
  const todoProgress = todoTotal > 0 ? (todoDone / todoTotal) * 100 : 0

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
        <h1 className="text-[26px] font-extrabold text-kh-dark tracking-tight">Hallo, {firstName}!</h1>
        <p className="text-sm text-kh-muted font-medium mt-1">{today}</p>
      </header>

      <div className="grid lg:grid-cols-[1fr_340px] gap-6 lg:gap-0 items-start">
        <div className="flex flex-col gap-5 min-w-0 lg:pr-6 mx-auto w-full">
          {/* Cards */}
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              <FeatureCard
                href="/hausaufgaben" gradient="blue" icon="assignment"
                title="Hausübungen"
                meta={hwTotal > 0 ? `${hwDone}/${hwTotal} erledigt` : 'Keine aktiven HÜ'}
                progress={hwTotal > 0 ? (hwDone / hwTotal) * 100 : undefined}
              />,
              <FeatureCard
                href="/todo" gradient="teal" icon="checklist"
                title="Wochen-To-Do"
                meta={todoTotal > 0 ? `${todoDone}/${todoTotal} erledigt` : 'Noch nichts gepostet'}
                progress={todoTotal > 0 ? todoProgress : undefined}
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
          <div className="hidden lg:block absolute top-0 -left-6 w-6 h-6 bg-white rounded-br-[20px]" />
          <div className="hidden lg:block absolute bottom-0 -left-6 w-6 h-6 bg-white rounded-tr-[20px]" />
          <div className="flex flex-col gap-5 lg:bg-[#EDE9DF] lg:rounded-[24px] lg:p-5 lg:sticky lg:top-7">
            <AgendaPanel reminders={reminders} role="student" userId={userId} myViewedIds={myViewedIds} />
            <StreakLeaderCard entries={streakEntries} />
          </div>
        </div>
      </div>
    </>
  )
}
