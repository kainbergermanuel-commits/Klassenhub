import Link from 'next/link'
import { getSeasonTheme, currentStageIndex, GUIDE_PORTRAIT } from '@/lib/seasonTheme'
import { SEASON_ART } from '@/components/streaks/seasonArt'
import { daysUntilLabel } from '@/lib/date'
import { eventCategoryMeta } from '@/lib/eventCategories'
import type { QuestResult } from '@/lib/quests'
import type { AgendaEvent } from '@/lib/types'

interface Props {
  season: string
  classGoal: { target: number; reward: string | null } | null
  classGoalDone: number
  quests: QuestResult[]
  upcomingEvents: AgendaEvent[]
}

/** Story-Hero für die Startseite: Guide-Portrait (oder Platzhalter-Icon,
 *  falls noch keine Illustration existiert), Etappen-Story-Text und ein
 *  paar query-günstige Kennzahlen — alles aus bereits geladenen Daten
 *  (`classGoal`/`quests`/`upcomingEvents`), keine neue Query.
 *  Ersetzt auf der Startseite `ClassGoalBadge`; `/streaks` bleibt bei
 *  `SeasonJourney` (eigene, ausführlichere Darstellung). */
export default function StoryHeroCard({ season, classGoal, classGoalDone, quests, upcomingEvents }: Props) {
  const theme = getSeasonTheme(season)
  const pct = classGoal ? Math.min(100, Math.round((classGoalDone / classGoal.target) * 100)) : 0
  const activeStage = currentStageIndex(pct, theme.stages.length)
  const stage = theme.stages[activeStage]
  const Art = SEASON_ART[theme.icon]
  const portrait = GUIDE_PORTRAIT[theme.icon]

  const questsDone = quests.filter(q => q.done).length
  const nextEvent = upcomingEvents[0] ?? null
  // upcomingEvents kommt via `.gte('end_date', today)` — der erste Termin kann
  // also bereits laufen (Start in der Vergangenheit). daysUntilLabel gäbe dann
  // "Vorbei" zurück, was hier falsch wäre → auf "läuft gerade" mappen.
  const rawWhen = nextEvent ? daysUntilLabel(nextEvent.start_date) : ''
  const eventWhen = rawWhen === 'Vorbei' ? 'läuft gerade' : rawWhen
  const nextEventLabel = nextEvent
    ? (eventWhen.startsWith('in ') ? `Termin ${eventWhen}` : `Termin: ${eventWhen}`)
    : ''

  const pills = (
    <div className="relative px-5 pb-4 pt-1 flex flex-wrap justify-end gap-1.5">
      {classGoal && (
        <Pill icon={theme.icon} iconColor="#B9791A" label={`${pct}% Ziel`}>
          <TooltipHead>Klassenziel</TooltipHead>
          <TooltipBody>
            {classGoalDone} von {classGoal.target} Hausübungen diese Season eltern-bestätigt erledigt. Bei 100&nbsp;% schaltet die nächste Etappe der {theme.name} frei.
          </TooltipBody>
        </Pill>
      )}
      {quests.length > 0 && (
        <Pill icon="task_alt" iconColor="#0F8A82" label={`${questsDone}/${quests.length} Quests`}>
          <TooltipHead>Wochen-Quests</TooltipHead>
          <TooltipBody>
            {questsDone} von {quests.length} Quests diese Woche geschafft. Neue Woche, neue Quests — im Abenteuer-Bereich siehst du alle Details und deine Wahlpfade.
          </TooltipBody>
        </Pill>
      )}
      {nextEvent && (
        <Pill icon="event" iconColor="#5965B8" label={nextEventLabel}>
          <TooltipHead>{eventCategoryMeta(nextEvent.category).label}</TooltipHead>
          <TooltipBody>
            {nextEvent.title} · {eventWhen}
            {!nextEvent.all_day && nextEvent.start_time ? ` · ${nextEvent.start_time}` : ''}
          </TooltipBody>
        </Pill>
      )}
    </div>
  )

  if (portrait) {
    return (
      <Link
        href="/streaks"
        className="relative z-20 flex items-stretch rounded-2xl shadow-[0_8px_16px_rgba(20,40,45,.10)] hover:shadow-lg transition-shadow duration-200"
      >
        {/* Hintergrund-Ebene — eigenes Overflow-Clipping, damit Vala oben drüber ragen kann */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden bg-gradient-to-br from-[#EFEAE0] to-[#FAF8F3]">
          {Art && (
            <div className="absolute inset-0 pointer-events-none select-none">
              <Art />
            </div>
          )}
        </div>

        {/* Guide-Portrait — nimmt den linken Bereich der Card ein, Kopf ragt bewusst über den Kartenrand.
            Min-/Max-Breite + Überstand auf Mobile kleiner, sonst nimmt Vala auf schmalen
            Screens proportional zu viel Platz ein und drängt Text/Pillen in den Umbruch. */}
        <div className="relative z-10 w-[38%] min-w-[92px] max-w-[160px] sm:w-[42%] sm:min-w-[130px] sm:max-w-[220px] flex-shrink-0 self-stretch pointer-events-none">
          <img
            src={portrait}
            alt={theme.guide}
            className="absolute -top-5 left-[-6px] w-[110%] h-[calc(100%+20px)] sm:-top-9 sm:left-[-14px] sm:w-[122%] sm:h-[calc(100%+36px)] object-contain object-bottom"
          />
        </div>

        <div className="relative z-10 flex-1 min-w-0 flex flex-col justify-center">
          <div className="px-4 pt-5 pb-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-kh-muted">
              {theme.name} · {theme.guide} · Etappe {activeStage + 1} von {theme.stages.length}
            </p>
            <p className="mt-1.5 text-[13.5px] text-kh-dark leading-snug italic">
              {stage.story}
            </p>
          </div>
          {pills}
        </div>
      </Link>
    )
  }

  return (
    <Link
      href="/streaks"
      className="relative z-20 block rounded-2xl overflow-hidden bg-gradient-to-br from-[#EFEAE0] to-[#FAF8F3] shadow-[0_8px_16px_rgba(20,40,45,.10)] hover:shadow-lg transition-shadow duration-200"
    >
      {Art && (
        <div className="absolute inset-0 pointer-events-none select-none">
          <Art />
        </div>
      )}

      <div className="relative px-5 pt-5 pb-4 flex items-start gap-3.5">
        <div
          className="w-14 h-14 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-[0_4px_12px_rgba(20,40,45,.15)]"
          style={{ background: 'linear-gradient(135deg, #E8A020, #F5C842)' }}
        >
          <svg viewBox="0 0 40 40" className="w-9 h-9" aria-hidden="true">
            <circle cx="20" cy="21" r="13" fill="#FFF8E8" stroke="#B9791A" strokeWidth="2" />
            <circle cx="15.5" cy="19" r="2.2" fill="#16292E" />
            <circle cx="24.5" cy="19" r="2.2" fill="#16292E" />
            <path d="M15 25q5 3.5 10 0" stroke="#16292E" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M20 8q4-6 11-6q-2 6-8 8" fill="#B9791A" />
          </svg>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wide text-kh-muted">
            {theme.name} · {theme.guide} · Etappe {activeStage + 1} von {theme.stages.length}
          </p>
          <p className="mt-1.5 text-[13.5px] text-kh-dark leading-snug italic">
            {stage.story}
          </p>
        </div>
      </div>

      {pills}
    </Link>
  )
}

function Pill({ icon, iconColor, label, children }: { icon: string; iconColor: string; label: string; children: React.ReactNode }) {
  return (
    <span className="relative group/pill">
      <span className="inline-flex items-center gap-1.5 bg-white/60 backdrop-blur-sm px-2.5 py-1 rounded-full text-[11.5px] font-bold text-kh-dark cursor-default hover:bg-white/80 transition-colors">
        <span className="msym text-[14px]" style={{ color: iconColor, fontVariationSettings: "'FILL' 1" }}>{icon}</span>
        {label}
      </span>
      <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-20 hidden group-hover/pill:block w-max max-w-[220px] bg-white rounded-xl shadow-[0_8px_20px_rgba(20,40,45,.22)] p-2.5 text-left">
        {children}
      </span>
    </span>
  )
}

function TooltipHead({ children }: { children: React.ReactNode }) {
  return <span className="block text-[10.5px] font-bold uppercase tracking-wide text-kh-muted mb-1">{children}</span>
}

function TooltipBody({ children }: { children: React.ReactNode }) {
  return <span className="block text-[12px] font-medium text-kh-dark leading-snug">{children}</span>
}
