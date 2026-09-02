'use client'

import { useEffect, useRef, useState } from 'react'

/** Bewegungs-Helfer der App.
 *
 *  Lagen ursprünglich privat in components/home/statParts.tsx und waren damit
 *  nur den Kennzahl-Panels zugänglich, obwohl sie überall nützlich sind — der
 *  Quest-Fortschrittsbalken etwa sprang auf seine Breite, statt wie die
 *  Kennzahl-Balken hineinzuwachsen. Hierher gezogen und exportiert,
 *  Verhalten unverändert. */

/** Respektiert die System-Einstellung "Bewegung reduzieren". */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

/**
 * Gibt beim ersten Frame 0 zurück, danach den Zielwert — damit Ringe und Balken
 * beim Laden von 0 auf ihren Wert wachsen (vorher stand der Endwert sofort da,
 * die CSS-Transition lief also nie).
 */
export function useGrowIn(target: number) {
  const reduced = usePrefersReducedMotion()
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (reduced) { setValue(target); return }
    const id = requestAnimationFrame(() => setValue(target))
    return () => cancelAnimationFrame(id)
  }, [target, reduced])
  return reduced ? target : value
}

/** Zählt eine Zahl in ~700 ms hoch (ease-out), respektiert Reduced Motion. */
export function useCountUp(target: number, duration = 700) {
  const reduced = usePrefersReducedMotion()
  const [value, setValue] = useState(0)
  const frame = useRef<number | undefined>(undefined)
  useEffect(() => {
    if (reduced) { setValue(target); return }
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(target * eased))
      if (t < 1) frame.current = requestAnimationFrame(tick)
    }
    frame.current = requestAnimationFrame(tick)
    return () => { if (frame.current) cancelAnimationFrame(frame.current) }
  }, [target, duration, reduced])
  return reduced ? target : value
}
