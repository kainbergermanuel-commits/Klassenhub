import Link from 'next/link'
import HeuteAgenda, { type AgendaData } from './HeuteAgenda'
import ChildStatsPanel, { type ChildStats } from './ChildStatsPanel'
import AgendaPanel from './AgendaPanel'
import ParentHwConfirmList, { type PendingConfirmation } from './ParentHwConfirmList'
import AttendanceParentCard, { type ChildAbsenceEntry } from './AttendanceParentCard'
import Avatar from '@/components/ui/Avatar'
import type { HomeworkWithStatus, Reminder, AgendaEvent } from '@/lib/types'
import { flameCount } from '@/lib/streak'
import { greeting, dueInfo } from '@/lib/date'
import { dueDateFor } from '@/lib/homework'
import HomeworkDetails from '@/components/homework/HomeworkDetails'
import AnimateIn from '@/components/ui/AnimateIn'

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
  /** Botenfeder (Balance-Fahrplan Phase 3): HÜ-IDs, bei denen das Kind aktiv
   *  um Bestätigung gebeten hat — hebt den Eintrag in der Liste dezent hervor. */
  nudgedHomeworkIds?: Set<string>
  /** Heutige + kommende Abwesenheiten des Kindes (Anwesenheits-Startkarte) */
  childUpcomingAbsences: ChildAbsenceEntry[]
  today: string
  /** Stundenplan des Kindes für die "Stundenplan"-Header-Card (Fokus morgen). */
  agenda: AgendaData
  /** Kind-Kennzahlen (inkl. Wochenrückblick) fürs Statistik-Panel der rechten Nav. */
  childStats: ChildStats
}

