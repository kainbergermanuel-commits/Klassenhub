'use client'

import { useState } from 'react'
import Link from 'next/link'
import { GUIDE_PORTRAIT } from '@/lib/seasonTheme'
import type { Role } from '@/lib/types'

/** Eine Anleitung: welt-neutral, in Vala-Stimme. `roles` steuert, wem der
 *  Eintrag angezeigt wird — der Hub ist für alle drei Rollen erreichbar, aber
 *  jede sieht nur, was für sie gilt. Neue How-tos kommen hier als weitere
 *  Einträge dazu (das ist der „wächst mit"-Teil). */
interface Guide {
  icon: string
  title: string
  roles: Role[]
  body: React.ReactNode
}

const GUIDES: Guide[] = [
  {
    icon: 'assignment',
    title: 'Hausübungen',
    roles: ['student', 'parent'],
    body: (
      <>Unter <b>Hausübungen</b> siehst du alles, was ansteht. Tippe eine Aufgabe an, wenn du sie erledigt hast — fertig. Ist etwas fällig, wandert die Hausübungs-Karte auf der Startseite ganz nach oben, damit du nichts übersiehst. Deine Eltern bestätigen die Erledigung dann noch kurz — das hält eure Flamme am Leben.</>
    ),
  },
  {
    icon: 'local_fire_department',
    title: 'Deine Flamme & der Rucksack',
    roles: ['student'],
    body: (
      <>Jede bestätigte Hausübung hält deine <b>Flamme</b> am Brennen — ganz privat, ohne Rangliste. Im <b>Rucksack</b> sammeln sich Werkzeuge: der <b>Schutzschild</b> fängt einmal pro Monat eine vergessene Hausübung ab, der <b>Zeitkristall</b> verlängert eine Frist. Sie laden sich am Monatsanfang wieder auf. Tippe im Rucksack auf ein Item, dann erkläre ich dir, was es kann.</>
    ),
  },
  {
    icon: 'explore',
    title: 'Wochen-Quests & Rätsel',
    roles: ['student'],
    body: (
      <>Jede Woche warten ein paar <b>Quests</b> auf dich — kleine Ziele wie „an drei Tagen eine Hausübung". Manche lassen dich zwischen zwei Wegen wählen. Dazu gibt es <b>Rätsel</b>: Sie verlangen, dass du in der Geschichte unserer Welten nachliest — die Antworten verstecken sich in „Die Reise". Neugier lohnt sich.</>
    ),
  },
  {
    icon: 'push_pin',
    title: 'Erinnerungen & Termine',
    roles: ['student', 'parent'],
    body: (
      <>Wichtige Hinweise deiner Lehrperson findest du unter <b>Erinnerungen</b>, alle Ausflüge, Schularbeiten und Feste unter <b>Termine</b>. Der nächste Termin steht immer oben. Manche Erinnerungen und Termine sind nur für dich bestimmt — die anderen sehen sie nicht.</>
    ),
  },
  {
    icon: 'cleaning_services',
    title: 'Dienste',
    roles: ['student'],
    body: (
      <>Bist du diese Woche für einen <b>Dienst</b> eingeteilt (Tafel, Blumen …), siehst du das auf der Startseite. Tippe den Wochentag an, sobald du ihn erledigt hast — so weiß die Klasse, dass man sich auf dich verlassen kann.</>
    ),
  },
  {
    icon: 'calendar_view_week',
    title: 'Stundenplan',
    roles: ['student', 'parent'],
    body: (
      <>Dein <b>Stundenplan</b> zeigt die ganze Woche, die heutige Spalte ist hervorgehoben. Ein kleines Zeichen an einer Stunde bedeutet: In diesem Fach ist bald eine Hausübung fällig. Deine Lehrperson gibt euch den Standard-Plan vor — einzelne Stunden kannst du selbst anpassen.</>
    ),
  },
  {
    icon: 'menu_book',
    title: 'Mitteilungsheft',
    roles: ['parent'],
    body: (
      <>Das <b>Mitteilungsheft</b> ist Ihr direkter Draht zur Lehrperson — wie das klassische Heft, nur digital. Nachrichten landen hier gesammelt, Sie können jederzeit antworten.</>
    ),
  },
  {
    icon: 'fact_check',
    title: 'Anwesenheit & Abmelden',
    roles: ['parent'],
    body: (
      <>Ist Ihr Kind krank, können Sie es unter <b>Anwesenheit</b> mit einem Tippen abmelden. Die Lehrperson sieht die Meldung sofort und bestätigt sie. Vergangene Fehltage bleiben übersichtlich aufgelistet.</>
    ),
  },
  {
    icon: 'verified',
    title: 'Hausübungen bestätigen',
    roles: ['parent'],
    body: (
      <>Wenn Ihr Kind eine Hausübung als erledigt markiert, taucht sie bei Ihnen zur <b>Bestätigung</b> auf. Ein kurzes Tippen genügt — das hält die Flamme Ihres Kindes am Leben und gibt der Lehrperson ein verlässliches Bild.</>
    ),
  },
  {
    icon: 'groups',
    title: 'Die Klasse begleiten',
    roles: ['teacher'],
    body: (
      <>Diese Seite ist vor allem für Kinder und Eltern gedacht — als Nachschlagewerk, das mit dem System mitwächst. Als Lehrperson finden Sie hier den Blick darauf, was Ihre Klasse sieht. Die Abenteuer-Statistik auf der Abenteuer-Seite gibt Ihnen den Wochenüberblick pro Kind.</>
    ),
  },
]

