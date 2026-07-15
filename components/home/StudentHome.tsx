import AgendaPanel from './AgendaPanel'
import StudentOpenHomework from './StudentWeekHomework'
import StoryHeroCard from './StoryHeroCard'
import WeeklyQuestCard from './WeeklyQuestCard'
import HeldenbuchCard from './HeldenbuchCard'
import DutyModule from './DutyModule'
import type { HomeworkWithStatus, Reminder, AgendaEvent } from '@/lib/types'
import type { QuestResult } from '@/lib/quests'
import type { Guild, GuildQuestResult, GuildMember } from '@/lib/guilds'
import type { AchievementCounts } from '@/lib/achievements'
import type { RucksackState } from '@/components/streaks/RucksackItems'
import type { GuideNote, ChronicleEntry } from '@/lib/heldenbuch'
import { greeting } from '@/lib/date'

interface DutyPartner {
  full_name: string
  avatar_color: string
  avatar_seed: string | null
  avatar_hair_color: string | null
  avatar_skin_color: string | null
}

interface StudentHomeProps {
  fullName: string
  userId: string
  classId: string
  allHomework: HomeworkWithStatus[]
  reminders: Reminder[]
  myViewedIds: string[]
  upcomingEvents: AgendaEvent[]
  myDuty: { id: string; name: string; partners: DutyPartner[]; doneWeekdays: number[] } | null
  streak: number
  confirmedStreak: number
  broken: boolean
  pendingMilestone: number | null
  classGoal: { target: number; reward: string | null } | null
  classGoalDone: number
  season: string
  quests: QuestResult[]
  questWeekStart: string
  /** Anteil der Klasse mit mind. 1 Erledigung diese Woche, anonym (keine Namen). `null` = zu kleine Klasse. */
  socialProofPct: number | null
  guideNote: GuideNote
  noteGuideIcon: string
  preferredGuideIcon: string | null
  chronicle: ChronicleEntry[]
  guildSection: { guild: Guild; members: GuildMember[]; quest: GuildQuestResult } | null
  achievementCounts: AchievementCounts
  rucksack: RucksackState
}

export default function StudentHome({
  fullName, userId, classId, allHomework, reminders, myViewedIds, upcomingEvents, myDuty, streak, confirmedStreak, broken, pendingMilestone, classGoal, classGoalDone, season, quests, questWeekStart, socialProofPct, guideNote, noteGuideIcon, preferredGuideIcon, chronicle, guildSection, achievementCounts, rucksack,
}: StudentHomeProps) {
  const firstName = fullName.split(' ')[0]
  const today = new Date().toLocaleDateString('de-AT', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <>
      <header className="mb-6">
        <div className="flex items-center gap-3 min-w-0 max-md:pr-16">
          <div className="md:hidden w-10 h-10 rounded-2xl gradient-teal shadow-[0_6px_16px_rgba(20,40,45,.15)] flex items-center justify-center flex-shrink-0">
            <span className="msym text-[22px] text-white" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
          </div>
          <h1 className="text-[26px] max-md:text-[22px] font-extrabold text-kh-dark tracking-tight min-w-0">{greeting()}, {firstName}!</h1>
        </div>
        <p className="text-sm text-kh-muted font-medium mt-1">{today}</p>
      </header>

      <div className="grid lg:grid-cols-[1fr_340px] gap-6 lg:gap-0 items-start">
        <div className="flex flex-col gap-5 min-w-0 lg:pr-6 mx-auto w-full">
          {/* Story-Hero: Etappe, Guide-Text, Maskottchen-Platzhalter */}
          {/* relative z-20: eigener Stacking-Context durch animate-card-enter (transform in
              fill-mode 'both'), sonst würden Tooltips/Vala-Überstand von Karten darunter verdeckt */}
          <div className="relative z-20 animate-card-enter" style={{ animationDelay: '30ms' }}>
            <StoryHeroCard season={season} classGoal={classGoal} classGoalDone={classGoalDone} quests={quests} upcomingEvents={upcomingEvents} />
          </div>

          {/* Wochen-Quests (inkl. Gilden-Quest als Block) */}
          <div className="animate-card-enter" style={{ animationDelay: '60ms' }}>
            <WeeklyQuestCard quests={quests} weekStart={questWeekStart} season={season} showGuidePortrait={false} guildSection={guildSection} />
          </div>

          {socialProofPct !== null && (
            <div className="animate-card-enter flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-[#F0FAF9] border border-kh-teal/20" style={{ animationDelay: '90ms' }}>
              <span className="msym text-[18px] text-kh-teal flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>groups</span>
              <p className="text-[13px] font-semibold text-kh-dark">
                {socialProofPct}&nbsp;% deiner Klasse sind diese Woche schon dabei — schließ dich an!
              </p>
            </div>
          )}

          {/* Open homework — all, sorted by urgency */}
          <div className="animate-card-enter" style={{ animationDelay: '240ms' }}>
            <StudentOpenHomework homework={allHomework} userId={userId} />
          </div>
        </div>

        <div className="relative">
          <div className="flex flex-col gap-5 lg:bg-[#EDE9DF] lg:rounded-2xl lg:p-5 lg:sticky lg:top-7">
            <div className="animate-card-enter" style={{ animationDelay: '120ms' }}>
              <AgendaPanel reminders={reminders} events={upcomingEvents} role="student" userId={userId} classId={classId} myViewedIds={myViewedIds} />
            </div>
            {myDuty && (
              <div className="animate-card-enter" style={{ animationDelay: '150ms' }}>
                <DutyModule dutyId={myDuty.id} dutyName={myDuty.name} partners={myDuty.partners} doneWeekdays={myDuty.doneWeekdays} />
              </div>
            )}
            <div className="relative z-10 animate-card-enter" style={{ animationDelay: '180ms' }}>
              <HeldenbuchCard streak={streak} confirmedStreak={confirmedStreak} broken={broken} pendingMilestone={pendingMilestone} season={season} achievementCounts={achievementCounts} guideNote={guideNote} noteGuideIcon={noteGuideIcon} preferredGuideIcon={preferredGuideIcon} chronicle={chronicle} rucksack={rucksack} />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
