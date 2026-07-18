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
      <>Unter <b>Hausübungen</b> siehst du alles, was gerade ansteht. Tippe eine Aufgabe an, sobald du sie erledigt hast, zum Beispiel „Übungsblatt Seite 12, Nummer 1 bis 6", und sie wird als erledigt markiert. Ist etwas bald fällig, wandert die Hausübungs-Karte auf der Startseite automatisch ganz nach oben, damit du nichts übersiehst. Deine Eltern bestätigen die Erledigung anschließend noch kurz mit einem Tippen, das hält eure gemeinsame Flamme am Leben.</>
    ),
  },
  {
    icon: 'local_fire_department',
    title: 'Deine Flamme & der Rucksack',
    roles: ['student'],
    body: (
      <>Jede von deinen Eltern bestätigte Hausübung hält deine <b>Flamme</b> am Brennen, ganz privat und ohne Rangliste. Reißt sie doch einmal ab, zum Beispiel weil eine Hausübung vergessen wurde, hilft dir vielleicht der <b>Rucksack</b> weiter. Dort sammeln sich nützliche Werkzeuge: Der <b>Schutzschild</b> fängt einmal pro Monat eine vergessene Hausübung ab, ohne dass die Flamme erlischt, und der <b>Zeitkristall</b> verlängert die Frist einer Hausübung um ein paar Tage. Beide laden sich am Monatsanfang wieder auf. Tippe im Rucksack einfach auf ein Werkzeug, dann erkläre ich dir genau, was es kann und ob es gerade einsatzbereit ist.</>
    ),
  },
  {
    icon: 'explore',
    title: 'Wochen-Quests & Rätsel',
    roles: ['student'],
    body: (
      <>Jede Woche warten ein paar <b>Quests</b> auf dich, kleine Ziele wie zum Beispiel „an drei verschiedenen Tagen eine Hausübung erledigen" oder „deinen Dienst zuverlässig übernehmen". Manche Quests lassen dich zwischen zwei Wegen wählen, etwa zwischen dem Pfad des Chronisten und dem Pfad des Boten. Dazu gibt es <b>Rätsel</b>: Sie verlangen, dass du in der Geschichte unserer Welten noch einmal nachliest, denn die Antworten verstecken sich in den Erzähltexten von „Die Reise". Neugier lohnt sich also wortwörtlich.</>
    ),
  },
  {
    icon: 'push_pin',
    title: 'Erinnerungen & Termine',
    roles: ['student', 'parent'],
    body: (
      <>Wichtige Hinweise deiner Lehrperson findest du unter <b>Erinnerungen</b>, zum Beispiel „Turnzeug für Mittwoch nicht vergessen". Alle Ausflüge, Schularbeiten und Feste stehen unter <b>Termine</b>, der nächste bevorstehende Termin wird dir dort immer zuerst angezeigt. Manche Erinnerungen und Termine sind gezielt nur an dich gerichtet, etwa ein persönlicher Referatstermin, die anderen Kinder der Klasse sehen sie dann gar nicht.</>
    ),
  },
  {
    icon: 'cleaning_services',
    title: 'Dienste',
    roles: ['student'],
    body: (
      <>Bist du diese Woche für einen <b>Dienst</b> eingeteilt, zum Beispiel Tafel wischen oder Blumen gießen, siehst du das direkt auf der Startseite. Tippe den jeweiligen Wochentag an, sobald du deinen Dienst erledigt hast. So weiß die ganze Klasse, dass man sich auf dich verlassen kann, ganz ohne dass jemand extra nachfragen muss.</>
    ),
  },
  {
    icon: 'calendar_view_week',
    title: 'Stundenplan',
    roles: ['student', 'parent'],
    body: (
      <>Dein <b>Stundenplan</b> zeigt dir die ganze Woche auf einen Blick, die heutige Spalte ist dabei farblich hervorgehoben. Ein kleines Warnzeichen an einer Stunde bedeutet, dass in diesem Fach demnächst eine Hausübung fällig wird. Deine Lehrperson gibt euch zu Schulbeginn einen Standard-Stundenplan vor, einzelne Stunden kannst du bei Bedarf aber selbst anpassen, etwa wenn du einen Freigegenstand besuchst.</>
    ),
  },
  {
    icon: 'menu_book',
    title: 'Mitteilungsheft',
    roles: ['parent'],
    body: (
      <>Das <b>Mitteilungsheft</b> ist Ihr direkter digitaler Draht zur Lehrperson, ganz ähnlich wie das klassische Mitteilungsheft aus Papier, nur ohne dass etwas in der Schultasche verloren gehen kann. Nachrichten der Lehrperson landen hier gesammelt und übersichtlich, Sie können jederzeit direkt darauf antworten, zum Beispiel um eine Abwesenheit anzukündigen oder eine Rückfrage zu stellen.</>
    ),
  },
  {
    icon: 'fact_check',
    title: 'Anwesenheit & Abmelden',
    roles: ['parent'],
    body: (
      <>Ist Ihr Kind krank oder aus einem anderen Grund verhindert, können Sie es unter <b>Anwesenheit</b> mit wenigen Tippen abmelden, etwa mit dem Vermerk „Zahnarzttermin". Die Lehrperson sieht Ihre Meldung sofort und bestätigt sie anschließend. Vergangene Fehltage bleiben dabei übersichtlich aufgelistet, sodass Sie jederzeit den Überblick behalten.</>
    ),
  },
  {
    icon: 'verified',
    title: 'Hausübungen bestätigen',
    roles: ['parent'],
    body: (
      <>Sobald Ihr Kind eine Hausübung als erledigt markiert hat, taucht sie bei Ihnen zur <b>Bestätigung</b> auf. Ein kurzes Tippen genügt, zum Beispiel direkt nach dem gemeinsamen Kontrollieren der Aufgabe. Das hält die Flamme Ihres Kindes am Leben und gibt der Lehrperson gleichzeitig ein verlässliches Bild davon, wie zuverlässig zu Hause gearbeitet wird.</>
    ),
  },
  {
    icon: 'groups',
    title: 'Die Klasse begleiten',
    roles: ['teacher'],
    body: (
      <>Diese Seite ist vor allem für Kinder und deren Eltern gedacht, als Nachschlagewerk, das mit dem System mitwächst. Als Lehrperson finden Sie hier trotzdem einen nützlichen Blick darauf, was Ihre Klasse tatsächlich sieht und erlebt. Die Abenteuer-Statistik auf der Abenteuer-Seite gibt Ihnen zusätzlich einen kompakten Wochenüberblick pro Kind, zum Beispiel wie viele Quests oder Rätsel bereits gelöst wurden.</>
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
    ? 'Schön, dass Sie da sind. Ich bin Vala und begleite die Klasse durch ihre Abenteuer. Hier erkläre ich in Ruhe, wie alles funktioniert, jederzeit zum Nachlesen und ganz ohne Eile.'
    : role === 'teacher'
      ? 'Willkommen. Ich bin Vala, die Bergführerin der Klasse. Diese Seite ist das Nachschlagewerk für Ihre Schüler:innen und deren Eltern, hier steht, wie sich die App anfühlt, wenn man Kind ist.'
      : 'Hallo! Ich bin Vala, deine Bergführerin. Bevor wir losgehen, zeige ich dir in Ruhe, wie alles funktioniert. Du kannst jederzeit hierher zurückkommen und nachblättern, nichts musst du auswendig können.'

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
          <p className="text-[13.5px] text-kh-muted font-medium leading-tight mt-0.5">So funktioniert KlassenHub, jederzeit zum Nachblättern</p>
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
                className="group w-full flex items-center gap-3 px-4 py-3.5 text-left"
              >
                <span className="w-9 h-9 rounded-xl bg-kh-teal/12 flex items-center justify-center flex-shrink-0">
                  <span className="msym text-[19px] text-kh-teal" style={{ fontVariationSettings: "'FILL' 1" }}>{g.icon}</span>
                </span>
                <span className="flex-1 font-extrabold text-[14.5px] text-kh-dark">{g.title}</span>
                {/* Hover-Hinweis statt Hintergrundfläche: der Pfeil sinkt beim
                    Hover, solange die Karte zu ist (Einladung zum Aufklappen),
                    und hebt sich beim Hover, sobald sie offen ist (Einladung
                    zum Einklappen) — die Drehung selbst bleibt klick-gebunden. */}
                <span
                  className={`msym text-[20px] text-kh-muted flex-shrink-0 transition-transform duration-200 ${
                    isOpen ? 'rotate-180 group-hover:-translate-y-1' : 'group-hover:translate-y-1'
                  }`}
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
