'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useStreakFreeze } from '@/app/actions/useStreakFreeze'

interface Props {
  streak: number
  broken: boolean
  jokerAvailable: boolean
  jokerUsedThisSeason: boolean
  pendingMilestone?: number | null
}

/** Kleines, privates Schild-Item — zeigt nur den Joker-Status (Streak-Schutz)
 *  mit Hover/Tap-Tooltip. Ersetzt Banner/Rangliste, kein Vergleich mit
 *  anderen (siehe Gamification-Evidence: Option B). Die Streak-Länge selbst
 *  wird separat als Flammen daneben angezeigt, nicht im Schild. */
export default function StreakEmblem({ streak, broken, jokerAvailable, jokerUsedThisSeason, pendingMilestone }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState(false)
  const [used, setUsed] = useState(false)

  function activateJoker() {
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

  const shielded = used || (!broken && !jokerUsedThisSeason)

  return (
    <span
      className="relative inline-flex group/emblem"
      onClick={() => setOpen(o => !o)}
    >
      <button
        type="button"
        className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform hover:-translate-y-0.5"
        style={{
          background: broken && !used
            ? 'linear-gradient(135deg, #E0A94B, #B8721E)'
            : 'linear-gradient(135deg, #3DB5AC, #0F8A82)',
          boxShadow: '0 4px 12px rgba(20,40,45,.18)',
        }}
        aria-label="Dein privater Streak"
      >
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3 4 6v6c0 5 3.4 8.4 8 9 4.6-.6 8-4 8-9V6l-8-3z" fill={shielded ? 'rgba(255,255,255,.22)' : 'none'} />
        </svg>
      </button>

      <span
        className={`pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2 z-30 w-max max-w-[230px] bg-white rounded-xl shadow-[0_8px_20px_rgba(20,40,45,.22)] p-3 text-left transition-opacity ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 group-hover/emblem:opacity-100 group-hover/emblem:pointer-events-auto'
        }`}
      >
        <span className="block text-[10.5px] font-bold uppercase tracking-wide text-kh-muted mb-1">Dein Streak</span>
        <span className="block text-[13px] font-extrabold text-kh-dark">{streak} HÜ in Folge</span>

        {pendingMilestone && (
          <span className="block text-[11.5px] font-semibold text-kh-amber mt-1.5">Meilenstein {pendingMilestone} erreicht — wartet auf Bestätigung deiner Eltern.</span>
        )}

        {used ? (
          <span className="block text-[11.5px] font-semibold text-kh-green mt-1.5">Schild eingesetzt — Streak gerettet!</span>
        ) : broken && jokerAvailable ? (
          <>
            <span className="block text-[11.5px] text-kh-muted font-medium mt-1.5">Deine Streak ist gerissen. Noch 1 Schild diese Season übrig.</span>
            <button
              onClick={(e) => { e.stopPropagation(); activateJoker() }}
              disabled={pending}
              className="pointer-events-auto mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-br from-[#5AB4E0] to-[#3D8FC7] text-white text-[11.5px] font-bold hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              <span className="msym text-[13px]">ac_unit</span>
              Schild einsetzen
            </button>
          </>
        ) : broken ? (
          <span className="block text-[11.5px] text-kh-muted font-medium mt-1.5">Streak gerissen — Schild für diese Season schon verbraucht.</span>
        ) : (
          <span className="block text-[11.5px] text-kh-muted font-medium mt-1.5 flex items-center gap-1">
            <span className="msym text-[13px]" style={{ fontVariationSettings: `'FILL' ${jokerUsedThisSeason ? 0 : 1}` }}>ac_unit</span>
            {jokerUsedThisSeason ? 'Schild diese Season bereits verbraucht.' : '1 Schild diese Season in Reserve.'}
          </span>
        )}

        {error && <span className="block text-[10.5px] font-semibold text-kh-red mt-1.5">Schild konnte nicht eingesetzt werden.</span>}
      </span>
    </span>
  )
}
