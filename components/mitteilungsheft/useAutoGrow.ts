import { useLayoutEffect, useRef } from 'react'

/**
 * Lässt ein Schreibfeld mit seinem Inhalt wachsen (bis zur max-height aus
 * dem CSS, danach scrollt es). Seit Enter eine neue Zeile macht statt zu
 * senden, braucht es das: in einem einzeiligen Feld verschwänden die
 * oberen Zeilen sonst unsichtbar nach oben. Nach dem Senden (Text leer)
 * schrumpft es von selbst zurück.
 *
 * Bewusst per JS statt `field-sizing: content`: Safari kann das noch nicht,
 * und die meisten Eltern schreiben am iPhone.
 */
export function useAutoGrow(value: string) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight + 2}px` // +2: Rahmen oben und unten
  }, [value])
  return ref
}
