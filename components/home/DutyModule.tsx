'use client'

import { useState } from 'react'
import Avatar from '@/components/ui/Avatar'
import { dutyIcon } from '@/lib/dutyIcon'
import DutyDayStrip from '@/components/dienste/DutyDayStrip'

interface Partner {
  full_name: string
  avatar_color: string
  avatar_seed: string | null
  avatar_hair_color: string | null
  avatar_skin_color: string | null
}

export interface MyDuty {
  id: string
  name: string
  partners: Partner[]
  doneWeekdays: number[]
}

interface Props {
  duties: MyDuty[]
  /** Bis zu welchem Wochentag bestätigt werden darf (0 = Woche läuft noch nicht). */
  confirmableUntil: number
  /** Lehrer-Vorschau: Leiste reagiert, speichert aber nichts. */
  preview?: boolean
}

/** Dienst-Modul für die rechte Navigation (unter dem Erinnerungen/Termine-
 *  Panel, gleiche Card-Optik). Zeigt ALLE eigenen Dienste der Woche + Partner
 *  und lässt das Kind pro Wochentag selbst bestätigen (SDT-Autonomie).
 *
 *  Mehrere Dienste sind kein Randfall: die Cron-Zuweisung verteilt bei kleinen
 *  Klassen doppelt. Vorher zeigte das Modul nur den ersten — der zweite war
 *  nirgends abhakbar, wodurch "Dienst durchgehalten" (Heldenbuch, Eltern- und
 *  Lehrer-Panel) dauerhaft falsch blieb. */
export default function DutyModule({ duties, confirmableUntil, preview }: Props) {
  const [counts, setCounts] = useState<Record<string, number>>(
    () => Object.fromEntries(duties.map(d => [d.id, d.doneWeekdays.length]))
  )
  if (duties.length === 0) return null

  const multi = duties.length > 1
  // Bei mehreren Diensten zählt der beste — dieselbe Schwelle, die auch die
  // Quest-Auswertung (dutyDoneCount) und die Gilden-Dienstquest verwenden.
  const shownCount = Math.max(...duties.map(d => counts[d.id] ?? 0))

  return (
    <div className="bg-white rounded-[20px] p-5 shadow-sm border border-kh-border/50 max-md:rounded-2xl max-md:border-0 max-md:bg-gradient-to-br max-md:from-white max-md:via-white max-md:to-kh-page max-md:shadow-[0_8px_16px_rgba(20,40,45,.10)]">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#5965B8] to-[#8791dd] flex items-center justify-center flex-shrink-0 shadow-[0_3px_8px_rgba(89,101,184,.3)]">
          <span className="msym text-[19px] text-white" style={{ fontVariationSettings: "'FILL' 1" }}>
            {dutyIcon(multi ? '' : duties[0].name)}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-extrabold text-[15px] text-kh-dark leading-tight truncate">
            {multi ? 'Deine Dienste' : duties[0].name}
          </h2>
          <p className="text-[11.5px] text-kh-muted font-medium leading-tight">
            {multi ? `${duties.length} Dienste diese Woche` : 'Dein Dienst diese Woche'}
          </p>
        </div>
        <span className="text-[11px] font-extrabold text-kh-violet bg-kh-violet/10 px-2 py-0.5 rounded-full flex-shrink-0">
          {shownCount}/5
        </span>
      </div>

      <div className="flex flex-col gap-4">
        {duties.map(duty => (
          <div key={duty.id}>
            {multi && (
              <div className="flex items-center gap-1.5 mb-2">
                <span className="msym text-[16px] text-kh-violet" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {dutyIcon(duty.name)}
                </span>
                <span className="text-[12.5px] font-bold text-kh-dark truncate">{duty.name}</span>
              </div>
            )}

            {duty.partners.length > 0 && (
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center -space-x-1.5">
                  {duty.partners.map((p, i) => (
                    <span key={i} className="ring-2 ring-white rounded-full">
                      <Avatar name={p.full_name} color={p.avatar_color} seed={p.avatar_seed} hairColor={p.avatar_hair_color} skinColor={p.avatar_skin_color} size={22} />
                    </span>
                  ))}
                </div>
                <span className="text-[12px] text-kh-muted font-medium truncate">
                  mit {duty.partners.map(p => p.full_name.split(' ')[0]).join(', ')}
                </span>
              </div>
            )}

            <DutyDayStrip
              dutyId={duty.id}
              doneWeekdays={duty.doneWeekdays}
              confirmableUntil={confirmableUntil}
              preview={preview}
              onCountChange={c => setCounts(prev => ({ ...prev, [duty.id]: c }))}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
