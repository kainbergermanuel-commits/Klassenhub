import type { Profile, Class } from '@/lib/types'

interface Props {
  profile: Profile
  klass: Class | null
}

export default function MobileHeader({ profile, klass }: Props) {
  const roleLabel =
    profile.role === 'teacher' ? 'Lehrperson' : profile.role === 'parent' ? 'Elternteil' : 'Schüler:in'

  return (
    <div className="md:hidden sticky top-0 z-30 flex items-center gap-3 px-4 py-3 bg-white/90 backdrop-blur-sm border-b border-kh-border/60">
      <div className="w-9 h-9 rounded-xl gradient-teal flex items-center justify-center text-white flex-shrink-0">
        <span className="msym text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-extrabold text-[15px] text-kh-dark leading-tight">KlassenHub</div>
        <div className="text-[11.5px] text-kh-muted font-medium truncate">
          {klass ? `${klass.name} · ${klass.school}` : roleLabel}
        </div>
      </div>
      <span className="text-[11px] font-bold text-kh-teal bg-kh-teal-light px-2.5 py-1 rounded-full flex-shrink-0">
        {roleLabel}
      </span>
    </div>
  )
}
