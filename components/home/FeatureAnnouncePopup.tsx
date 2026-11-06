'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

/** Bis wann das Popup erscheint. Danach rendert es nichts mehr. Zum
 *  endgültigen Aufräumen: diese Datei löschen und die Einbindungen in
 *  ParentHome / TeacherHome entfernen. */
const SICHTBAR_BIS = '2026-11-30'

/** Eigener Schlüssel pro Ankündigung UND Rolle. Niemals wiederverwenden
 *  (siehe AnnouncementCard). Pro Rolle, damit eine Lehrperson, die in der
 *  Eltern-Vorschau den Elterntext wegklickt, ihren eigenen trotzdem sieht. */
const STORAGE_KEY = (rolle: Rolle) => `kh-neu-heft-an-lehrperson-${rolle}`

type Rolle = 'parent' | 'teacher'

const TEXT: Record<Rolle, { title: string; body: string }> = {
  parent: {
    title: 'Neu im Mitteilungsheft: gezielt anschreiben',
    body: 'Sie können jetzt beim Schreiben auswählen, an welche Lehrperson Ihre Nachricht geht. Diese wird dann direkt benachrichtigt. Ohne Auswahl geht die Nachricht wie bisher an alle Lehrpersonen der Klasse. Das Heft bleibt gemeinsam: Alle Lehrpersonen der Klasse können mitlesen.',
  },
  teacher: {
    title: 'Neu im Mitteilungsheft: Eltern können Sie gezielt anschreiben',
    body: 'Eltern können jetzt auswählen, an wen ihre Nachricht geht. Solche Nachrichten tragen die Markierung „an dich“, und nur Sie bekommen dafür ein „neu“ und den Push. Öffnet eine Kollegin das Heft zuerst, bleibt Ihr „neu“ trotzdem stehen.',
  },
}

/**
 * Einmalige Ankündigung als Dialog auf der Startseite. Gleiches Muster wie
 * AnnouncementCard: hartkodiert, befristet, gemerkt pro Gerät über
 * localStorage. Für eine einmalige Ankündigung ist „pro Gerät“ gut genug;
 * „pro Konto“ bräuchte eine Datenbankspalte.
 *
 * Vorbelegt auf „versteckt“, der localStorage-Blick kommt erst nach dem
 * ersten Zeichnen. Sonst blitzte das Popup bei allen kurz auf, die es längst
 * weggeklickt haben.
 */
export default function FeatureAnnouncePopup({ rolle }: { rolle: Rolle }) {
  const [zeigen, setZeigen] = useState(false)

  useEffect(() => {
    if (new Date() > new Date(`${SICHTBAR_BIS}T23:59:59`)) return
    try {
      if (localStorage.getItem(STORAGE_KEY(rolle)) !== 'weg') setZeigen(true)
    } catch {
      // Gesperrter Speicher: lieber gar nicht zeigen als bei jedem Aufruf.
      // Ein Dialog, der jedes Mal wiederkommt, nervt mehr als ein Hinweis.
    }
  }, [rolle])

  function weg() {
    setZeigen(false)
    try { localStorage.setItem(STORAGE_KEY(rolle), 'weg') } catch { /* siehe oben */ }
  }

  if (!zeigen) return null
  const t = TEXT[rolle]

  return (
    <div
      className="modal-backdrop fixed inset-0 z-[100] flex items-center justify-center p-4 bg-kh-dark/45 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feature-announce-title"
    >
      <div className="modal-panel w-full max-w-[360px] bg-white rounded-3xl shadow-[0_20px_50px_rgba(20,40,45,.35)] p-6 text-center">
        <p className="text-[10.5px] font-bold uppercase tracking-widest text-kh-muted">Neu in ClassHaven</p>

        <span className="w-16 h-16 rounded-2xl mx-auto my-4 flex items-center justify-center gradient-teal shadow-[0_6px_20px_rgba(20,40,45,.22)]">
          <span className="msym text-[32px] text-white" style={{ fontVariationSettings: "'FILL' 1" }}>menu_book</span>
        </span>

        <h2 id="feature-announce-title" className="font-extrabold text-[17px] leading-snug text-kh-dark">{t.title}</h2>
        <p className="text-[13.5px] text-kh-muted leading-relaxed mt-3 text-left">{t.body}</p>

        <Link
          href="/mitteilungsheft"
          onClick={weg}
          className="mt-5 block w-full px-4 py-2.5 rounded-full bg-gradient-to-br from-kh-teal to-[#0B6F69] text-white text-[13px] font-extrabold hover:brightness-105 transition-[filter,opacity] duration-150 tap"
        >
          Zum Mitteilungsheft
        </Link>
        <button
          type="button"
          onClick={weg}
          className="mt-2 w-full px-4 py-2.5 rounded-full text-kh-muted text-[13px] font-bold hover:text-kh-dark transition-colors"
        >
          Verstanden
        </button>
      </div>
    </div>
  )
}
