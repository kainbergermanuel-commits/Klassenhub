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
}

type ItemState = 'ready' | 'action' | 'spent' | 'locked'

const STATE_CHIP: Record<ItemState, { label: string; cls: string }> = {
  ready:  { label: 'Bereit',      cls: 'text-kh-teal bg-kh-teal/12' },
  action: { label: 'Einsetzbar',  cls: 'text-white bg-[#3D8FC7]' },
  spent:  { label: 'Verbraucht',  cls: 'text-kh-muted bg-kh-muted/12' },
  locked: { label: 'Gesperrt',    cls: 'text-kh-muted bg-kh-muted/12' },
}

/** Der Rucksack: private Sammlung an Ausrüstungs-Items, die reale
 *  App-Mechaniken im Abenteuer-Skin abbilden (siehe Item-Konzept). V1 zeigt
 *  bestehende Mechaniken sichtbar: Schutzschild (Streak-Joker, interaktiv)
 *  und Meistersiegel (Veteranen-Privileg). Wächst später um weitere Items. */
export default function RucksackCard({ broken, jokerAvailable, jokerUsedThisSeason, veteranEarned, confirmedStreak }: Props) {
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

  return (
    <div className="kh-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="msym text-[19px] text-kh-teal" style={{ fontVariationSettings: "'FILL' 1" }}>backpack</span>
        <h2 className="font-extrabold text-base text-kh-dark">Dein Rucksack</h2>
      </div>

      <div className="flex flex-col gap-2.5">
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
          subtitle={
            used ? 'Diese Season eingesetzt — Streak gerettet'
              : shieldState === 'action' ? 'Deine Streak ist gerissen — jetzt einsetzbar'
              : shieldSpent ? 'Diese Season verbraucht'
              : '1 Ladung in Reserve'
          }
          tooltip={
            <>
              <TipHead>Schutzschild</TipHead>
              <TipBody>Fängt einmal pro Season eine vergessene Hausübung ab, ohne dass deine Streak reißt. Lädt sich am Monatsanfang wieder auf.</TipBody>
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
              {used && <span className="block text-[11.5px] font-semibold text-kh-green mt-1.5">Eingesetzt — Streak gerettet!</span>}
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
          subtitle={
            veteranEarned
              ? 'Verdient — deine HÜ zählen automatisch'
              : `Noch ${veteranRemaining} HÜ in Folge bis Streak ${VETERAN_MILESTONE}`
          }
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
      </div>
    </div>
  )
}

function Item({
  state, gradient, dimmed, pulse, icon, title, subtitle, tooltip, chipOverride,
}: {
  state: ItemState
  gradient: string
  dimmed?: boolean
  pulse?: boolean
  icon: React.ReactNode
  title: string
  subtitle: string
  tooltip: React.ReactNode
  chipOverride?: { label: string; cls: string }
}) {
  const [open, setOpen] = useState(false)
  const chip = chipOverride ?? STATE_CHIP[state]

  return (
    <div
      className="relative group/item flex items-center gap-3 rounded-xl bg-[#FAF8F3] px-3 py-2.5 cursor-default"
      onClick={() => setOpen(o => !o)}
    >
      <span
        className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-[0_3px_10px_rgba(20,40,45,.16)] transition-transform group-hover/item:-translate-y-0.5 ${pulse ? 'animate-pulse' : ''} ${dimmed ? 'opacity-45 saturate-50' : ''}`}
        style={{ background: gradient }}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-extrabold text-[14px] text-kh-dark leading-tight">{title}</p>
        <p className="text-[11.5px] text-kh-muted font-medium leading-tight mt-0.5">{subtitle}</p>
      </div>
      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full flex-shrink-0 ${chip.cls}`}>
        {chip.label}
      </span>

      {/* Tooltip — z-50 + nach unten; die Container-Zeile trägt relative z-20,
          damit es nicht von Karten darunter verdeckt wird. */}
      <span
        className={`absolute top-full right-0 mt-2 z-50 w-max max-w-[240px] bg-white rounded-xl shadow-[0_8px_20px_rgba(20,40,45,.22)] p-3 text-left transition-opacity ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none group-hover/item:opacity-100 group-hover/item:pointer-events-auto'
        }`}
      >
        {tooltip}
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
