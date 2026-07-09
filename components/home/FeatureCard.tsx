import Link from 'next/link'
import AvatarStack from './AvatarStack'
import Avatar from '@/components/ui/Avatar'

type GradientKey = 'teal' | 'amber' | 'violet' | 'blue'

const GRADIENT: Record<GradientKey, string> = {
  teal: 'gradient-teal',
  amber: 'gradient-amber',
  violet: 'gradient-violet',
  blue: 'gradient-blue',
}

interface Person {
  full_name: string
  avatar_color?: string | null
  avatar_seed?: string | null
  avatar_hair_color?: string | null
  avatar_skin_color?: string | null
}

interface FeatureCardProps {
  href: string
  gradient: GradientKey
  icon: string
  title: string
  meta: string
  /** 0–100 */
  progress?: number
  people?: Person[]
  /** Avatare unter dem Meta-Text statt oben rechts */
  peopleInline?: boolean
  /** Überschrift des Hover-Overlays über den Avatar-Stack oben rechts (z.B. "Noch offen") */
  peopleTooltip?: string
  badge?: string
  footer?: React.ReactNode
}

export default function FeatureCard({ href, gradient, icon, title, meta, progress, people, peopleInline, peopleTooltip, badge, footer }: FeatureCardProps) {
  return (
    <Link
      href={href}
      className={`${GRADIENT[gradient]} rounded-2xl p-[18px] text-white flex flex-col gap-3 shadow-[0_8px_16px_rgba(20,40,45,.10)] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 h-full relative hover:z-30`}
    >
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
          <span className="msym text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
        </div>
        {people && people.length > 0 && !peopleInline
          ? (
            <span className="relative group/people flex-shrink-0">
              <AvatarStack people={people} max={3} ring="rgba(255,255,255,0.35)" size={28} />
              {peopleTooltip && (
                <span className="pointer-events-none absolute top-full right-0 mt-1.5 z-20 hidden group-hover/people:block w-max max-w-[210px] bg-white rounded-xl shadow-[0_8px_20px_rgba(20,40,45,.22)] p-2.5 text-left">
                  <span className="block text-[10.5px] font-bold uppercase tracking-wide text-kh-muted mb-1.5">{peopleTooltip}</span>
                  <span className="flex flex-col gap-1.5">
                    {people.map((p, i) => (
                      <span key={i} className="flex items-center gap-1.5 min-w-0">
                        <Avatar name={p.full_name} color={p.avatar_color ?? '#0F8A82'} seed={p.avatar_seed} hairColor={p.avatar_hair_color} skinColor={p.avatar_skin_color} size={18} />
                        <span className="text-[12px] font-semibold text-kh-dark truncate">{p.full_name.split(' ')[0]}</span>
                      </span>
                    ))}
                  </span>
                </span>
              )}
            </span>
          )
          : badge
            ? <span className="text-[11px] font-bold bg-white/20 px-2.5 py-1 rounded-full">{badge}</span>
            : null}
      </div>

      <div className="mt-1">
        <div className="font-extrabold text-[17px] leading-tight">{title}</div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[13px] font-semibold text-white/85">{meta}</span>
          {people && people.length > 0 && peopleInline && (
            <AvatarStack people={people} max={3} ring="rgba(255,255,255,0.35)" size={22} />
          )}
        </div>
      </div>

      {progress !== undefined && (
        <div className="flex items-center gap-2.5 mt-auto pt-1">
          <div className="flex-1 h-1.5 rounded-full bg-white/25 overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all" style={{ width: `${Math.min(progress, 100)}%` }} />
          </div>
          <span className="text-[12px] font-bold">{Math.round(progress)}%</span>
        </div>
      )}
      {footer && <div className="mt-auto pt-1">{footer}</div>}
    </Link>
  )
}
