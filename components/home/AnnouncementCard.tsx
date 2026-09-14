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
const STORAGE_KEY = 'kh-hinweis-domain-2026-09'

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
      className="animate-card-enter mb-4 flex items-start gap-2.5 rounded-xl border border-kh-teal/10 px-3.5 py-2"
      style={{
        // Verlauf von einer Ahnung Petrol ins Nichts: die Zeile hebt sich links
        // beim Symbol ab und laeuft nach rechts in die weisse Seite aus. Beide
        // Stopps halbtransparent, damit sie auf jedem Untergrund sitzt.
        background: 'linear-gradient(100deg, rgba(15,138,130,.10) 0%, rgba(15,138,130,.045) 45%, rgba(15,138,130,0) 100%)',
      }}
    >
      <span
        className="msym mt-[2px] flex-shrink-0 text-[18px] text-kh-teal/75"
        style={{ fontVariationSettings: "'FILL' 1" }}
        aria-hidden="true"
      >
        campaign
      </span>

      {/* Ein Textfluss statt zwei Absaetze: der Hinweis soll auf Desktop eine
          Zeile hoch sein und auf Mobile hoechstens drei. */}
      <p className="min-w-0 flex-1 text-[12.5px] font-medium leading-snug text-kh-dark/80">
        <span className="font-extrabold text-kh-dark/90">ClassHaven ist jetzt classhaven.at</span>
        {' \u00b7 '}
        Lesezeichen aktualisieren, Symbol am Startbildschirm neu ablegen.
      </p>

      <button
        onClick={wegklicken}
        aria-label="Hinweis ausblenden"
        className="msym -mr-0.5 mt-px flex-shrink-0 rounded-full p-0.5 text-[16px] leading-none text-kh-muted/50 transition-colors hover:bg-kh-teal/10 hover:text-kh-dark"
      >
        close
      </button>
    </div>
  )
}
