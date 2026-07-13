'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Avatar from '@/components/ui/Avatar'
import { dutyIcon } from '@/lib/dutyIcon'
import { currentSchoolWeekday } from '@/lib/duty'
import { toggleDutyCompletion } from '@/app/actions/toggleDutyCompletion'

interface Partner {
  full_name: string
  avatar_color: string
  avatar_seed: string | null
  avatar_hair_color: string | null
  avatar_skin_color: string | null
}

interface Props {
  dutyId: string
  dutyName: string
  partners: Partner[]
  doneWeekdays: number[]
}

const DAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr']

/** Dienst-Modul für die rechte Navigation (unter dem Erinnerungen/Termine-
 *  Panel, gleiche Card-Optik). Zeigt den eigenen Dienst der Woche + Partner
 *  und lässt das Kind pro Wochentag selbst bestätigen (SDT-Autonomie).
 *  Zukünftige Tage sind gesperrt, vergangene/heutige antippbar. */
export default function DutyModule({ dutyId, dutyName, partners, doneWeekdays }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [done, setDone] = useState<Set<number>>(new Set(doneWeekdays))
  const todayWd = currentSchoolWeekday()

  function toggle(weekday: number) {
    if (weekday > todayWd || pending) return
    const next = new Set(done)
    const willBeDone = !next.has(weekday)
    if (willBeDone) next.add(weekday)
    else next.delete(weekday)
    setDone(next)
    startTransition(async () => {
      try {
        await toggleDutyCompletion(dutyId, weekday, willBeDone)
        router.refresh()
      } catch {
        // Optimismus zurücknehmen
        setDone(prev => {
          const rb = new Set(prev)
          if (willBeDone) rb.delete(weekday)
          else rb.add(weekday)
          return rb
        })
      }
    })
  }

  const doneCount = DAY_LABELS.filter((_, i) => done.has(i + 1)).length
  const partnerNames = partners.map(p => p.full_name.split(' ')[0])

  return (
    <div className="bg-white rounded-[20px] p-5 shadow-sm border border-kh-border/50 max-md:rounded-2xl max-md:border-0 max-md:bg-gradient-to-br max-md:from-white max-md:via-white max-md:to-kh-page max-md:shadow-[0_8px_16px_rgba(20,40,45,.10)]">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#5965B8] to-[#8791dd] flex items-center justify-center flex-shrink-0 shadow-[0_3px_8px_rgba(89,101,184,.3)]">
          <span className="msym text-[19px] text-white" style={{ fontVariationSettings: "'FILL' 1" }}>{dutyIcon(dutyName)}</span>
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-extrabold text-[15px] text-kh-dark leading-tight truncate">{dutyName}</h2>
          <p className="text-[11.5px] text-kh-muted font-medium leading-tight">Dein Dienst diese Woche</p>
        </div>
        <span className="text-[11px] font-extrabold text-kh-violet bg-kh-violet/10 px-2 py-0.5 rounded-full flex-shrink-0">
          {doneCount}/5
        </span>
      </div>

      {partners.length > 0 && (
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center -space-x-1.5">
            {partners.map((p, i) => (
              <span key={i} className="ring-2 ring-white rounded-full">
                <Avatar name={p.full_name} color={p.avatar_color} seed={p.avatar_seed} hairColor={p.avatar_hair_color} skinColor={p.avatar_skin_color} size={22} />
              </span>
            ))}
          </div>
          <span className="text-[12px] text-kh-muted font-medium truncate">mit {partnerNames.join(', ')}</span>
        </div>
      )}

      <div className="flex gap-1.5">
        {DAY_LABELS.map((label, i) => {
          const weekday = i + 1
          const isDone = done.has(weekday)
          const isFuture = weekday > todayWd
          const isToday = weekday === todayWd
          return (
            <button
              key={label}
              type="button"
              onClick={() => toggle(weekday)}
              disabled={isFuture || pending}
              className={`flex-1 flex flex-col items-center gap-1 py-1.5 rounded-xl transition-all ${
                isFuture ? 'cursor-default opacity-40' : 'hover:-translate-y-0.5'
              }`}
              style={{
                background: isDone ? 'linear-gradient(135deg, #2E9C6E, #7FD3A6)' : isToday ? 'rgba(89,101,184,.10)' : '#F3F0EA',
              }}
              aria-label={`${label} ${isDone ? 'erledigt' : 'offen'}`}
            >
              <span className={`text-[10.5px] font-bold ${isDone ? 'text-white' : isToday ? 'text-kh-violet' : 'text-kh-muted'}`}>{label}</span>
              <span
                className={`msym text-[15px] ${isDone ? 'text-white' : 'text-kh-muted/50'}`}
                style={{ fontVariationSettings: `'FILL' ${isDone ? 1 : 0}` }}
              >
                {isDone ? 'check_circle' : 'radio_button_unchecked'}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
