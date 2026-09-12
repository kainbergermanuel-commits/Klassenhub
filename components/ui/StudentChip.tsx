'use client'

import Avatar from '@/components/ui/Avatar'

export interface ChipStudent {
  full_name: string
  avatar_color: string
  avatar_seed: string | null
  avatar_hair_color: string | null
  avatar_skin_color: string | null
}

/**
 * Kind als Chip: Avatar + Vorname, optional mit Klassenkürzel und einem
 * Zeichen rechts (erledigt, ausgenommen …).
 *
 * Dieses Muster lag viermal fast gleich im Projekt — Ausnahme-Auswahl der
 * Hausübungen, Mitglieder und Abgaben in den Lerngruppen, Standard-Ausnahmen.
 * Jede Kopie hatte leicht andere Größen und Farben, obwohl alle dasselbe
 * meinen. Hier steht das Muster einmal; Zustände kommen über `tone`.
 *
 * Nur der VORNAME steht im Chip: Chips stehen dicht nebeneinander, und der
 * Nachname sprengt jede Reihe. Der vollständige Name bleibt im title-Tooltip.
 */
export default function StudentChip({
  student, tone = 'neutral', classLabel, icon, title, onClick, pressed, size = 18,
}: {
  student: ChipStudent
  /** neutral = sachlich, aktiv = betont (dabei/erledigt), gedimmt = nicht dabei. */
  tone?: 'neutral' | 'aktiv' | 'gedimmt'
  classLabel?: string | null
  /** Material-Symbol rechts im Chip. */
  icon?: string
  title?: string
  onClick?: () => void
  pressed?: boolean
  size?: number
}) {
  const firstName = student.full_name.split(' ')[0]
  // Lange Vornamen etwas kleiner setzen — spart Breite, ohne den Namen zu
  // zerschneiden (ein mitten im Wort umgebrochener Name ist unlesbar).
  const long = firstName.length > 9

  const toneClass =
    tone === 'aktiv' ? 'border-kh-teal/40 bg-kh-teal/5 text-kh-dark'
    : tone === 'gedimmt' ? 'border-kh-border bg-[#F6F3ED] text-kh-muted opacity-60'
    : 'border-kh-border bg-white text-kh-dark'

  const inner = (
    <>
      <span className={tone === 'gedimmt' ? 'grayscale' : ''}>
        <Avatar
          name={student.full_name} color={student.avatar_color} seed={student.avatar_seed}
          hairColor={student.avatar_hair_color} skinColor={student.avatar_skin_color} size={size}
        />
      </span>
      <span className={`${long ? 'text-[10px]' : 'text-[11.5px]'} font-semibold leading-tight whitespace-nowrap overflow-hidden text-ellipsis min-w-0 ${
        tone === 'gedimmt' ? 'line-through decoration-1' : ''
      }`}>
        {firstName}
      </span>
      {classLabel && <span className="text-[10px] font-bold opacity-70 flex-shrink-0">{classLabel}</span>}
      {icon && (
        <span className="msym text-[13px] text-kh-teal flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
      )}
    </>
  )

  const className = `flex items-center gap-1.5 px-2 py-1 rounded-full border transition-all max-w-full ${toneClass}`

  return onClick
    ? <button type="button" onClick={onClick} aria-pressed={pressed} title={title ?? student.full_name} className={className}>{inner}</button>
    : <span title={title ?? student.full_name} className={className}>{inner}</span>
}
