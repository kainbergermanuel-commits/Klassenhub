'use client'

import { useState, useLayoutEffect, useRef } from 'react'

/**
 * Die Details einer Hausübung, inline unter der Aufgabe.
 *
 * Bewusst kein Dialog: Erinnerungen lösen denselben Fall im Projekt bereits
 * inline (siehe ReminderList/AgendaPanel), und ein kurzer Zusatz wie
 * „Lineal mitnehmen" soll ohne Tippen lesbar sein. Nur wenn der Text
 * tatsächlich abgeschnitten wird, erscheint „mehr".
 *
 * `clamp` steuert, wie viele Zeilen ungeöffnet sichtbar sind: 2 auf der
 * großen HÜ-Karte, 1 auf den dichten Zeilen der Startseite.
 */
export default function HomeworkDetails({
  text, clamp = 2, className = '',
}: { text: string; clamp?: 1 | 2; className?: string }) {
  const [open, setOpen] = useState(false)
  const [isTruncated, setIsTruncated] = useState(false)
  const ref = useRef<HTMLParagraphElement>(null)

  // Nur im zugeklappten Zustand messen: offen sind scrollHeight und
  // clientHeight zwangsläufig gleich, die Messung würde „mehr" fälschlich
  // verschwinden lassen und damit auch den Weg zurück.
  useLayoutEffect(() => {
    if (open) return
    const el = ref.current
    if (!el) return
    setIsTruncated(el.scrollHeight > el.clientHeight + 1)
  }, [text, clamp, open])

  if (!text.trim()) return null

  return (
    <div className={className}>
      <p
        ref={ref}
        className={`text-[12.5px] leading-snug text-kh-muted font-medium whitespace-pre-line ${open ? '' : clamp === 1 ? 'line-clamp-1' : 'line-clamp-2'}`}
      >
        {text}
      </p>
      {(isTruncated || open) && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
          aria-expanded={open}
          className="mt-0.5 inline-flex items-center gap-0.5 text-[11.5px] font-bold text-kh-teal hover:opacity-70 transition-opacity"
        >
          {open ? 'weniger' : 'mehr'}
          <span
            className="msym text-[15px] transition-transform duration-200"
            style={{ transform: open ? 'rotate(180deg)' : 'none' }}
          >
            expand_more
          </span>
        </button>
      )}
    </div>
  )
}
