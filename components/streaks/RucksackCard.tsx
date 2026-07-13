'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useStreakFreeze } from '@/app/actions/useStreakFreeze'
import { VETERAN_MILESTONE } from '@/lib/streak'

interface Props {
  /** Schutzschild (Streak-Joker) */
  broken: boolean
  jokerAvailable: boolean
  jokerUsedThisSeason: boolean
  /** Meistersiegel (HÜ-Veteran, je Streak ≥ 15 erreicht) */
  veteranEarned: boolean
  confirmedStreak: number
  /** Wappen-Fragment — sammelbar aus Quest-/Gilden-/Klassenziel-Erfolgen (achievements-Log) */
  totalAchievements: number
  /** Gildenbanner — sichtbar, sobald man einer Gilde angehört */
  guildName: string | null
  /** Verbündeten-Amulett — Eltern haben zuletzt mehrfach in Folge bestätigt */
  parentConfirmStreak: number
  /** Kompass des Mentors — nächster sinnvoller Schritt, aus Wochen-Quests berechnet */
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

/** Der Rucksack: private Sammlung an Ausrüstungs-Items, die reale
 *  App-Mechaniken im Abenteuer-Skin abbilden (siehe Item-Konzept).
 *  Dreispaltiges Grid. Jedes Item ist an ein echtes Signal geknüpft — nichts
 *  wird pauschal freigeschaltet. Zeitkristall/Botenfeder haben noch keine
 *  eigene Mechanik dahinter und sind deshalb bewusst als "in Entwicklung"
 *  markiert, statt vorzutäuschen, dass sie schon etwas bewirken. */
export default function RucksackCard({
  broken, jokerAvailable, jokerUsedThisSeason, veteranEarned, confirmedStreak,
  totalAchievements, guildName, parentConfirmStreak, nextStepHint,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState(false)
  const [used, setUsed] = useState(false)

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

  // Schutzschild-Zustand — nach dem Einsetzen ist es für die Season verbraucht
  // (der Erfolg wird über Untertitel/Tooltip positiv kommuniziert).
  const shieldSpent = used || jokerUsedThisSeason
  const shieldState: ItemState = broken && jokerAvailable && !used
    ? 'action'
    : shieldSpent
      ? 'spent'
      : 'ready'

  const veteranRemaining = Math.max(0, VETERAN_MILESTONE - confirmedStreak)
  const wappenEarned = totalAchievements >= WAPPEN_TARGET
  const wappenRemaining = Math.max(0, WAPPEN_TARGET - totalAchievements)
  const amulettEarned = parentConfirmStreak >= AMULETT_TARGET
  const amulettRemaining = Math.max(0, AMULETT_TARGET - parentConfirmStreak)

  return (
    <div className="kh-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="msym text-[19px] text-kh-teal" style={{ fontVariationSettings: "'FILL' 1" }}>backpack</span>
        <h2 className="font-extrabold text-base text-kh-dark">Dein Rucksack</h2>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {/* Schutzschild — Streak-Joker (interaktiv) */}
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

        {/* Meistersiegel — Veteranen-Privileg (passiv) */}
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

        {/* Wappen-Fragment — sammelbar aus Erfolgen (Quests/Gilde/Klassenziel) */}
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

        {/* Gildenbanner — Zugehörigkeit zur aktuellen Gilde */}
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

        {/* Verbündeten-Amulett — Eltern bestätigen zuletzt mehrfach in Folge */}
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

        {/* Kompass des Mentors — nächster sinnvoller Schritt (immer aktiv) */}
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

        {/* Zeitkristall — geplant, noch keine eigene Mechanik */}
        <Item
          state="locked"
          gradient="linear-gradient(135deg, #9CA3AF, #6E7E80)"
          dimmed
          icon={<span className="msym text-[24px] text-white" style={{ fontVariationSettings: "'FILL' 1" }}>hourglass_empty</span>}
          title="Zeitkristall"
          chipOverride={{ label: 'In Entwicklung', cls: 'text-kh-muted bg-kh-muted/12' }}
          tooltip={
            <>
              <TipHead>Zeitkristall</TipHead>
              <TipBody>Soll später einmal eine HÜ-Frist um ein paar Tage verlängern können, ohne die Streak zu gefährden. Diese Funktion gibt es noch nicht — kommt in einer späteren Ausbaustufe.</TipBody>
            </>
          }
        />

        {/* Botenfeder — geplant, noch keine eigene Mechanik */}
        <Item
          state="locked"
          gradient="linear-gradient(135deg, #9CA3AF, #6E7E80)"
          dimmed
          icon={<span className="msym text-[24px] text-white" style={{ fontVariationSettings: "'FILL' 1" }}>mail</span>}
          title="Botenfeder"
          chipOverride={{ label: 'In Entwicklung', cls: 'text-kh-muted bg-kh-muted/12' }}
          tooltip={
            <>
              <TipHead>Botenfeder</TipHead>
              <TipBody>Soll später eine gezielte Erinnerung an die Eltern schicken können. Diese Funktion gibt es noch nicht — kommt in einer späteren Ausbaustufe.</TipBody>
            </>
          }
        />
      </div>
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

        {/* Tooltip — direkt am Icon verankert (statt am ganzen Tile), z-50 +
            zentriert nach unten; die Container-Zeile trägt relative z-20,
            damit es nicht von Karten darunter verdeckt wird. */}
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
