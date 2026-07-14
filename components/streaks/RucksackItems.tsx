'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useStreakFreeze } from '@/app/actions/useStreakFreeze'
import { useTimeCrystal } from '@/app/actions/useTimeCrystal'
import { sendParentNudge } from '@/app/actions/sendParentNudge'
import { VETERAN_MILESTONE } from '@/lib/streak'

/** Alle Signale, aus denen sich der Rucksack-Zustand ergibt — bewusst rein
 *  primitiv/serialisierbar, damit die Items sowohl in der Rucksack-Card
 *  (/streaks) als auch im Heldenbuch-Overlay (Startseite) gerendert werden
 *  können, ohne die Berechnung zu duplizieren. */
export interface RucksackState {
  broken: boolean
  jokerAvailable: boolean
  jokerUsedThisSeason: boolean
  /** Zeitkristall (Balance-Fahrplan Phase 3): zweites, unabhängiges 1x/Season-
   *  Werkzeug bei gerissener Streak — verlängert statt zu überbrücken. */
  crystalAvailable: boolean
  crystalUsedThisSeason: boolean
  /** Botenfeder (Balance-Fahrplan Phase 3): kanonischer, vordefinierter
   *  Eltern-Hinweis (kein Freitext) — max. 1x/Tag, nur wenn etwas offen ist. */
  pendingConfirmationCount: number
  nudgeSentToday: boolean
  veteranEarned: boolean
  confirmedStreak: number
  totalAchievements: number
  guildName: string | null
  parentConfirmStreak: number
  nextStepHint: string | null
}

type ItemState = 'ready' | 'action' | 'spent' | 'locked'

const STATE_CHIP: Record<ItemState, { label: string; cls: string }> = {
  ready:  { label: 'Bereit',      cls: 'text-kh-teal bg-kh-teal/12' },
  action: { label: 'Einsetzbar',  cls: 'text-white bg-[#3D8FC7]' },
  spent:  { label: 'Verbraucht',  cls: 'text-kh-muted bg-kh-muted/12' },
  locked: { label: 'Gesperrt',    cls: 'text-kh-muted bg-kh-muted/12' },
}

const WAPPEN_TARGET = 3
const AMULETT_TARGET = 3

/** Die 8 Rucksack-Item-Kacheln (3-spaltig). Jedes Item bildet ein echtes,
 *  für alle gleich geltendes Signal ab. */