/** "Erste Schritte" — der durchblätterbare Anleitungs-Hub. Akkordeon-Karten,
 *  die erste ist offen. Rollen-gefiltert (siehe GUIDES.roles). */
export default function AnleitungOverview({ role }: { role: Role }) {
  const valaPortrait = GUIDE_PORTRAIT['landscape']
  const guides = GUIDES.filter(g => g.roles.includes(role))
  const [open, setOpen] = useState<number>(0)

  const intro = role === 'parent'
    ? 'Schön, dass Sie da sind. Ich bin Vala und begleite die Klasse durch ihre Abenteuer. Hier erkläre ich in Ruhe, wie alles funktioniert — jederzeit zum Nachlesen, ganz ohne Eile.'
    : role === 'teacher'
      ? 'Willkommen. Ich bin Vala, die Bergführerin der Klasse. Diese Seite ist das Nachschlagewerk für Ihre Schüler:innen und deren Eltern — hier steht, wie sich die App anfühlt, wenn man Kind ist.'
      : 'Hallo! Ich bin Vala, deine Bergführerin. Bevor wir losgehen, zeige ich dir in Ruhe, wie alles funktioniert. Du kannst jederzeit hierher zurückkommen und nachblättern — nichts musst du auswendig können.'

  return (
    <>
      <header className="mb-6 flex items-center gap-3.5">
        <Link
          href="/streaks"
          className="w-9 h-9 rounded-xl bg-white border border-kh-border/60 flex items-center justify-center flex-shrink-0 hover:border-kh-teal transition-colors"
          aria-label="Zurück zum Abenteuer"
        >
          <span className="msym text-[18px] text-kh-muted">arrow_back</span>
        </Link>
        <div className="min-w-0">
          <h1 className="text-[25px] max-md:text-[22px] font-extrabold text-kh-dark tracking-tight leading-tight">Erste Schritte</h1>
          <p className="text-[13.5px] text-kh-muted font-medium leading-tight mt-0.5">So funktioniert KlassenHub — jederzeit zum Nachblättern</p>
        </div>
      </header>

      {/* Vala-Intro */}
      <div className="kh-card p-5 mb-5 flex items-start gap-4">
        {valaPortrait ? (
          <img src={valaPortrait} alt="Bergführerin Vala" className="w-16 h-16 rounded-full object-cover object-top ring-2 ring-white shadow-sm flex-shrink-0 bg-[#EFEAE0]" />
        ) : (
          <span className="w-16 h-16 rounded-full bg-gradient-to-br from-[#E0A94B] to-[#B8721E] flex items-center justify-center flex-shrink-0 ring-2 ring-white shadow-sm">
            <span className="msym text-[28px] text-white" aria-hidden="true">landscape</span>
          </span>
        )}
        <div className="min-w-0">
          <p className="text-[10.5px] font-bold text-kh-muted uppercase tracking-wide mb-1">Bergführerin Vala</p>
          <p className="text-[13.5px] text-kh-dark/90 leading-relaxed">{intro}</p>
        </div>
      </div>

      {/* Anleitungs-Akkordeon */}
      <div className="flex flex-col gap-2.5">
        {guides.map((g, i) => {
          const isOpen = open === i
          return (
            <div key={g.title} className="kh-card overflow-hidden">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? -1 : i)}
                aria-expanded={isOpen}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-[#FAF8F3] transition-colors"
              >
                <span className="w-9 h-9 rounded-xl bg-kh-teal/12 flex items-center justify-center flex-shrink-0">
                  <span className="msym text-[19px] text-kh-teal" style={{ fontVariationSettings: "'FILL' 1" }}>{g.icon}</span>
                </span>
                <span className="flex-1 font-extrabold text-[14.5px] text-kh-dark">{g.title}</span>
                <span
                  className="msym text-[20px] text-kh-muted flex-shrink-0 transition-transform duration-200"
                  style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }}
                >
                  expand_more
                </span>
              </button>
              {isOpen && (
                <div className="px-4 pb-4 pt-0.5 pl-[64px]">
                  <p className="text-[13px] text-kh-dark/80 leading-relaxed">{g.body}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
