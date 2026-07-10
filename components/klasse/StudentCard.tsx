'use client'

import { useState, useRef } from 'react'
import Avatar from '@/components/ui/Avatar'
import { gendered } from '@/lib/gender'
import type { SpecialRole, Gender } from '@/lib/types'

const ROLE_BADGE: Record<SpecialRole, { icon: string; base: string; color: string; fill: boolean }> = {
  klassensprecher:     { icon: 'star',       base: 'Klassensprecher',      color: '#C98A2B', fill: true },
  stv_klassensprecher: { icon: 'star',       base: 'Stv. Klassensprecher', color: '#C98A2B', fill: false },
  hw_admin:            { icon: 'assignment', base: 'HÜ-Administrator',      color: '#0F8A82', fill: true },
}

interface Props {
  id: string
  full_name: string
  avatar_color: string
  avatar_seed: string | null
  avatar_hair_color: string | null
  avatar_skin_color: string | null
  special_role: SpecialRole | null
  gender: Gender | null
  isVeteran?: boolean
  isMe: boolean
  index: number
}

export default function StudentCard({ id, full_name, avatar_color, avatar_seed, avatar_hair_color, avatar_skin_color, special_role, gender, isVeteran, isMe, index }: Props) {
  const reactions = ['Autsch! 😖', 'Hey! 😤', 'Hihi 😄', 'Hehe 😏', 'Wer war das? 👀', 'Ey!! 😠', 'Nicht jetzt 😴', 'Bruh 💀', '??']
  const [reaction, setReaction] = useState('')
  const [wobble, setWobble] = useState(false)
  const reactionTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wobbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const badge = special_role ? ROLE_BADGE[special_role] : null

  function handleClick() {
    if (isMe) return
    if (reactionTimer.current) clearTimeout(reactionTimer.current)
    if (wobbleTimer.current) clearTimeout(wobbleTimer.current)
    setReaction(reactions[Math.floor(Math.random() * reactions.length)])
    setWobble(false)
    requestAnimationFrame(() => setWobble(true))
    reactionTimer.current = setTimeout(() => setReaction(''), 1400)
    wobbleTimer.current = setTimeout(() => setWobble(false), 500)
  }

  return (
    <div className="h-full animate-card-enter" style={{ animationDelay: `${index * 40}ms` }}>
    <div
      onClick={handleClick}
      className={`relative h-full rounded-2xl p-5 shadow-[0_8px_16px_rgba(20,40,45,.10)] flex flex-col items-center text-center gap-3 select-none transition-all duration-200 hover:-translate-y-1 hover:shadow-md active:scale-95 ${isMe ? '' : 'cursor-pointer'} ${isMe ? 'ring-2 ring-kh-teal/40' : ''} ${wobble ? 'animate-wobble' : ''}`}
      style={{ background: 'linear-gradient(135deg, #FFFFFF 0%, #FAF6EF 100%)' }}
    >
      {badge && (
        <span
          title={gendered(badge.base, gender)}
          className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center shadow-sm"
          style={{ background: `linear-gradient(135deg, ${badge.color}ee 0%, ${badge.color}99 100%)` }}
        >
          <span className="msym text-[14px] text-white" style={{ fontVariationSettings: `'FILL' ${badge.fill ? 1 : 0}` }}>{badge.icon}</span>
        </span>
      )}
      {isVeteran && (
        <span
          title="HÜ-Veteran · 15 HÜ in Folge bestätigt — Erledigungen werden nicht mehr von den Eltern bestätigt"
          className="absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center shadow-sm"
          style={{ background: 'linear-gradient(135deg, #E8A020ee 0%, #F5C84299 100%)' }}
        >
          <span className="msym text-[14px] text-white" style={{ fontVariationSettings: "'FILL' 1" }}>military_tech</span>
        </span>
      )}
      {reaction && (
        <div className="absolute top-[74px] left-1/2 -translate-x-1/2 -ml-[5px] z-10 pointer-events-none">
          <div className="relative bg-white border border-kh-border shadow-lg rounded-2xl px-3 py-1.5 text-[13px] font-extrabold text-kh-dark whitespace-nowrap animate-pop-shake">
            {reaction}
            <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-b-[8px] border-l-transparent border-r-transparent border-b-kh-border" />
            <span className="absolute -top-[6px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-r-[5px] border-b-[7px] border-l-transparent border-r-transparent border-b-white" />
          </div>
        </div>
      )}
      <Avatar
        name={full_name}
        color={avatar_color}
        seed={avatar_seed}
        hairColor={avatar_hair_color}
        skinColor={avatar_skin_color}
        size={64}
        className="shadow-sm"
      />
      <div>
        <div className="font-bold text-[14.5px] text-kh-dark leading-tight">{full_name.split(' ')[0]}</div>
        {isMe && <span className="text-[11px] font-bold text-kh-teal mt-0.5 inline-block">Du</span>}
      </div>
    </div>
    </div>
  )
}
