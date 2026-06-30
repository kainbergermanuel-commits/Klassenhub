'use client'

import Avatar from '@/components/ui/Avatar'
import type { TeacherSubject } from '@/app/actions/saveTeacherSubjects'

interface Props {
  full_name: string
  avatar_color: string
  avatar_seed: string | null
  avatar_hair_color: string | null
  avatar_skin_color: string | null
  subjects: TeacherSubject[]
  is_admin?: boolean
  is_homeroom?: boolean
  index: number
}

// Lange Namen abkürzen, damit sie in der schmalen Karte nicht umbrechen:
// "Manuel Kainberger" → "M. Kainberger".
function displayName(full: string) {
  if (full.length <= 15) return full
  const parts = full.trim().split(/\s+/)
  if (parts.length < 2) return full
  const last = parts[parts.length - 1]
  const initials = parts.slice(0, -1).map(p => `${p[0].toUpperCase()}.`).join(' ')
  return `${initials} ${last}`
}

export default function TeacherCard({ full_name, avatar_color, avatar_seed, avatar_hair_color, avatar_skin_color, subjects, is_admin, is_homeroom, index }: Props) {
  const primary = subjects.find(s => s.primary) ?? subjects[0]
  const gradientColor = primary?.color ?? '#0F8A82'

  return (
    <div className="h-full animate-card-enter" style={{ animationDelay: `${index * 40}ms` }}>
    <div
      className="relative h-full rounded-[20px] p-5 shadow-sm flex flex-col items-center text-center gap-3 select-none overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
      style={{ background: `linear-gradient(135deg, ${gradientColor}22 0%, ${gradientColor}55 100%)` }}
    >
      <Avatar
        name={full_name}
        color={avatar_color}
        seed={avatar_seed}
        hairColor={avatar_hair_color}
        skinColor={avatar_skin_color}
        size={64}
        className="shadow-sm"
      />
      <div className="flex flex-col items-center gap-0.5">
        <div className="font-bold text-[14.5px] text-kh-dark leading-tight">{displayName(full_name)}</div>
        <div className="text-[11px] font-medium text-kh-muted">{is_homeroom ? 'Klassenvorstand' : 'Lehrperson'}</div>
        {is_admin && (
          <span className="msym text-[15px] text-kh-teal mt-0.5" title="Administrator" style={{ fontVariationSettings: "'FILL' 1" }}>shield_person</span>
        )}
      </div>

      {subjects.length > 0 && (
        <div className="absolute bottom-2.5 right-2.5 flex flex-col items-end gap-1">
          {subjects.map(s => (
            <span
              key={s.short}
              className="text-[9px] font-extrabold w-[30px] text-center py-0.5 rounded-full text-white"
              style={{ background: `linear-gradient(135deg, ${s.color}ee 0%, ${s.color}99 100%)` }}
            >
              {s.short}
            </span>
          ))}
        </div>
      )}
    </div>
    </div>
  )
}
