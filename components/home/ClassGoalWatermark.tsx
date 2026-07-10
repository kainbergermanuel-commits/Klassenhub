'use client'

import { usePathname } from 'next/navigation'

/** Dezentes Bergpanorama, das an der abgerundeten oberen rechten Ecke des
 *  App-Fensters anliegt und nach innen (unten/links) ausfadet. Wird auf
 *  Layout-Ebene gerendert, damit es bis an die Fensterkante reicht statt im
 *  Content-Innenabstand zu enden. Nur auf der Startseite, nur Desktop. */
export default function ClassGoalWatermark() {
  const pathname = usePathname()
  if (pathname !== '/') return null

  return (
    <div className="hidden md:block absolute top-0 right-0 h-[360px] w-[46%] max-w-[660px] pointer-events-none select-none z-0 overflow-hidden">
      <img
        src="/images/season-mountain.webp"
        alt=""
        aria-hidden="true"
        className="w-full h-full object-cover"
        style={{
          objectPosition: '58% 100%',
          opacity: 0.85,
          filter: 'saturate(0.8)',
          maskImage: 'linear-gradient(to left, black 48%, transparent 99%), linear-gradient(to bottom, black 30%, transparent 92%)',
          WebkitMaskImage: 'linear-gradient(to left, black 48%, transparent 99%), linear-gradient(to bottom, black 30%, transparent 92%)',
          maskComposite: 'intersect',
          WebkitMaskComposite: 'source-in',
        }}
      />
    </div>
  )
}
