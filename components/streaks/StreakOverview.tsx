import type { Role } from '@/lib/types'
import type { QuestResult } from '@/lib/quests'
import type { AchievementCounts } from '@/lib/achievements'
import Avatar from '@/components/ui/Avatar'
import AdventureHero from '@/components/streaks/AdventureHero'
import HeldenbuchCard from '@/components/home/HeldenbuchCard'
import RucksackCard from '@/components/streaks/RucksackCard'
import WeeklyQuestCard from '@/components/home/WeeklyQuestCard'
import TeacherQuestRegie, { type RegieQuest } from '@/components/streaks/TeacherQuestRegie'
import { VETERAN_MILESTONE } from '@/lib/streak'
import type { Guild, GuildQuestResult, GuildMember } from '@/lib/guilds'
import type { GuideNote, ChronicleEntry } from '@/lib/heldenbuch'

interface StudentStreak {
  id: string
  full_name: string
  avatar_color: string
  avatar_seed: string | null
  avatar_hair_color: string | null
  avatar_skin_color: string | null
  streak: number
  pendingMilestone: number | null
}

interface Props {
  role: Role
  withStreak: StudentStreak[]
  noStreak: StudentStreak[]
  classGoal: { target: number; reward: string | null } | null
  classGoalDone: number
  currentSeason: string
  myHeldenbuch: {
    streak: number
    confirmedStreak: number
    broken: boolean
    jokerAvailable: boolean
    jokerUsedThisSeason: boolean
    crystalAvailable: boolean
    crystalUsedThisSeason: boolean
    pendingConfirmationCount: number
    nudgeSentToday: boolean
    pendingMilestone: number | null
    milestones: { milestone: number; confirmed_at: string }[]
    achievementCounts: AchievementCounts
    guideNote: GuideNote
    chronicle: ChronicleEntry[]
  } | null
  quests: QuestResult[]
  questWeekStart: string
  teacherRegie: { activeQuests: RegieQuest[]; allTemplates: { key: string; title: string }[]; isOverride: boolean } | null
  guildSection: { guild: Guild; members: GuildMember[]; quest: GuildQuestResult } | null
}

export default function StreakOverview({ role, withStreak, noStreak, classGoal, classGoalDone, currentSeason, myHeldenbuch, quests, questWeekStart, teacherRegie, guildSection }: Props) {
  return (
    <>
      {/* Welt-Einstieg — Titel, Guide UND Klassenreise in einer Card (vorher
          zwei Banner mit demselben Berg-Motiv). Guide/Portrait/Overlay leben
          hier, deshalb blenden Quest-Card + Heldenbuch ihre Theme-Duplikate aus. */}
      <AdventureHero season={currentSeason} role={role} goal={classGoal} done={classGoalDone} />

      <div className="flex flex-col gap-6">
        {(quests.length > 0 || guildSection) && (
          <WeeklyQuestCard quests={quests} weekStart={questWeekStart} season={currentSeason} guildSection={guildSection} showGuidePortrait={false} />
        )}

        {myHeldenbuch && (
          // relative z-20: hebt die Zeile über die Karten darunter, damit die
          // Rucksack-Item-Tooltips nicht verdeckt werden.
          <div className="relative z-20 grid md:grid-cols-2 gap-6 items-start">
            <HeldenbuchCard
              showArcChip={false}
              streak={myHeldenbuch.streak}
              confirmedStreak={myHeldenbuch.confirmedStreak}
              broken={myHeldenbuch.broken}
              pendingMilestone={myHeldenbuch.pendingMilestone}
              season={currentSeason}
              achievementCounts={myHeldenbuch.achievementCounts}
              guideNote={myHeldenbuch.guideNote}
              chronicle={myHeldenbuch.chronicle}
            />
            <RucksackCard
              state={{
                broken: myHeldenbuch.broken,
                jokerAvailable: myHeldenbuch.jokerAvailable,
                jokerUsedThisSeason: myHeldenbuch.jokerUsedThisSeason,
                crystalAvailable: myHeldenbuch.crystalAvailable,
                crystalUsedThisSeason: myHeldenbuch.crystalUsedThisSeason,
                pendingConfirmationCount: myHeldenbuch.pendingConfirmationCount,
                nudgeSentToday: myHeldenbuch.nudgeSentToday,
                veteranEarned: myHeldenbuch.milestones.some(m => m.milestone >= VETERAN_MILESTONE),
                confirmedStreak: myHeldenbuch.confirmedStreak,
                totalAchievements: myHeldenbuch.achievementCounts.quest + myHeldenbuch.achievementCounts.guild_quest + myHeldenbuch.achievementCounts.class_goal,
                guildName: guildSection?.guild.name ?? null,
                parentConfirmStreak: myHeldenbuch.confirmedStreak,
                nextStepHint: quests.find(q => !q.done)?.template.title ?? null,
              }}
            />
          </div>
        )}

        {teacherRegie && (
          <TeacherQuestRegie
            activeQuests={teacherRegie.activeQuests}
            allTemplates={teacherRegie.allTemplates}
            weekStart={questWeekStart}
            isOverride={teacherRegie.isOverride}
          />
        )}

        {/* Students without streak (teacher only) */}
        {role === 'teacher' && noStreak.length > 0 && (
          <div className="kh-card p-5">
            <h2 className="font-extrabold text-base text-kh-dark mb-3">Ohne aktive Streak</h2>
            <div className="flex flex-wrap gap-2">
              {noStreak.map(s => (
                <div key={s.id} className="flex items-center gap-2 bg-[#FAF8F3] rounded-xl px-3 py-2">
                  <Avatar name={s.full_name} color={s.avatar_color} seed={s.avatar_seed} hairColor={s.avatar_hair_color} skinColor={s.avatar_skin_color} size={28} />
                  <span className="text-[13px] font-semibold text-kh-muted">{s.full_name.split(' ')[0]}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
