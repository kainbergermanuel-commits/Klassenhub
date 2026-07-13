import type { Role } from '@/lib/types'
import type { QuestResult } from '@/lib/quests'
import type { AchievementCounts } from '@/lib/achievements'
import Avatar from '@/components/ui/Avatar'
import ClassGoalCard from '@/components/streaks/ClassGoalCard'
import HeldenbuchCard from '@/components/home/HeldenbuchCard'
import RucksackCard from '@/components/streaks/RucksackCard'
import WeeklyQuestCard from '@/components/home/WeeklyQuestCard'
import TeacherQuestRegie, { type RegieQuest } from '@/components/streaks/TeacherQuestRegie'
import { VETERAN_MILESTONE } from '@/lib/streak'
import type { Guild, GuildQuestResult, GuildMember } from '@/lib/guilds'

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
    pendingMilestone: number | null
    milestones: { milestone: number; confirmed_at: string }[]
    achievementCounts: AchievementCounts
  } | null
  quests: QuestResult[]
  questWeekStart: string
  teacherRegie: { activeQuests: RegieQuest[]; allTemplates: { key: string; title: string }[]; isOverride: boolean } | null
  guildSection: { guild: Guild; members: GuildMember[]; quest: GuildQuestResult } | null
}

export default function StreakOverview({ role, withStreak, noStreak, classGoal, classGoalDone, currentSeason, myHeldenbuch, quests, questWeekStart, teacherRegie, guildSection }: Props) {
  return (
    <>
      <header className="mb-6 flex items-center gap-3.5">
        <div className="w-11 h-11 max-md:w-10 max-md:h-10 rounded-2xl bg-gradient-to-br from-[#B8721E] to-[#F5C842] shadow-[0_6px_16px_rgba(20,40,45,.15)] flex items-center justify-center flex-shrink-0">
          <img src="/flame.svg" alt="" className="w-6 h-6" />
        </div>
        <div className="min-w-0">
          <h1 className="text-[25px] max-md:text-[22px] font-extrabold text-kh-dark tracking-tight leading-tight">Abenteuer</h1>
          <p className="text-[13.5px] text-kh-muted font-medium leading-tight mt-0.5">
            Klassenreise &amp; Streaks · {withStreak.length} aktive Streaks
          </p>
        </div>
      </header>

      <div className="flex flex-col gap-6">
        <ClassGoalCard role={role} goal={classGoal} done={classGoalDone} season={currentSeason} />

        {(quests.length > 0 || guildSection) && (
          <WeeklyQuestCard quests={quests} weekStart={questWeekStart} season={currentSeason} guildSection={guildSection} />
        )}

        {myHeldenbuch && (
          // relative z-20: hebt die Zeile über die Karten darunter, damit die
          // Rucksack-Item-Tooltips nicht verdeckt werden.
          <div className="relative z-20 grid md:grid-cols-2 gap-6 items-start">
            <HeldenbuchCard
              streak={myHeldenbuch.streak}
              confirmedStreak={myHeldenbuch.confirmedStreak}
              broken={myHeldenbuch.broken}
              jokerAvailable={myHeldenbuch.jokerAvailable}
              jokerUsedThisSeason={myHeldenbuch.jokerUsedThisSeason}
              pendingMilestone={myHeldenbuch.pendingMilestone}
              milestones={myHeldenbuch.milestones}
              season={currentSeason}
              achievementCounts={myHeldenbuch.achievementCounts}
              showEmblem={false}
            />
            <RucksackCard
              state={{
                broken: myHeldenbuch.broken,
                jokerAvailable: myHeldenbuch.jokerAvailable,
                jokerUsedThisSeason: myHeldenbuch.jokerUsedThisSeason,
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
