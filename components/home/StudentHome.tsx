import AgendaPanel from './AgendaPanel'
import StudentOpenHomework from './StudentWeekHomework'
import StoryHeroCard from './StoryHeroCard'
import WeeklyQuestCard from './WeeklyQuestCard'
import RiddleList from './RiddleList'
import WeekPulse from './WeekPulse'
import HeldenbuchCard from './HeldenbuchCard'
import NewItemAnnounce from '@/components/streaks/NewItemAnnounce'
import DutyModule from './DutyModule'
import AnimateIn from '@/components/ui/AnimateIn'
import type { HomeworkWithStatus, Reminder, AgendaEvent } from '@/lib/types'
import type { QuestResult } from '@/lib/quests'
import type { Guild, GuildQuestResult, GuildMember } from '@/lib/guilds'
import type { AchievementCounts } from '@/lib/achievements'
import type { RucksackState } from '@/lib/rucksack'
import type { GuideNote, ChronicleEntry } from '@/lib/heldenbuch'
import type { Riddle } from '@/lib/riddles'
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
  /** Gesamtzahl bevorstehender Termine (upcomingEvents ist auf sechs begrenzt). */
  upcomingEventCount: number
  myDuties: { id: string; name: string; partners: DutyPartner[]; doneWeekdays: number[] }[]
  dutyConfirmableUntil: number
  isPreview: boolean
  streak: number
  confirmedStreak: number
  broken: boolean
  pendingMilestone: number | null
  /** `isSuggested` = berechneter Vorschlag statt gesetztem Ziel (siehe
   *  lib/classGoal.ts suggestGoalTarget). */
  classGoal: { target: number; reward: string | null; isSuggested?: boolean } | null
  classGoalDone: number
  season: string
  quests: QuestResult[]
  questWeekStart: string
  /** Interaktive Rätsel (Arc-Item der aktiven Welt + ggf. Splitter-Rätsel). */
  riddles: { riddle: Riddle; solved: boolean }[]
  /** Wochen-Puls: kollektiver Sammel-Wert + Momentum statt statischer %-Norm
   *  (siehe WeekPulse.tsx). `null` = zu kleine Klasse. */
  weekPulse: { total: number; today: number } | null
  guideNote: GuideNote
  noteGuideIcon: string
  preferredGuideIcon: string | null
  chronicle: ChronicleEntry[]
  guildSection: { guild: Guild; members: GuildMember[]; quest: GuildQuestResult } | null
  achievementCounts: AchievementCounts
  rucksack: RucksackState
}

export default function StudentHome({
  fullName, userId, classId, allHomework, reminders, myViewedIds, upcomingEvents, upcomingEventCount, myDuties, dutyConfirmableUntil, isPreview, streak, confirmedStreak, broken, pendingMilestone, classGoal, classGoalDone, season, quests, questWeekStart, riddles, weekPulse, guideNote, noteGuideIcon, preferredGuideIcon, chronicle, guildSection, achievementCounts, rucksack,
}: StudentHomeProps) {
  const firstName = fullName.split(' ')[0]
  const today = new Date().toLocaleDateString('de-AT', { weekday: 'long', day: 'numeric', month: 'long' })
  // Kontextabhängige Reihenfolge (Manuels Entscheidung): offene HÜ = Dringlichkeit
  // vor Motivation, Hausübungen-Karte springt an die erste Stelle (Desktop UND
  // Mobile — ein einheitliches Prinzip statt getrennter Regeln pro Breakpoint).
  // Alles erledigt: die bisherige Reihenfolge bleibt, Abenteuer darf motivieren.
  const hasOpenHomework = allHomework.some(h => !h.done)

  return (
    <>
      {/* Erwerbs-Moment für neu gefundene Rucksack-Zeichen — bewusst nur hier
          auf der Startseite (nicht zusätzlich auf /streaks), damit die Übergabe
          nicht doppelt auftaucht. */}
      <NewItemAnnounce state={rucksack} />

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
          <AnimateIn delay={30} className="relative z-20">
            <StoryHeroCard season={season} classGoal={classGoal} classGoalDone={classGoalDone} quests={quests} upcomingEvents={upcomingEvents} />
          </AnimateIn>

          {/* Wochen-Quests (inkl. Gilden-Quest als Block) */}
          <AnimateIn delay={60}>
            <WeeklyQuestCard quests={quests} weekStart={questWeekStart} season={season} showGuidePortrait={false} guildSection={guildSection} />
          </AnimateIn>

          {/* Interaktive Rätsel: Arc-Item + ggf. Splitter (Neugier + Nochmal-Lesen).
              Bedingung bewusst AUSSEN: RiddleList returned bei leerer Liste null,
              der AnimateIn-Wrapper-div bliebe aber stehen und erzeugte im
              flex-col gap-5 eine doppelte Lücke. */}
          {riddles.length > 0 && (
            <AnimateIn delay={75}>
              <RiddleList riddles={riddles} />
            </AnimateIn>
          )}

          {weekPulse !== null && (
            <AnimateIn delay={90}>
              <WeekPulse total={weekPulse.total} today={weekPulse.today} />
            </AnimateIn>
          )}

          {/* Open homework — all, sorted by urgency. Springt an die erste
              Stelle, sobald etwas offen ist (Dringlichkeit vor Motivation) —
              beide Karten sitzen im selben Flex-Container, daher reicht die
              order-Utility ohne DOM-Umbau. Alles erledigt: bisherige Position
              (nach Abenteuer/Quests/Rätsel) bleibt. */}
          <AnimateIn delay={hasOpenHomework ? 15 : 240} className={hasOpenHomework ? 'order-first' : ''}>
            <StudentOpenHomework homework={allHomework} userId={userId} season={season} />
          </AnimateIn>
        </div>

        <div className="relative">
          <div className="flex flex-col gap-5 lg:bg-[#EDE9DF] lg:rounded-2xl lg:p-5 lg:sticky lg:top-7">
            <AnimateIn delay={120}>
              <AgendaPanel reminders={reminders} events={upcomingEvents} eventCount={upcomingEventCount} role="student" userId={userId} classId={classId} myViewedIds={myViewedIds} />
            </AnimateIn>
            {myDuties.length > 0 && (
              <AnimateIn delay={150}>
                <DutyModule duties={myDuties} confirmableUntil={dutyConfirmableUntil} preview={isPreview} />
              </AnimateIn>
            )}
            <AnimateIn delay={180} className="relative z-10">
              <HeldenbuchCard streak={streak} confirmedStreak={confirmedStreak} broken={broken} pendingMilestone={pendingMilestone} season={season} achievementCounts={achievementCounts} guideNote={guideNote} noteGuideIcon={noteGuideIcon} preferredGuideIcon={preferredGuideIcon} chronicle={chronicle} awakenedSigns={rucksack.awakenedSignCount} rucksack={rucksack} />
            </AnimateIn>
          </div>
        </div>
      </div>
    </>
  )
}
