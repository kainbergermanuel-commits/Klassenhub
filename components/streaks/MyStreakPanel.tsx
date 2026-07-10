'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useStreakFreeze } from '@/app/actions/useStreakFreeze'

interface Props {
  streak: number
  broken: boolean
  jokerAvailable: boolean
  jokerUsedThisSeason: boolean
}

export default function MyStreakPanel({ streak, broken, jokerAvailable, jokerUsedThisSeason }: Props) {
  const router = useRouter()
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

  return (
    <div className="kh-card p-5">
      <h2 className="font-extrabold text-base text-kh-dark flex items-center gap-1.5 mb-2">
        <span className="msym text-[19px] text-kh-amber" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
        Dein Streak
      </h2>

      {used ? (
        <p className="text-[13.5px] font-semibold text-kh-green flex items-center gap-1.5">
          <span className="msym text-[17px]">check_circle</span>
          Joker eingesetzt — deine Streak ist gerettet!
        </p>
      ) : broken && jokerAvailable ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13.5px] text-kh-muted font-medium">
            Deine Streak ist gerissen. Du hast noch einen Joker diese Season.
          </p>
          <button
            onClick={activateJoker}
            disabled={pending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-br from-[#5AB4E0] to-[#3D8FC7] text-white text-[12.5px] font-bold hover:opacity-90 transition-opacity disabled:opacity-40 flex-shrink-0"
          >
            <span className="msym text-[15px]">ac_unit</span>
            Joker einsetzen
          </button>
        </div>
      ) : broken ? (
        <p className="text-[13.5px] text-kh-muted font-medium">
          Deine Streak ist gerissen — der Joker für diese Season ist bereits verbraucht.
        </p>
      ) : (
        <div>
          <p className="text-[13.5px] font-semibold text-kh-dark">
            Deine Streak läuft: {streak} {streak === 1 ? 'HÜ' : 'HÜ'} in Folge. Weiter so! 🔥
          </p>
          <p className="text-[12px] text-kh-muted font-medium mt-1 flex items-center gap-1">
            <span className="msym text-[14px]" style={{ fontVariationSettings: `'FILL' ${jokerUsedThisSeason ? 0 : 1}` }}>ac_unit</span>
            {jokerUsedThisSeason
              ? 'Joker für diese Season bereits verbraucht.'
              : 'Noch 1 Joker diese Season in Reserve.'}
          </p>
        </div>
      )}

      {error && <p className="text-[12px] font-semibold text-kh-red mt-2">Der Joker konnte nicht eingesetzt werden.</p>}
    </div>
  )
}
