'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toggleDutyCompletion } from '@/app/actions/toggleDutyCompletion'

interface Props {
  dutyId: string
  dutyName: string
  done: boolean
  guide: string
}

/** Dienst-Pille im Guide-Nudge-Stil (gleiche Optik wie die Info-Pillen der
 *  StoryHeroCard) — aber selbst antippbar: das Kind bestätigt den eigenen
 *  Dienst (SDT-Selbstkontrolle), kein Lehrer-Haken nötig. Schließt die
 *  "ehrliche Datenlücke" aus dem Gamification-Plan (duties speicherte bisher
 *  nur die Zuteilung, kein "erledigt"). */
export default function DutyNudge({ dutyId, dutyName, done, guide }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [optimisticDone, setOptimisticDone] = useState(done)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState(false)

  function toggle() {
    setError(false)
    const next = !optimisticDone
    setOptimisticDone(next)
    startTransition(async () => {
      try {
        await toggleDutyCompletion(dutyId, next)
        router.refresh()
      } catch {
        setOptimisticDone(!next)
        setError(true)
      }
    })
  }

  return (
    <span className="relative group/pill">
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(o => !o) }}
        className={`inline-flex items-center gap-1.5 backdrop-blur-sm px-2.5 py-1 rounded-full text-[11.5px] font-bold transition-colors ${
          optimisticDone ? 'bg-kh-green/15 text-kh-green' : 'bg-white/60 hover:bg-white/80 text-kh-dark'
        }`}
      >
        <span className="msym text-[14px]" style={{ fontVariationSettings: `'FILL' ${optimisticDone ? 1 : 0}` }}>
          {optimisticDone ? 'check_circle' : 'cleaning_services'}
        </span>
        {optimisticDone ? `Dienst erledigt: ${dutyName}` : `Dienst: ${dutyName}`}
      </button>

      <span
        className={`pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-20 w-max max-w-[220px] bg-white rounded-xl shadow-[0_8px_20px_rgba(20,40,45,.22)] p-2.5 text-left transition-opacity ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 group-hover/pill:opacity-100 group-hover/pill:pointer-events-auto'
        }`}
      >
        <span className="block text-[10.5px] font-bold uppercase tracking-wide text-kh-muted mb-1">Dein Dienst</span>
        <span className="block text-[12px] font-medium text-kh-dark leading-snug">
          {optimisticDone
            ? `${guide} hat's notiert — danke fürs Erledigen!`
            : `Hast du "${dutyName}" schon gemacht? Bestätige selbst, sobald es erledigt ist.`}
        </span>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle() }}
          disabled={pending}
          className={`pointer-events-auto mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-white text-[11.5px] font-bold hover:opacity-90 transition-opacity disabled:opacity-40 ${
            optimisticDone ? 'bg-gradient-to-br from-kh-muted to-kh-dark' : 'bg-gradient-to-br from-kh-teal to-[#0F8A82]'
          }`}
        >
          <span className="msym text-[13px]">{optimisticDone ? 'undo' : 'check'}</span>
          {optimisticDone ? 'Doch nicht erledigt' : 'Erledigt!'}
        </button>
        {error && <span className="block text-[10.5px] font-semibold text-kh-red mt-1.5">Konnte nicht gespeichert werden.</span>}
      </span>
    </span>
  )
}
