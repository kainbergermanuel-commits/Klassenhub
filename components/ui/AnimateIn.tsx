'use client'

import { useState } from 'react'

interface Props {
  /** Verzögerung in ms, für den Stagger-Effekt bei mehreren Sektionen. */
  delay?: number
  className?: string
  /** Zusätzliche Inline-Styles (z.B. ein Hintergrund-Gradient) — bleiben in
   *  beiden Zuständen (animierend/settled) erhalten, nur animationDelay
   *  kommt/verschwindet je nach Zustand dazu. */
  style?: React.CSSProperties
  children: React.ReactNode
}

/** Fade/Slide-Einblendung für Seiten-Sektionen (Stagger-Effekt) — bewusst als
 *  eigene Komponente statt der rohen `animate-card-enter`-Klasse direkt:
 *
 *  `.animate-card-enter` nutzt `animation-fill-mode: both`, das hält den
 *  `transform`-Wert der letzten Keyframe (`translateY(0) scale(1)`) PERMANENT
 *  im berechneten Stil — auch lange nachdem die 450ms-Animation optisch
 *  fertig ist. Ein nicht-`none`-Transform erzeugt aber einen neuen
 *  Containing Block für `position:fixed`-Nachfahren (Modals/Popups), die
 *  dann nicht mehr am Viewport verankert sind, sondern an dieser Sektion —
 *  genau der Bug, der das Rätsel-Modal und den Rucksack-Tooltip zuvor
 *  unsichtbar abgeschnitten hat (siehe RiddleCard.tsx-Portal-Kommentar).
 *
 *  Fix hier: nach Animationsende (`onAnimationEnd`) wird die Animations-
 *  Klasse entfernt — der Transform verschwindet, die Sektion wird wieder
 *  ein normaler, nicht-transformierter Container. Während der Animation
 *  selbst (die ersten ~450ms) bleibt das Risiko theoretisch bestehen, ist
 *  aber irrelevant: niemand öffnet in den ersten 450ms nach Seitenaufbau
 *  ein Modal. */
export default function AnimateIn({ delay = 0, className = '', style, children }: Props) {
  const [settled, setSettled] = useState(false)

  return (
    <div
      className={settled ? className : `animate-card-enter ${className}`.trim()}
      style={settled ? style : { ...style, animationDelay: `${delay}ms` }}
      onAnimationEnd={() => setSettled(true)}
    >
      {children}
    </div>
  )
}
