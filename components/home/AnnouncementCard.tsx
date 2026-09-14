'use client'

import { useEffect, useState } from 'react'

/** Bis wann der Hinweis erscheint. Danach rendert die Card nichts mehr —
 *  bewusst im Code und nicht im Kopf: ein Hinweis auf eine Adressumstellung,
 *  der ein halbes Jahr später noch dasteht, wirkt schlampiger als gar keiner.
 *  Zum endgültigen Aufräumen: diese Datei löschen und die drei Einbindungen
 *  in TeacherHome / StudentHome / ParentHome entfernen. */
const SICHTBAR_BIS = '2026-11-01'

/** Eigener Schlüssel pro Hinweis. Niemals wiederverwenden: ein neuer Hinweis
 *  unter altem Schlüssel wäre für alle, die den alten weggeklickt haben,
 *  unsichtbar. */
const STORAGE_KEY = 'kh-hinweis-classhaven-at'

/**
 * Schmaler Hinweis über den Startseiten-Cards. Bewusst hartkodiert statt aus
 * der Datenbank: kein Roundtrip, keine Tabelle, keine Policy — der Text steht
 * im ausgelieferten HTML. Für einen einmaligen Anlass ist das die ehrlichere
 * Lösung als ein Ankündigungssystem, das genau einen Fall kennt.
 *
 * Das Wegklicken merkt sich `localStorage`, also PRO GERÄT und nicht pro
 * Konto. Das ist hier kein Kompromiss, sondern richtig: Das Problem ist ein
 * Geräte-Problem (Lesezeichen im Browser, Symbol am Startbildschirm). Wer es
 * am Handy erledigt hat, soll den Hinweis am Laptop trotzdem noch sehen.
 *
 * Vorbelegt auf "versteckt": Der localStorage-Blick geht erst nach dem ersten
 * Zeichnen (useEffect). Andersherum blitzte der Hinweis bei allen, die ihn
 * längst weggeklickt haben, bei jedem Seitenaufbau kurz auf.
 */
export default function AnnouncementCard() {
  const [zeigen, setZeigen] = useState(false)

  useEffect(() => {
    if (new Date() > new Date(`${SICHTBAR_BIS}T00:00:00`)) return
    try {
      if (localStorage.getItem(STORAGE_KEY) !== 'weg') setZeigen(true)
    } catch {
      // Privater Modus / gesperrter Speicher: dann eben bei jedem Aufruf.
      setZeigen(true)
    }
  }, [])

  function wegklicken() {
    setZeigen(false)
    try { localStorage.setItem(STORAGE_KEY, 'weg') } catch { /* siehe oben */ }
  }

  if (!zeigen) return null

  return (
    <div
      className="animate-card-enter mb-4 flex items-center gap-2.5 rounded-xl border border-kh-teal/10 px-3.5 py-2"
      style={{
        // Verlauf von einer Ahnung Petrol ins Nichts: rechts oben beim Kreuz am
        // kraeftigsten, diagonal nach links unten auslaufend. Bewusst
        // `to bottom left` statt eines festen Winkels: die Achse laeuft dann
        // von Ecke zu Ecke und passt sich der Form an. Ein fester Winkel wie
        // 135deg draengt den ganzen Verlauf bei dieser flachen, breiten Zeile
        // in die obere linke Ecke, der Rest bliebe durchsichtig.
        // Beide Stopps halbtransparent, damit die Zeile auf jedem Untergrund sitzt.
        background: 'linear-gradient(to bottom left, rgba(15,138,130,.13) 0%, rgba(15,138,130,.055) 45%, rgba(15,138,130,0) 100%)',
      }}
    >
      <span
        className="msym flex-shrink-0 text-[18px] text-kh-teal/75"
        style={{ fontVariationSettings: "'FILL' 1" }}
        aria-hidden="true"
      >
        campaign
      </span>

      {/* Nur die Tatsache, kein Handlungsaufruf: Lesezeichen und Startbildschirm
          sind optional, und ein Hinweis, der um etwas bittet, wiegt schwerer als
          einer, der nur Bescheid gibt. */}
      <p className="min-w-0 flex-1 text-[12.5px] font-medium leading-snug text-kh-dark/80">
        ClassHaven hat eine neue Adresse: <span className="font-extrabold text-kh-teal">classhaven.at</span>
      </p>

      {/* Tooltip in der Optik von StatTooltip (components/home/statParts.tsx),
          aber rechtsbuendig statt ueber die volle Breite: der Ausloeser ist hier
          ein kleiner Knopf am rechten Rand. Ab `md`, weil es auf einem
          Berührungsbildschirm kein Darüberfahren gibt. */}
      <div className="relative flex-shrink-0 group/x">
        <button
          onClick={wegklicken}
          aria-label="Hinweis ausblenden"
          className="msym -mr-0.5 block rounded-full p-0.5 text-[16px] leading-none text-kh-muted/50 transition-colors hover:bg-kh-teal/25 hover:text-kh-dark md:-mr-1 md:p-1 md:text-[19px] md:text-kh-dark/60"
        >
          close
        </button>

        <div
          role="tooltip"
          className="
            pointer-events-none absolute bottom-full right-0 z-30 mb-2 w-max max-w-[220px]
            opacity-0 translate-y-1
            hidden md:block
            group-hover/x:opacity-100 group-hover/x:translate-y-0
            group-focus-within/x:opacity-100 group-focus-within/x:translate-y-0
            motion-safe:transition-all motion-safe:duration-150 motion-safe:ease-out
          "
        >
          <div className="rounded-xl bg-kh-dark/95 px-3 py-2 shadow-[0_6px_20px_rgba(20,40,45,.28)] backdrop-blur-sm">
            <div className="text-[11.5px] font-bold leading-snug text-white">Hinweis ausblenden</div>
            <div className="mt-0.5 text-[11px] leading-snug text-white/75">
              Verschwindet nur auf diesem Gerät.
            </div>
          </div>
          <div className="absolute -bottom-1 right-4 h-2.5 w-2.5 rotate-45 bg-kh-dark/95" />
        </div>
      </div>
    </div>
  )
}