export default function ParentHome({
  fullName, childName, childColor, childSeed, childHairColor, childSkinColor, className, childHomework, reminders, upcomingEvents, childStreak, childConfirmedStreak, pendingConfirmations, nudgedHomeworkIds, childUpcomingAbsences, today: todayIso, agenda, childStats,
}: ParentHomeProps) {
  const childFirst = childName.split(' ')[0]
  const childNameSize = childName.length > 16 ? 'text-[13px]' : childName.length > 11 ? 'text-[15px]' : 'text-[17px]'
  const today = new Date().toLocaleDateString('de-AT', { weekday: 'long', day: 'numeric', month: 'long' })
  const hwTotal = childHomework.length
  const hwOpen = childHomework.filter(h => !h.done).length

  return (
    <>
      <header className="mb-5">
        <div className="flex items-center gap-3 min-w-0 max-md:pr-16">
          <div className="md:hidden w-10 h-10 rounded-2xl gradient-teal shadow-[0_6px_16px_rgba(20,40,45,.15)] flex items-center justify-center flex-shrink-0">
            <span className="msym text-[22px] text-white" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
          </div>
          <h1 className="text-[26px] max-md:text-[22px] font-extrabold text-kh-dark tracking-tight min-w-0">{greeting()}, Familie {fullName.split(' ').slice(-1)[0]}!</h1>
        </div>
        <p className="text-sm text-kh-muted font-medium mt-1">{today} · {childFirst}, {className}</p>
      </header>

      {/* Child banner — helles Glas über weichen Farbflächen.
          Bewusst umgekehrt zur früheren dunklen Fläche: der Banner liegt auf
          weißem Seitengrund, und dort kann eine DUNKLE Fläche nicht wirklich
          durchscheinend werden, ohne dass weißer Text darauf unlesbar wird
          (bei 70 % Deckkraft schon unter 4,5:1). Helles Glas mit dunkler
          Schrift löst beides zugleich: luftiger UND deutlich besser lesbar.

          KEINE dekorativen Formen im Banner: Auf der Startseite liegt bereits
          das Bergpanorama aus ClassGoalWatermark (Layout-Ebene, oben rechts,
          nur Desktop) dahinter. Eigene Formen hatten es schlicht zugedeckt —
          durchscheinen soll das echte Motiv, nicht ein nachgebautes.

          Zwei Schichten machen das Milchglas: ein gleichmäßiger weißer
          Schleier (14 %) für die Trübung und darüber ein waagrecht
          gestaffelter Mintton — links 34 %, wo nichts dahinter liegt und die
          Fläche sonst weiß auf weiß verschwände, rechts 14 %, wo der Berg
          sitzt. Ganz auf null geht der Tint nicht: auf dem Handy gibt es das
          Wasserzeichen nicht, dort wäre der Banner sonst unsichtbar.

          Gesamtdeckung damit 43 % links, 26 % rechts. Möglich wird das durch
          den starken Weichzeichner: er mittelt das Bild, sodass der dunkelste
          Punkt der überlappten Zone von L=0,26 auf L=0,31 steigt.

          Gemessen an drei Stellen (links ohne Bild / rechts über der
          dunkelsten Stelle / rechts auf dem Handy): Name 12,9 – 6,3 – 13,5:1,
          Zahlen 8,3 – 5,6 – 8,6:1, Beschriftung 7,8 – 5,2 – 8,0:1. */}
      <div className="relative overflow-hidden rounded-[22px] p-[18px] mb-6 flex items-center gap-3.5 text-[#17302C] backdrop-blur-[30px] shadow-[0_10px_28px_rgba(20,40,45,.12)]">
        {/* Trübung (gleichmäßig) und Tönung (gestaffelt) getrennt: der weiße
            Schleier macht das Milchige, der Mintton gibt der Fläche Körper,
            wo nichts dahinter liegt. */}
        <div className="absolute inset-0 z-[1]" style={{ background: 'rgba(255,255,255,.14)' }} />
        <div
          className="absolute inset-0 z-[1]"
          style={{ background: 'linear-gradient(100deg, rgba(200,232,223,.34) 0%, rgba(200,232,223,.24) 50%, rgba(200,232,223,.14) 100%)' }}
        />
        {/* Zweifarbige Kante: der helle Rand allein verschwindet dort, wo
            heller Himmel durchscheint. Die feine dunkle Kontur außen hält die
            Fläche auf jedem Grund als Panel erkennbar. */}
        <div
          className="absolute inset-0 z-[3] rounded-[22px] pointer-events-none"
          style={{
            border: '1px solid rgba(255,255,255,.70)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,.85), 0 0 0 1px rgba(24,54,50,.10)',
          }}
        />

        <div className="relative z-[2] flex items-center gap-3.5 w-full min-w-0">
          <div className="rounded-full flex-shrink-0" style={{ boxShadow: '0 0 0 2px rgba(255,255,255,.85), 0 3px 10px rgba(20,40,45,.14)' }}>
            <Avatar name={childName} color={childColor} seed={childSeed} hairColor={childHairColor} skinColor={childSkinColor} size={52} />
          </div>
          <div className="flex-1 min-w-0">
            <div className={`font-extrabold ${childNameSize} truncate`} title={childName}>{childName}</div>
            {flameCount(childConfirmedStreak) > 0 && (
              <div className="flex items-center gap-0.5 mt-1">
                {Array.from({ length: flameCount(childConfirmedStreak) }).map((_, i) => (
                  <img key={i} src="/flame.svg" alt="" className="w-[18px] h-[18px]" style={{ marginLeft: i === 0 ? 0 : '-4px' }} />
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2.5 flex-shrink-0">
            {childStreak > 0 && (
              <div
                className="rounded-[15px] px-[15px] py-2 text-right backdrop-blur-[16px]"
                style={{ background: 'rgba(255,255,255,.40)', border: '1px solid rgba(255,255,255,.72)' }}
              >
                <div className="text-[22px] font-extrabold leading-[1.15] text-[#0F544E]">{childStreak}</div>
                <div className="text-[11px] font-semibold text-[#3A5450] whitespace-nowrap mt-px">in Folge</div>
              </div>
            )}
            <div
              className="rounded-[15px] px-[15px] py-2 text-right backdrop-blur-[16px]"
              style={{ background: 'rgba(255,255,255,.40)', border: '1px solid rgba(255,255,255,.72)' }}
            >
              <div className="flex items-center justify-end gap-1 text-[22px] font-extrabold leading-[1.15] text-[#0F544E]">
                <span className="msym text-[18px]" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>edit</span>
                {hwOpen}
              </div>
              <div className="text-[11px] font-semibold text-[#3A5450] whitespace-nowrap mt-px">Aufgaben offen</div>
            </div>
          </div>
        </div>
      </div>

      {/* HÜ-Bestätigungen – bestätigte HÜ verdienen automatisch die Streak-Flammen */}
      <ParentHwConfirmList items={pendingConfirmations} childFirstName={childFirst} nudgedHomeworkIds={nudgedHomeworkIds} />

      <div className="grid lg:grid-cols-[1fr_340px] gap-6 lg:gap-0 items-start">
        <div className="flex flex-col gap-5 min-w-0 lg:pr-6">
          {/* Anwesenheit — nur Mobile hier oben; auf Desktop sitzt die Karte
              in der rechten Spalte unter dem Agenda-Panel */}
          <div className="lg:hidden">
            <AttendanceParentCard
              childFirstName={childFirst}
              upcomingEntries={childUpcomingAbsences}
              today={todayIso}
            />
          </div>

          {/* Stundenplan des Kindes — Header-Card (Fokus morgen, Toggle Woche),
              ersetzt die zwei Feature-Minicards. */}
          <AnimateIn delay={0}>
            <HeuteAgenda data={agenda} />
          </AnimateIn>

          {/* Child's homework */}
          <AnimateIn delay={180} className="rounded-2xl p-5 shadow-[0_8px_16px_rgba(20,40,45,.10)]" style={{ background: 'linear-gradient(135deg, #FBF9F3 0%, #FEFEFC 100%)' }}>
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
                {childHomework.slice(0, 5).map(hw => {
                  const due = dueInfo(dueDateFor(hw))
                  return (
                  <div key={hw.id} className="flex items-center gap-3 rounded-xl bg-[#FAF8F3] px-3 py-2.5 overflow-hidden">
                    <div
                      className="w-9 h-9 rounded-[10px] flex items-center justify-center font-extrabold text-[13px] text-white flex-shrink-0"
                      style={{ background: `linear-gradient(135deg, ${hw.subject_color}ee 0%, ${hw.subject_color}99 100%)` }}
                    >
                      {hw.subject_short}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[14px] text-kh-dark truncate">{hw.title}</div>
                      <div
                        className="flex items-center gap-1 text-xs font-semibold mt-0.5"
                        style={{ color: hw.done ? '#2E9C6E' : due.color }}
                        title={due.tooltip}
                      >
                        <span className="msym text-[12px]" style={{ fontVariationSettings: "'FILL' 0" }}>event</span>
                        {hw.done ? 'Erledigt' : due.label}
                      </div>
                      {hw.details && <HomeworkDetails text={hw.details} clamp={1} className="mt-1" />}
                    </div>
                    {!hw.done && due.warn && (
                      <span
                        className="msym text-[20px] flex-shrink-0"
                        title={due.tooltip}
                        style={{ fontVariationSettings: "'FILL' 1", color: due.color }}
                      >warning</span>
                    )}
                    {hw.done
                      ? <span className="msym text-kh-green text-xl flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      : <span className="text-[11px] font-bold text-[#C95040] bg-[#FDECEA] px-2 py-1 rounded-full flex-shrink-0">Offen</span>
                    }
                  </div>
                  )
                })}
              </div>
            )}
          </AnimateIn>
        </div>

        <div className="relative">
          <div className="flex flex-col gap-5 lg:bg-[#EDE9DF] lg:rounded-2xl lg:p-5 lg:sticky lg:top-7">
            <AnimateIn delay={120}>
              <AgendaPanel reminders={reminders} events={upcomingEvents} role="parent" />
            </AnimateIn>
            {/* Anwesenheit unter Terminen/Erinnerungen — nur Desktop
                (auf Mobile sitzt die Karte oben in der Hauptspalte) */}
            <AnimateIn delay={160} className="max-lg:hidden">
              <AttendanceParentCard
                childFirstName={childFirst}
                upcomingEntries={childUpcomingAbsences}
                today={todayIso}
              />
            </AnimateIn>
            <AnimateIn delay={180}>
              <ChildStatsPanel stats={childStats} childFirst={childFirst} />
            </AnimateIn>
          </div>
        </div>
      </div>
    </>
  )
}
