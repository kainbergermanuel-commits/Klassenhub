/**
 * Signal neben einem Navigationspunkt — in zwei bewusst verschiedenen Stärken.
 *
 * In der Nav stehen zwei grundverschiedene Dinge nebeneinander: „da liegt
 * Arbeit" (offene Hausübungen, unbestätigte Anwesenheit) und „da ist etwas
 * Neues" (ungelesene Nachricht, ungesehene Erinnerung). Das erste bleibt oft
 * tagelang stehen, das zweite löst sich beim Ansehen auf. Sahen beide gleich
 * aus, gewöhnt man sich an die Dauer-Zahl — und übersieht dann die neue
 * Nachricht. Also:
 *
 *   kind="count"  Ruhige Kapsel mit Ziffer, im Stil der Umschalter-Chips.
 *                 Darf dastehen, ohne zu drängeln.
 *   kind="new"    Nur ein Punkt, keine Zahl. Bei Nachrichten ist „da ist was"
 *                 die eigentliche Information, nicht die genaue Anzahl.
 *
 * Beide in Teal: die Nav-Farbe. Amber bleibt für den einen Fall reserviert,
 * in dem Gelb wieder etwas bedeutet (versäumte Hausübungen) — noch ungenutzt.
 */
export default function NavBadge({ count, kind = 'count' }: { count: number; kind?: 'count' | 'new' }) {
  if (!count) return null

  if (kind === 'new') {
    return (
      <span
        className="w-[7px] h-[7px] rounded-full flex-shrink-0 gradient-teal animate-badge-in"
        aria-label={`${count} neu`}
      />
    )
  }

  return (
    <span
      className="min-w-5 h-5 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center flex-shrink-0 text-kh-teal border border-[#D9CFBE] animate-badge-in"
      style={{ background: 'linear-gradient(to bottom, #FFFDF8 0%, #F4EEE2 100%)' }}
      aria-label={`${count} offen`}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}
