import Link from 'next/link'
import FeatureCard from './FeatureCard'
import AgendaPanel from './AgendaPanel'
import StreakConfirmButton from './StreakConfirmButton'
import StreakLeaderCard, { type StreakEntry } from './StreakLeaderCard'
import type { HomeworkWithStatus, Reminder } from '@/lib/types'

interface ParentHomeProps {
  fullName: string
  parentId: string
  childId: string
  childName: string
  childColor: string
  className: string
  childHomework: HomeworkWithStatus[]
  reminders: Reminder[]
  todoTotal: number
  todoDone: number
  childStreak: number
  pendingMilestone: number | null
  streakEntries: StreakEntry[]
}

export default function ParentHome({
  fullName, parentId, childId, childName, childColor, className, childHomework, reminders, todoTotal, todoDone, childStreak, pendingMilestone, streakEntries,
}: ParentHomeProps) {
  const childFirst = childName.split(' ')[0]
  const today = new Date().toLocaleDateString('de-AT', { weekday: 'long', day: 'numeric', month: 'long' })
  const hwTotal = childHomework.length
  const hwOpen = childHomework.filter(h => !h.done).length
  const hwDone = hwTotal - hwOpen
  const todoProgress = todoTotal > 0 ? (todoDone / todoTotal) * 100 : 0

  return (
    <>
      <header className="mb-5">
        <h1 className="text-[26px] font-extrabold text-kh-dark tracking-tight">Hallo, Familie {fullName.split(' ').slice(-1)[0]}!</h1>
        <p className="text-sm text-kh-muted font-medium mt-1">{today} · {childFirst}, {className}</p>
      </header>

      {/* Child banner */}
      <div className="bg-kh-dark rounded-[20px] p-[18px] text-white flex items-center gap-3.5 mb-6">
        <div
          className="w-[52px] h-[52px] rounded-full flex items-center justify-center font-extrabold text-[19px] flex-shrink-0"
          style={{ background: childColor }}
        >
          {childFirst[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-[17px]">{childName}</div>
          <div className="text-[12.5px] text-[#9FC4C0] font-medium mt-0.5">{className} · Alles im Blick</div>
        </div>
        <div className="text-right">
          <div className="text-[22px] font-extrabold text-[#7FD4B6]">{hwOpen}</div>
          <div className="text-[11.5px] text-[#9FC4C0]">HÜ offen</div>
        </div>
      </div>

      {/* Streak pending confirmation */}
      {pendingMilestone && childStreak > 0 && (
        <div className="mb-6">
          <StreakConfirmButton
            childId={childId}
            parentId={parentId}
            milestone={pendingMilestone}
            childFirstName={childName.split(' ')[0]}
          />
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_340px] gap-6 lg:gap-0 items-start">
        <div className="flex flex-col gap-5 min-w-0 lg:pr-6">
          {/* Cards */}
          <div className="grid sm:grid-cols-2 gap-4">
            <FeatureCard
              href="/hausaufgaben" gradient="blue" icon="assignment"
              title="Hausübungen"
              meta={hwTotal > 0 ? `${hwDone}/${hwTotal} erledigt` : 'Keine aktiven HÜ'}
              progress={hwTotal > 0 ? (hwDone / hwTotal) * 100 : undefined}
            />
            <FeatureCard
              href="/todo" gradient="teal" icon="checklist"
              title="Wochen-To-Do"
              meta={todoTotal > 0 ? `${todoDone}/${todoTotal} erledigt` : 'Noch nichts gepostet'}
              progress={todoTotal > 0 ? todoProgress : undefined}
            />
          </div>

          {/* Child's homework */}
          <div className="bg-white rounded-[20px] p-5 shadow-sm border border-kh-border/50">
            <div className="flex justify-between items-baseline mb-3">
              <h2 className="font-extrabold text-base text-kh-dark">{childFirst}s Hausübungen</h2>
              <Link href="/hausaufgaben" className="text-sm font-semibold text-kh-teal hover:underline">Alle</Link>
            </div>
            {childHomework.length === 0 ? (
              <p className="text-sm text-kh-muted font-medium">Keine aktiven Hausübungen 🎉</p>
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
          <div className="hidden lg:block absolute top-0 -left-6 w-6 h-6 bg-white rounded-br-[20px]" />
          <div className="hidden lg:block absolute bottom-0 -left-6 w-6 h-6 bg-white rounded-tr-[20px]" />
          <div className="flex flex-col gap-5 lg:bg-[#EDE9DF] lg:rounded-[24px] lg:p-5 lg:sticky lg:top-7">
            <AgendaPanel reminders={reminders} role="parent" />
            <StreakLeaderCard entries={streakEntries} />
          </div>
        </div>
      </div>
    </>
  )
}