export default function RucksackItems({ state }: { state: RucksackState }) {
  const { broken, jokerAvailable, jokerUsedThisSeason, crystalAvailable, crystalUsedThisSeason,
    pendingConfirmationCount, nudgeSentToday,
    veteranEarned, confirmedStreak, totalAchievements, guildName, parentConfirmStreak, nextStepHint } = state
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState(false)
  const [used, setUsed] = useState(false)
  const [crystalPending, startCrystalTransition] = useTransition()
  const [crystalError, setCrystalError] = useState(false)
  const [crystalUsed, setCrystalUsed] = useState(false)
  const [nudgePending, startNudgeTransition] = useTransition()
  const [nudgeError, setNudgeError] = useState(false)
  const [nudgeSent, setNudgeSent] = useState(false)
  const [nudgeTarget, setNudgeTarget] = useState<string | null>(null)

  function activateShield() {
    setError(false)
    startTransition(async () => {
      try {
        await useStreakFreeze()
        setUsed(true)
        router.refresh()
      } catch {
        setError(true)
      }
    })
  }

  function activateCrystal() {
    setCrystalError(false)
    startCrystalTransition(async () => {
      try {
        await useTimeCrystal()
        setCrystalUsed(true)
        router.refresh()
      } catch {
        setCrystalError(true)
      }
    })
  }

  function activateNudge() {
    setNudgeError(false)
    startNudgeTransition(async () => {
      try {
        const { homeworkTitle } = await sendParentNudge()
        setNudgeTarget(homeworkTitle)
        setNudgeSent(true)
        router.refresh()
      } catch {
        setNudgeError(true)
      }
    })
  }

  const shieldSpent = used || jokerUsedThisSeason
  const shieldState: ItemState = broken && jokerAvailable && !used
    ? 'action'
    : shieldSpent ? 'spent' : 'ready'

  const crystalSpent = crystalUsed || crystalUsedThisSeason
  const crystalState: ItemState = broken && crystalAvailable && !crystalUsed
    ? 'action'
    : crystalSpent ? 'spent' : 'ready'

  const nudgeSpent = nudgeSent || nudgeSentToday
  const nudgeState: ItemState = pendingConfirmationCount > 0 && !nudgeSpent
    ? 'action'
    : nudgeSpent ? 'spent' : 'locked'

  const veteranRemaining = Math.max(0, VETERAN_MILESTONE - confirmedStreak)
  const wappenEarned = totalAchievements >= WAPPEN_TARGET
  const wappenRemaining = Math.max(0, WAPPEN_TARGET - totalAchievements)
  const amulettEarned = parentConfirmStreak >= AMULETT_TARGET
  const amulettRemaining = Math.max(0, AMULETT_TARGET - parentConfirmStreak)

  return (
    <div className="grid grid-cols-3 gap-2.5">
      <Item
        state={shieldState}
        gradient={shieldState === 'action' ? 'linear-gradient(135deg, #5AB4E0, #3D8FC7)' : 'linear-gradient(135deg, #3DB5AC, #0F8A82)'}
        dimmed={shieldState === 'spent'}
        pulse={shieldState === 'action'}
        icon={
          <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3 4 6v6c0 5 3.4 8.4 8 9 4.6-.6 8-4 8-9V6l-8-3z" fill={shieldState !== 'spent' ? 'rgba(255,255,255,.22)' : 'none'} />
          </svg>
        }
        title="Schutzschild"
        tooltip={
          <>
            <TipHead>Schutzschild</TipHead>
            <TipBody>Fängt einmal pro Season eine vergessene Hausübung ab, ohne dass deine Streak reißt. Lädt sich am Monatsanfang wieder auf.</TipBody>
            <span className="block text-[11.5px] font-semibold mt-1.5 text-kh-muted">
              {used ? 'Eingesetzt — Streak gerettet!'
                : shieldState === 'action' ? 'Streak gerissen — jetzt einsetzbar.'
                : shieldSpent ? 'Diese Season verbraucht.'
                : '1 Ladung in Reserve.'}
            </span>
            {shieldState === 'action' && (
              <button
                onClick={(e) => { e.stopPropagation(); activateShield() }}
                disabled={pending}
                className="pointer-events-auto mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-br from-[#5AB4E0] to-[#3D8FC7] text-white text-[11.5px] font-bold hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                <span className="msym text-[13px]">ac_unit</span>
                Schild einsetzen
              </button>
            )}
            {error && <span className="block text-[10.5px] font-semibold text-kh-red mt-1.5">Schild konnte nicht eingesetzt werden.</span>}
          </>
        }
      />

      <Item
        state={veteranEarned ? 'ready' : 'locked'}
        gradient="linear-gradient(135deg, #E0A94B, #B8721E)"
        dimmed={!veteranEarned}
        icon={<span className="msym text-[24px] text-white" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>}
        title="Meistersiegel"
        chipOverride={veteranEarned ? { label: 'Verdient', cls: 'text-kh-amber bg-kh-amber/15' } : undefined}
        tooltip={
          <>
            <TipHead>Meistersiegel</TipHead>
            <TipBody>Ab einer Streak von {VETERAN_MILESTONE} HÜ in Folge zählen deine erledigten Hausübungen automatisch — ganz ohne Bestätigung deiner Eltern. Ein Privileg, das man sich verdient.</TipBody>
            {!veteranEarned && (
              <span className="block text-[11.5px] font-semibold text-kh-amber mt-1.5">Noch {veteranRemaining} HÜ in Folge bis zum Siegel.</span>
            )}
          </>
        }
      />

      <Item
        state={wappenEarned ? 'ready' : 'locked'}
        gradient="linear-gradient(135deg, #8791dd, #5965B8)"
        dimmed={!wappenEarned}
        icon={<span className="msym text-[24px] text-white" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>}
        title="Wappen-Fragment"
        chipOverride={wappenEarned ? { label: `${totalAchievements}`, cls: 'text-kh-violet bg-kh-violet/15' } : undefined}
        tooltip={
          <>
            <TipHead>Wappen-Fragment</TipHead>
            <TipBody>Jeder gesammelte Erfolg (Quest, Gilden-Quest, Klassenziel) legt ein Stück deines persönlichen Wappens frei — reiner Ausdruck, kein Wettbewerb.</TipBody>
            <span className="block text-[11.5px] font-semibold mt-1.5 text-kh-muted">
              {wappenEarned ? `${totalAchievements} Erfolge gesammelt.` : `Noch ${wappenRemaining} Erfolge bis zum ersten Fragment.`}
            </span>
          </>
        }
      />

      <Item
        state={guildName ? 'ready' : 'locked'}
        gradient="linear-gradient(135deg, #7FD3A6, #2E9C6E)"
        dimmed={!guildName}
        icon={<span className="msym text-[24px] text-white" style={{ fontVariationSettings: "'FILL' 1" }}>diversity_3</span>}
        title="Gildenbanner"
        tooltip={
          <>
            <TipHead>Gildenbanner</TipHead>
            <TipBody>Zeigt, zu welcher Gilde du diese Season gehörst. Gilden mischen sich jeden Monat neu — niemand bleibt für immer in derselben Gruppe.</TipBody>
            <span className="block text-[11.5px] font-semibold mt-1.5 text-kh-muted">
              {guildName ? `Du gehörst zu: ${guildName}` : 'Noch keiner Gilde zugeteilt.'}
            </span>
          </>
        }
      />

      <Item
        state={amulettEarned ? 'ready' : 'locked'}
        gradient="linear-gradient(135deg, #E285A0, #C15B76)"
        dimmed={!amulettEarned}
        icon={<span className="msym text-[24px] text-white" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>}
        title="Verbündeten-Amulett"
        tooltip={
          <>
            <TipHead>Verbündeten-Amulett</TipHead>
            <TipBody>Leuchtet auf, wenn deine Eltern zuletzt {AMULETT_TARGET} Hausübungen in Folge bestätigt haben — ein Zeichen, dass eure Verbündeten mitziehen.</TipBody>
            <span className="block text-[11.5px] font-semibold mt-1.5 text-kh-muted">
              {amulettEarned ? 'Eure Verbündeten sind aktiv dabei!' : `Noch ${amulettRemaining} Bestätigungen in Folge.`}
            </span>
          </>
        }
      />

      <Item
        state="ready"
        gradient="linear-gradient(135deg, #3DB5AC, #0F8A82)"
        icon={<span className="msym text-[24px] text-white" style={{ fontVariationSettings: "'FILL' 1" }}>explore</span>}
        title="Kompass"
        chipOverride={{ label: 'Aktiv', cls: 'text-kh-teal bg-kh-teal/12' }}
        tooltip={
          <>
            <TipHead>Kompass des Mentors</TipHead>
            <TipBody>Zeigt dir statt eines Rangs immer nur den einen nächsten sinnvollen Schritt — Orientierung statt Vergleich.</TipBody>
            <span className="block text-[11.5px] font-semibold mt-1.5 text-kh-teal">
              {nextStepHint ?? 'Alles erledigt — genieß die Pause!'}
            </span>
          </>
        }
      />

      <Item
        state={crystalState}
        gradient={crystalState === 'action' ? 'linear-gradient(135deg, #C084E8, #9C5FD1)' : 'linear-gradient(135deg, #9CA3AF, #6E7E80)'}
        dimmed={crystalState === 'spent'}
        pulse={crystalState === 'action'}
        icon={
          <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2 4 8l8 14 8-14z" fill={crystalState !== 'spent' ? 'rgba(255,255,255,.22)' : 'none'} />
            <path d="M4 8h16M9 8l3-6 3 6" />
          </svg>
        }
        title="Zeitkristall"
        tooltip={
          <>
            <TipHead>Zeitkristall</TipHead>
            <TipBody>Verlängert einmal pro Season die Frist einer HÜ um 3 Tage, ohne dass deine Streak reißt — die Lehrkraft sieht die Verlängerung. Lädt sich am Monatsanfang wieder auf.</TipBody>
            <span className="block text-[11.5px] font-semibold mt-1.5 text-kh-muted">
              {crystalUsed ? 'Eingesetzt — Frist verlängert!'
                : crystalState === 'action' ? 'Streak gerissen — jetzt einsetzbar.'
                : crystalSpent ? 'Diese Season verbraucht.'
                : '1 Ladung in Reserve.'}
            </span>
            {crystalState === 'action' && (
              <button
                onClick={(e) => { e.stopPropagation(); activateCrystal() }}
                disabled={crystalPending}
                className="pointer-events-auto mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-br from-[#C084E8] to-[#9C5FD1] text-white text-[11.5px] font-bold hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                <span className="msym text-[13px]">bolt</span>
                Kristall einsetzen
              </button>
            )}
            {crystalError && <span className="block text-[10.5px] font-semibold text-kh-red mt-1.5">Kristall konnte nicht eingesetzt werden.</span>}
          </>
        }
      />

      <Item
        state={nudgeState}
        gradient={nudgeState === 'action' ? 'linear-gradient(135deg, #F0A868, #D97B3D)' : 'linear-gradient(135deg, #9CA3AF, #6E7E80)'}
        dimmed={nudgeState !== 'action'}
        pulse={nudgeState === 'action'}
        icon={<span className="msym text-[24px] text-white" style={{ fontVariationSettings: "'FILL' 1" }}>mail</span>}
        title="Botenfeder"
        chipOverride={nudgeState === 'locked' ? { label: 'Nichts offen', cls: 'text-kh-muted bg-kh-muted/12' } : undefined}
        tooltip={
          <>
            <TipHead>Botenfeder</TipHead>
            <TipBody>Schickt einen vordefinierten Hinweis an deine Eltern, wenn eine erledigte Hausübung noch auf Bestätigung wartet — höchstens einmal am Tag.</TipBody>
            <span className="block text-[11.5px] font-semibold mt-1.5 text-kh-muted">
              {nudgeSent ? `Erinnerung geschickt${nudgeTarget ? ` (${nudgeTarget})` : ''}!`
                : nudgeState === 'action' ? `${pendingConfirmationCount} Hausübung${pendingConfirmationCount === 1 ? ' wartet' : 'en warten'} noch auf Bestätigung.`
                : nudgeSpent ? 'Heute schon geschickt.'
                : 'Gerade nichts zu erinnern.'}
            </span>
            {nudgeState === 'action' && (
              <button
                onClick={(e) => { e.stopPropagation(); activateNudge() }}
                disabled={nudgePending}
                className="pointer-events-auto mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-br from-[#F0A868] to-[#D97B3D] text-white text-[11.5px] font-bold hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                <span className="msym text-[13px]">send</span>
                Erinnerung schicken
              </button>
            )}
            {nudgeError && <span className="block text-[10.5px] font-semibold text-kh-red mt-1.5">Erinnerung konnte nicht geschickt werden.</span>}
          </>
        }
      />
    </div>
  )
}

