import Link from 'next/link'
import FeatureCard from './FeatureCard'
import TermineCard from './TermineCard'
import AgendaPanel from './AgendaPanel'
import StreakLeaderCard, { type StreakEntry } from './StreakLeaderCard'
import ParentHwConfirmList, { type PendingConfirmation } from './ParentHwConfirmList'
import ClassGoalBadge from './ClassGoalBadge'
import Avatar from '@/components/ui/Avatar'
import type { HomeworkWithStatus, Reminder, AgendaEvent } from '@/lib/types'
import { flameCount } from '@/lib/streak'
import { greeting } from '@/lib/date'

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
  /** Eigener Streak des Kindes – sofort sichtbar (auch unbestätigt). Bestimmt die Zahl. */
  childStreak: number
  /** Eltern-bestätigter Streak des Kindes – verdient die Flammen (Live-Spiegel). */
  childConfirmedStreak: number
  pendingConfirmations: PendingConfirmation[]
  streakEntries: StreakEntry[]
  classGoal: { target: number; reward: string | null } | null
  classGoalDone: number
}

export default function ParentHome({
  fullName, childName, childColor, childSeed, childHairColor, childSkinColor, className, childHomework, reminders, upcomingEvents, childStreak, childConfirmedStreak, pendingConfirmations, streakEntries, classGoal, classGoalDone,
}: ParentHomeProps) {
  const childFirst = childName.split(' ')[0]
  const childNameSize = childName.length > 16 ? 'text-[13px]' : childName.length > 11 ? 'text-[15px]' : 'text-[17px]'
  const today = new Date().toLocaleDateString('de-AT', { weekday: 'long', day: 'numeric', month: 'long' })
  const hwTotal = childHomework.length
  const hwOpen = childHomework.filter(h => !h.done).length
  const hwDone = hwTotal - hwOpen

  return (
    <>
      <header className="mb-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 max-md:pr-16">
            <div className="md:hidden w-10 h-10 rounded-2xl gradient-teal shadow-[0_6px_16px_rgba(20,40,45,.15)] flex items-center justify-center flex-shrink-0">
              <span className="msym text-[22px] text-white" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
            </div>
            <h1 className="text-[26px] max-md:text-[22px] font-extrabold text-kh-dark tracking-tight min-w-0">{greeting()}, Familie {fullName.split(' ').slice(-1)[0]}!</h1>
          </div>
          <ClassGoalBadge goal={classGoal} done={classGoalDone} className="max-md:hidden" />
        </div>
        <p className="text-sm text-kh-muted font-medium mt-1">{today} · {childFirst}, {className}</p>
      </header>

      {/* Child banner */}
      <div className="rounded-[20px] p-[18px] text-white flex items-center gap-3.5 mb-6 relative overflow-hidden" style={{ background: 'linear-gradient(to right, #3D5452 0%, #2A3E3B 100%)' }}>
        <svg viewBox="0 0 400 80" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 w-full h-full pointer-events-none select-none" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="parentFade" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#2A3E3B" stopOpacity="1" />
              <stop offset="40%" stopColor="#2A3E3B" stopOpacity="0" />
            </linearGradient>
            <mask id="parentMask">
              <rect width="400" height="80" fill="white" />
              <rect width="400" height="80" fill="url(#parentFade)" />
            </mask>
            {/* Dot fade: right=visible, left=transparent */}
            <linearGradient id="dotFade" x1="1" y1="0" x2="0" y2="0">
              <stop offset="0%" stopColor="white" stopOpacity="1" />
              <stop offset="60%" stopColor="white" stopOpacity="0" />
            </linearGradient>
            <mask id="dotMask">
              <rect width="400" height="80" fill="url(#dotFade)" />
            </mask>
            <clipPath id="parentWaveClip">
              <path d="M100 90 C160 90, 200 30, 280 18 C330 10, 370 2, 410 -5 L410 90 Z" />
            </clipPath>
          </defs>
          {/* Dot perforation grid */}
          <g mask="url(#dotMask)">
            {Array.from({ length: 28 }).map((_, row) =>
              Array.from({ length: 80 }).map((_, col) => (
                <circle key={`${row}-${col}`}
                  cx={col * 5 + (row % 2 === 1 ? 2.5 : 0)}
                  cy={row * 5 - 4}
                  r="0.35"
                  fill="white"
                  opacity="0.12"
                />
              ))
            )}
          </g>
          <g mask="url(#parentMask)">
            <path d="M100 90 C160 90, 200 30, 280 18 C330 10, 370 2, 410 -5 L410 90 Z" fill="#7FD4B6" opacity="0.05" />
            <path d="M100 90 C160 90, 200 30, 280 18 C330 10, 370 2, 410 -5" fill="none" stroke="#7FD4B6" strokeWidth="1.2" opacity="0.18" />
            <path d="M108 90 C168 90, 207 33, 286 21 C335 13, 374 5, 410 0" fill="none" stroke="white" strokeWidth="0.7" opacity="0.08" />
          </g>
        </svg>
        <Avatar name={childName} color={childColor} seed={childSeed} hairColor={childHairColor} skinColor={childSkinColor} size={52} />
        <div className="flex-1 min-w-0">
          <div className={`font-bold ${childNameSize} truncate`} title={childName}>{childName}</div>
          {flameCount(childConfirmedStreak) > 0 && (
            <div className="flex items-center gap-0.5 mt-1">
              {Array.from({ length: flameCount(childConfirmedStreak) }).map((_, i) => (
                <img key={i} src="/flame.svg" alt="" className="w-[18px] h-[18px]" style={{ marginLeft: i === 0 ? 0 : '-4px', filter: 'saturate(0.6)' }} />
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          {childStreak > 0 && (
            <div className="text-right border-r border-white/10 pr-4">
              <div className="flex items-center gap-1 justify-end leading-none" style={{ height: '1.65rem' }}>
                <span className="text-[22px] font-extrabold text-[#7FD4B6]">{childStreak}</span>
              </div>
              <div className="text-[11.5px] text-[#9FC4C0] mt-0.5 text-right">in Folge</div>
            </div>
          )}
          <div className="text-right">
            <div className="flex items-center justify-end gap-1 text-[#7FD4B6] leading-none" style={{ height: '1.65rem' }}>
              <span className="msym text-[18px]" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>edit</span>
              <span className="text-[22px] font-extrabold">{hwOpen}</span>
            </div>
            <div className="text-[11.5px] text-[#9FC4C0] mt-0.5">Aufgaben offen</div>
          </div>
        </div>
      </div>

      {/* HÜ-Bestätigungen – bestätigte HÜ verdienen automatisch die Streak-Flammen */}
      <ParentHwConfirmList items={pendingConfirmations} childFirstName={childFirst} />

      <div className="grid lg:grid-cols-[1fr_340px] gap-6 lg:gap-0 items-start">
        <div className="flex flex-col gap-5 min-w-0 lg:pr-6">
          {/* Cards — auf Mobile ausgeblendet (Stats wandern in den Header) */}
          <div className="grid sm:grid-cols-2 gap-4 max-md:hidden">
            <div className="relative hover:z-30 animate-card-enter h-full" style={{ animationDelay: '0ms' }}>
              <FeatureCard
                href="/hausaufgaben" gradient="amber" icon="assignment"
                title="Hausübungen"
                meta={hwTotal > 0 ? `${hwDone}/${hwTotal} erledigt` : 'Keine aktiven HÜ'}
                progress={hwTotal > 0 ? (hwDone / hwTotal) * 100 : undefined}
              />
            </div>
            <div className="relative hover:z-30 animate-card-enter h-full" style={{ animationDelay: '60ms' }}>
              <TermineCard events={upcomingEvents} />
            </div>
          </div>

          {/* Child's homework */}
          <div className="animate-card-enter rounded-2xl p-5 shadow-[0_8px_16px_rgba(20,40,45,.10)]" style={{ animationDelay: '180ms', background: 'linear-gradient(135deg, #FBF9F3 0%, #FEFEFC 100%)' }}>
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
                {childHomework.slice(0, 5).map(hw => (
                  <div key={hw.id} className="flex items-center gap-3 rounded-xl bg-[#FAF8F3] px-3 py-2.5 overflow-hidden">
                    <div
                      className="w-9 h-9 rounded-[10px] flex items-center justify-center font-extrabold text-[13px] text-white flex-shrink-0"
                      style={{ background: `linear-gradient(135deg, ${hw.subject_color}ee 0%, ${hw.subject_color}99 100%)` }}
                    >
                      {hw.subject_short}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[14px] text-kh-dark truncate">{hw.title}</div>
                      <div className={`flex items-center gap-1 text-xs font-semibold mt-0.5 ${hw.done ? 'text-kh-green' : 'text-kh-amber'}`}>
                        <span className="msym text-[12px]" style={{ fontVariationSettings: "'FILL' 0" }}>event</span>
                        {hw.done ? 'Erledigt' : `Fällig: ${new Date(hw.due_date).toLocaleDateString('de-AT', { day: 'numeric', month: 'short' })}`}
                      </div>
                    </div>
                    {hw.done
                      ? <span className="msym text-kh-green text-xl flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      : <span className="text-[11px] font-bold text-[#C95040] bg-[#FDECEA] px-2 py-1 rounded-full flex-shrink-0">Offen</span>
                    }
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="relative">
          <div className="flex flex-col gap-5 lg:bg-[#EDE9DF] lg:rounded-2xl lg:p-5 lg:sticky lg:top-7">
            <div className="animate-card-enter" style={{ animationDelay: '120ms' }}>
              <AgendaPanel reminders={reminders} events={upcomingEvents} role="parent" />
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
