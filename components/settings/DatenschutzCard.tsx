import Link from 'next/link'
import type { Role } from '@/lib/types'

/** Einstiegskarte zu /datenschutz — bewusst im gleichen Zuschnitt wie
 *  ChangePasswordForm, damit die beiden Karten in den Einstellungen als Paar
 *  lesbar sind. Hover-Anhebung wie bei den übrigen Klick-Elementen. */
export default function DatenschutzCard({ role }: { role: Role }) {
  const isStudent = role === 'student'

  return (
    <Link
      href="/datenschutz"
      className="kh-card p-6 max-w-md block group hover:-translate-y-0.5 transition-transform"
    >
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-[13px] bg-kh-violet-light text-kh-violet flex items-center justify-center flex-shrink-0">
          <span className="msym text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            shield_person
          </span>
        </div>
        <div className="min-w-0">
          <h2 className="font-extrabold text-[16px] text-kh-dark">Datenschutz</h2>
          <p className="text-[12.5px] text-kh-muted font-medium">
            {isStudent ? 'Was über dich gespeichert wird' : 'Welche Daten gespeichert werden'}
          </p>
        </div>
        <span className="msym text-[22px] text-kh-muted ml-auto flex-shrink-0 group-hover:text-kh-teal transition-colors">
          chevron_right
        </span>
      </div>
    </Link>
  )
}