function Item({
  state, gradient, dimmed, pulse, icon, title, tooltip, chipOverride,
}: {
  state: ItemState
  gradient: string
  dimmed?: boolean
  pulse?: boolean
  icon: React.ReactNode
  title: string
  tooltip: React.ReactNode
  chipOverride?: { label: string; cls: string }
}) {
  const [open, setOpen] = useState(false)
  const chip = chipOverride ?? STATE_CHIP[state]

  return (
    <div
      className="group/item flex flex-col items-center gap-1.5 rounded-xl bg-[#FAF8F3] px-2 py-3 cursor-default text-center"
      onClick={() => setOpen(o => !o)}
    >
      <span className="relative">
        <span
          className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-[0_3px_10px_rgba(20,40,45,.16)] transition-transform group-hover/item:-translate-y-0.5 ${pulse ? 'animate-pulse' : ''} ${dimmed ? 'opacity-45 saturate-50' : ''}`}
          style={{ background: gradient }}
        >
          {icon}
        </span>

        {/* Tooltip — direkt am Icon verankert, z-50 + zentriert nach unten. */}
        <span
          className={`absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 w-max max-w-[220px] bg-white rounded-xl shadow-[0_8px_20px_rgba(20,40,45,.22)] p-3 text-left transition-opacity ${
            open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none group-hover/item:opacity-100 group-hover/item:pointer-events-auto'
          }`}
        >
          {tooltip}
        </span>
      </span>
      <p className="font-extrabold text-[11.5px] text-kh-dark leading-tight">{title}</p>
      <span className={`text-[9.5px] font-extrabold px-1.5 py-0.5 rounded-full flex-shrink-0 ${chip.cls}`}>
        {chip.label}
      </span>
    </div>
  )
}

function TipHead({ children }: { children: React.ReactNode }) {
  return <span className="block text-[10.5px] font-bold uppercase tracking-wide text-kh-muted mb-1">{children}</span>
}
function TipBody({ children }: { children: React.ReactNode }) {
  return <span className="block text-[12px] font-medium text-kh-dark leading-snug">{children}</span>
}
