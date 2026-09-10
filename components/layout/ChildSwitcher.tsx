'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export interface ChildOption {
  id: string
  full_name: string
}

/**
 * Umschalter zwischen den Kindern eines Elternteils.
 *
 * Gegenstück zum Klassen-Umschalter der Lehrpersonen und bewusst in derselben
 * Form: Pillen mit Vornamen, das aktive Kind gefüllt. Er erscheint nur, wenn
 * wirklich mehr als ein Kind verknüpft ist; Familien mit einem Kind sehen
 * nichts und merken vom Umbau nichts.
 *
 * Die Umschaltung setzt serverseitig ein Cookie und lädt die Seite neu, weil
 * die aktive Klasse und sämtliche Zähler daran hängen.
 */
export default function ChildSwitcher({
  children,
  activeChildId,
  collapsed = false,
}: {
  children: ChildOption[]
  activeChildId: string | null
  collapsed?: boolean
}) {
  const router = useRouter()
  const [wechselt, setWechselt] = useState(false)

  if (children.length < 2) return null

  const vorname = (name: string) => name.split(' ')[0]

  async function wechseln(childId: string) {
    if (wechselt || childId === activeChildId) return
    setWechselt(true)
    await fetch('/api/active-child', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childId }),
    })
    setWechselt(false)
    router.refresh()
  }

  if (collapsed) {
    return (
      <div className="flex flex-col gap-1 items-center">
        {children.map(k => (
          <button
            key={k.id}
            onClick={() => wechseln(k.id)}
            title={k.full_name}
            disabled={wechselt}
            className={`w-7 h-7 rounded-full text-[10px] font-bold transition-all ${
              k.id === activeChildId
                ? 'gradient-teal text-white shadow-sm'
                : 'text-kh-muted/60 hover:text-kh-muted hover:bg-kh-border/30'
            }`}
          >
            {vorname(k.full_name).slice(0, 2)}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div>
      <span className="text-[11px] font-bold text-kh-muted/70 block mb-1.5">Kind</span>
      <div className="flex items-center gap-1.5 flex-wrap">
        {children.map(k => (
          <button
            key={k.id}
            onClick={() => wechseln(k.id)}
            disabled={wechselt}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold transition-all ${
              k.id === activeChildId
                ? 'gradient-teal text-white shadow-sm'
                : 'text-kh-muted hover:bg-kh-border/20'
            }`}
          >
            <span
              className="msym text-[15px]"
              style={{ fontVariationSettings: `'FILL' ${k.id === activeChildId ? 1 : 0}` }}
            >
              face
            </span>
            {vorname(k.full_name)}
          </button>
        ))}
      </div>
    </div>
  )
}
