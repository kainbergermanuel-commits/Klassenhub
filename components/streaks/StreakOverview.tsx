import type { Role } from '@/lib/types'
import type { QuestResult } from '@/lib/quests'
import type { AchievementCounts } from '@/lib/achievements'
import Avatar from '@/components/ui/Avatar'
import AdventureHero from '@/components/streaks/AdventureHero'
import HeldenbuchCard from '@/components/home/HeldenbuchCard'
import RucksackCard from '@/components/streaks/RucksackCard'
import WeeklyQuestCard from '@/components/home/WeeklyQuestCard'
import RiddleList from '@/components/home/RiddleList'
import TeacherAdventurePanel, { type AdventureData } from '@/components/streaks/TeacherAdventurePanel'
import ChildAdventureStats, { type ChildAdventureData } from '@/components/streaks/ChildAdventureStats'
import AnimateIn from '@/components/ui/AnimateIn'
import { VETERAN_MILESTONE } from '@/lib/streak'
import type { Riddle } from '@/lib/riddles'
import { getSeasonTheme, splitterFound, awakenedSignCount } from '@/lib/seasonTheme'
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
  /** Nur für die Lehrer-Karte "Ohne aktive Streak" — die frühere
   *  withStreak-Rangliste wurde 2026-07-13 bewusst entfernt (Leaderboard-
   *  Evidenz), der Prop dazu ist inzwischen ebenfalls weg. */
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
    noteGuideIcon: string
    preferredGuideIcon: string | null
    chronicle: ChronicleEntry[]
  } | null
  quests: QuestResult[]
  questWeekStart: string
  /** Interaktive Rätsel (Arc-Item + ggf. Splitter) — dieselbe Liste wie Start. */
  riddles: { riddle: Riddle; solved: boolean }[]
  guildSection: { guild: Guild; members: GuildMember[]; quest: GuildQuestResult } | null
  /** Quests/HÜ/Rätsel dieser Woche — für Lehrpersonen die ganze Klasse
   *  (mehrere Zeilen), für Eltern bereits server-seitig auf das eigene Kind
   *  gefiltert (nie mehr als ein Eintrag). Für Schüler:innen leer. */
  adventureStats: {
    id: string
    full_name: string
    avatar_color: string
    avatar_seed: string | null
    avatar_hair_color: string | null
    avatar_skin_color: string | null
    questsDone: number
    questsTotal: number
    hwConfirmed: number
    riddlesSolved: number
  }[]
  /** Volles Lehrer-Dashboard (nur Lehrerrolle) — ersetzt für Lehrpersonen die
   *  AdventureStatsCard + „Ohne aktive Streak". Für Schüler/Eltern null. */
  teacherAdventure: AdventureData | null
  /** „Du/Ihr Kind & die Klasse" (Schüler + Eltern) — dezenter Klassenbezug.
   *  Für Lehrer null. */
  childAdventure: ChildAdventureData | null
}

export default function StreakOverview({ role, noStreak, classGoal, classGoalDone, currentSeason, myHeldenbuch, quests, questWeekStart, riddles, guildSection, adventureStats, teacherAdventure, childAdventure }: Props) {
  const currentThemeName = getSeasonTheme(currentSeason).name
  return (
    <>
      {/* Welt-Einstieg — Titel, Guide UND Klassenreise in einer Card (vorher
          zwei Banner mit demselben Berg-Motiv). Guide/Portrait/Overlay leben
          hier, deshalb blenden Quest-Card + Heldenbuch ihre Theme-Duplikate aus. */}
      <AdventureHero season={currentSeason} role={role} goal={classGoal} done={classGoalDone} />

      <div className="flex flex-col gap-6">
        {/* Bedingungen bewusst AUSSEN am AnimateIn: die Karten returnen bei
            leeren Daten null, der Wrapper-div bliebe aber stehen und erzeugte
            im flex-col gap-6 eine doppelte Lücke. */}
        {role === 'teacher' && teacherAdventure && (
          <AnimateIn delay={0}>
            <TeacherAdventurePanel data={teacherAdventure} />
          </AnimateIn>
        )}

        {role === 'parent' && childAdventure && (
          <AnimateIn delay={0}>
            <ChildAdventureStats data={childAdventure} />
          </AnimateIn>
        )}

        {(quests.length > 0 || guildSection) && (
          <AnimateIn delay={30}>
            <WeeklyQuestCard quests={quests} weekStart={questWeekStart} season={currentSeason} guildSection={guildSection} showGuidePortrait={false} />
          </AnimateIn>
        )}

        {riddles.length > 0 && (
          <AnimateIn delay={60}>
            <RiddleList riddles={riddles} />
          </AnimateIn>
        )}

        {role === 'student' && childAdventure && (
          <AnimateIn delay={75}>
            <ChildAdventureStats data={childAdventure} />
          </AnimateIn>
        )}

        {myHeldenbuch && (
          // relative z-20: hebt die Zeile über die Karten darunter, damit die
          // Rucksack-Item-Tooltips nicht verdeckt werden.
          <AnimateIn delay={90} className="relative z-20 grid md:grid-cols-2 gap-6 items-start">
            <HeldenbuchCard
              showArcChip={false}
              streak={myHeldenbuch.streak}
              confirmedStreak={myHeldenbuch.confirmedStreak}
              broken={myHeldenbuch.broken}
              pendingMilestone={myHeldenbuch.pendingMilestone}
              season={currentSeason}
              achievementCounts={myHeldenbuch.achievementCounts}
              guideNote={myHeldenbuch.guideNote}
              noteGuideIcon={myHeldenbuch.noteGuideIcon}
              preferredGuideIcon={myHeldenbuch.preferredGuideIcon}
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
                splitterFound: splitterFound(currentThemeName),
                awakenedSignCount: awakenedSignCount(currentThemeName),
              }}
            />
          </AnimateIn>
        )}

        {/* Students without streak — nur als Fallback, wenn das volle Lehrer-
            Dashboard fehlt (das Panel hat die „noch nicht gestartet"-Gruppe). */}
        {role === 'teacher' && !teacherAdventure && noStreak.length > 0 && (
          <AnimateIn delay={120} className="kh-card p-5">
            <h2 className="font-extrabold text-base text-kh-dark mb-3">Ohne aktive Streak</h2>
            <div className="flex flex-wrap gap-2">
              {noStreak.map(s => (
                <div key={s.id} className="flex items-center gap-2 bg-[#FAF8F3] rounded-xl px-3 py-2">
                  <Avatar name={s.full_name} color={s.avatar_color} seed={s.avatar_seed} hairColor={s.avatar_hair_color} skinColor={s.avatar_skin_color} size={28} />
                  <span className="text-[13px] font-semibold text-kh-muted">{s.full_name.split(' ')[0]}</span>
                </div>
              ))}
            </div>
          </AnimateIn>
        )}
      </div>
    </>
  )
}
