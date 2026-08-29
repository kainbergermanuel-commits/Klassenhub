'use client'

import { useState } from 'react'
import IconButton from '@/components/ui/IconButton'
import type { Role } from '@/lib/types'
import { getSeasonTheme, guideShortName, isCollectiveGuide, GUIDE_PORTRAIT } from '@/lib/seasonTheme'

/** Volle Figur (keine runde Portrait-Kachel) — eigenes Bild für diese Seite,
 *  nicht das GUIDE_PORTRAIT-Rundbild aus lib/seasonTheme.ts. Quelldatei ist
 *  ca. 335×665px, daher bewusst nicht über ~180px Breite hinaus vergrößern. */
const VALA_FULL_FIGURE = '/images/characters/vala-first-steps.webp'

/** Eine Anleitung: welt-neutral formuliert, gesprochen von der Figur der
 *  gerade laufenden Welt (siehe `speaker` unten). `roles` steuert, wem der
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
      <>Unter <b>Hausübungen</b> siehst du alles, was gerade ansteht. Tippe eine Aufgabe an, sobald du sie erledigt hast, zum Beispiel „Übungsblatt Seite 12, Nummer 1 bis 6", und sie wird als erledigt markiert. Ist etwas bald fällig, wandert die Hausübungs-Karte auf der Startseite automatisch ganz nach oben, damit du nichts übersiehst. Wichtig ist nur der richtige Zeitpunkt: Wann genau eine Hausübung fertig sein muss, steht gleich im nächsten Abschnitt. Deine Eltern bestätigen die Erledigung anschließend noch kurz mit einem Tippen, das hält eure gemeinsame Flamme am Leben.</>
    ),
  },
  {
    icon: 'event_available',
    title: 'Wann muss eine Hausübung fertig sein?',
    roles: ['student', 'parent'],
    body: (
      <>Bei jeder Hausübung steht ein <b>Fälligkeitstag</b>. Gemeint ist damit der Tag, an dem sie in der Schule gebraucht wird, also der Tag, an dem sie <b>schon fertig sein muss</b>. Steht bei einer Hausübung „Fällig: Mittwoch", dann machst du sie am <b>Dienstag</b> und hakst sie am Dienstagabend ab. Am Mittwoch selbst lässt sich das Häkchen nicht mehr setzen, dann ist die Hausübung vorbei.<br /><br />Damit du das nicht im Kopf mitrechnen musst, sagt es die App direkt: „Morgen fällig" heißt „heute erledigen", und dann erscheint zusätzlich ein kleines Warnzeichen. Steht ein Datum weiter weg, siehst du „In 3 Tagen" und musst noch nichts tun. Wenn du mit der Maus über das Datum fährst, wird dir der genaue Tag angezeigt.<br /><br />Eine Sache ist entspannter, als sie klingt: Nur dein <b>Häkchen</b> muss am Vorabend gesetzt sein. Die <b>Bestätigung deiner Eltern</b> darf ruhig später kommen, auch am nächsten Tag oder übermorgen. Sie zählt dann trotzdem noch, und deine Flamme bleibt am Leben.</>
    ),
  },
  {
    icon: 'local_fire_department',
    title: 'Deine Flamme & der Rucksack',
    roles: ['student'],
    body: (
      <>Jede von deinen Eltern bestätigte Hausübung hält deine <b>Flamme</b> am Brennen, ganz privat und ohne Rangliste. Reißt sie doch einmal ab, zum Beispiel weil eine Hausübung vergessen wurde, hilft dir vielleicht der <b>Rucksack</b> weiter. Dort sammeln sich nützliche Werkzeuge: Der <b>Schutzschild</b> fängt einmal pro Monat eine vergessene Hausübung ab, ohne dass die Flamme erlischt, und der <b>Zeitkristall</b> verlängert die Frist einer Hausübung um ein paar Tage. Setzt du den Zeitkristall ein, taucht die Hausübung unter „Hausübungen" wieder bei den anstehenden auf und lässt sich ganz normal abhaken, mit einem kleinen Hinweis auf die verlängerte Frist. Deine Lehrperson sieht diesen Hinweis auch, das ist kein Geheimnis, sondern dein gutes Recht. Beide laden sich am Monatsanfang wieder auf. Tippe im Rucksack einfach auf ein Werkzeug, dann erkläre ich dir genau, was es kann und ob es gerade einsatzbereit ist.</>
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
    icon: 'groups',
    title: 'Das Klassenziel & die Reise',
    roles: ['student', 'parent'],
    body: (
      <>Jede von den Eltern bestätigte Hausübung zählt nicht nur für die eigene Flamme, sondern auch auf ein gemeinsames <b>Klassenziel</b>. Je mehr zusammenkommt, desto weiter kommt die ganze Klasse auf ihrer <b>Reise</b>. Jeden Monat führt euch eine andere Figur durch eine andere Welt, im September zum Beispiel Bergführerin Vala auf einen Gipfel, im Oktober der Bordcomputer ARI ins All. Unter „Die Reise" kannst du jedes Kapitel in Ruhe nachlesen, auch die aus den Monaten davor. Wichtig ist nur: Hier gewinnt niemand gegen jemanden, ihr kommt gemeinsam weiter oder gar nicht.</>
    ),
  },
  {
    icon: 'diversity_3',
    title: 'Deine Gilde',
    roles: ['student'],
    body: (
      <>Jeden Monat wirst du zusammen mit drei oder vier anderen Kindern einer <b>Gilde</b> zugelost, zum Beispiel den „Sternensuchern". Die Gilde bekommt eine eigene Aufgabe, die ihr nur gemeinsam schafft, etwa zusammen fünf Hausübungen zu sammeln. Die Einteilung wechselt jeden Monat, du bist also nie dauerhaft in derselben Gruppe. Und es gibt keine Rangliste zwischen den Gilden: Jede Gilde arbeitet auf ihr eigenes Ziel hin, nicht gegen die anderen.</>
    ),
  },
  {
    icon: 'diamond',
    title: 'Der Splitter',
    roles: ['student'],
    body: (
      <>Im November findet ihr in einer Schatzkammer einen kleinen, warm leuchtenden Stein voller Zeichen, die niemand lesen kann. Dieser <b>Splitter</b> begleitet euch danach durch das ganze Schuljahr, und in jeder Welt erwacht eines seiner sieben Zeichen. Du findest ihn ganz unten in deinem Rucksack. Was er wirklich ist, verrät sich erst am Ende der Reise, und es ist etwas anderes, als alle denken.</>
    ),
  },
  {
    icon: 'auto_stories',
    title: 'Heldenbuch & Logbuch',
    roles: ['student'],
    body: (
      <>Dein <b>Heldenbuch</b> ist deine ganz private Rückschau, niemand sonst sieht es. Oben stehen deine Flamme und eine kurze Notiz deiner Guide-Figur, unten das <b>Logbuch</b>: eine Liste mit allem, was du geschafft hast, mit Datum. Geschaffte Quests, gelöste Rätsel, eingesetzte Werkzeuge, erwachte Zeichen. Daneben wächst dein persönliches <b>Wappen</b>, das sich mit jedem Erfolg um ein Stück füllt.</>
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
      <>Sobald Ihr Kind eine Hausübung als erledigt markiert hat, taucht sie bei Ihnen zur <b>Bestätigung</b> auf: gesammelt auf der Startseite und zusätzlich direkt bei der jeweiligen Aufgabe unter <b>Hausübungen</b>. Ein kurzes Tippen genügt, zum Beispiel direkt nach dem gemeinsamen Kontrollieren der Aufgabe. Das hält die Flamme Ihres Kindes am Leben und gibt der Lehrperson gleichzeitig ein verlässliches Bild davon, wie zuverlässig zu Hause gearbeitet wird.<br /><br /><b>Sie stehen dabei nicht unter Zeitdruck.</b> Nur das Häkchen Ihres Kindes ist an den Abend vor dem Fälligkeitstag gebunden. Ihre Bestätigung darf jederzeit später nachkommen, auch Tage danach, und wird rückwirkend mitgezählt. Solange eine Bestätigung noch aussteht, zeigt die App bei der Hausübung „Wartet auf Bestätigung" an, damit nichts untergeht.</>
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
export default function AnleitungOverview({ role, season }: { role: Role; season: string }) {
  const guides = GUIDES.filter(g => g.roles.includes(role))
  const [open, setOpen] = useState<number>(0)

  // Die Seite wird von der Figur der LAUFENDEN Welt gesprochen, nicht mehr
  // fest von Vala — sonst begrüßt im Mai noch immer eine Bergführerin, die
  // die Klasse seit acht Monaten nicht mehr begleitet.
  const theme = getSeasonTheme(season)
  const speaker = theme.guide
  const shortName = guideShortName(speaker)
  // Der Sonnenhafen wird von allen Guides gemeinsam gesprochen — ein Plural.
  // Ohne diese Unterscheidung stünde hier „Ich bin gemeinsam und begleite …".
  const team = isCollectiveGuide(speaker)
  const selfIntro = team ? 'Wir sind alle Guides gemeinsam' : `Ich bin ${shortName}`
  // Rundes Guide-Portrait der laufenden Welt, falls es eines gibt; bei
  // 'landscape' (Vala) bewusst keines, dort steht die Vollfigur.
  const portrait = theme.icon === 'landscape' ? undefined : GUIDE_PORTRAIT[theme.icon]

  const intro = role === 'parent'
    ? `Schön, dass Sie da sind. ${selfIntro} und ${team ? 'begleiten' : 'begleite'} die Klasse diesen Monat durch ihr Abenteuer. Hier ${team ? 'erklären wir' : 'erkläre ich'} in Ruhe, wie alles funktioniert, jederzeit zum Nachlesen und ganz ohne Eile.`
    : role === 'teacher'
      ? `Willkommen. ${selfIntro} und ${team ? 'führen' : 'führe'} die Klasse gerade durch „${theme.name}". Diese Seite ist das Nachschlagewerk für Ihre Schüler:innen und deren Eltern, hier steht, wie sich die App anfühlt, wenn man Kind ist.`
      : `Hallo! ${selfIntro} und ${team ? 'begleiten' : 'begleite'} euch gerade durch „${theme.name}". Bevor es weitergeht, ${team ? 'zeigen wir dir' : 'zeige ich dir'} in Ruhe, wie alles funktioniert. Du kannst jederzeit hierher zurückkommen und nachblättern, nichts musst du auswendig können.`

  return (
    <>
      <header className="mb-6">
        <div className="min-w-0">
          <h1 className="text-[25px] max-md:text-[22px] font-extrabold text-kh-dark tracking-tight leading-tight">Erste Schritte</h1>
          <p className="text-[13.5px] text-kh-muted font-medium leading-tight mt-0.5">So funktioniert KlassenHub, jederzeit zum Nachblättern</p>
        </div>
      </header>

      {/* Zweispaltig auf Desktop: FAQ links, Vala mit Sprechblase rechts
          (sticky, bleibt beim Scrollen der Kartenliste sichtbar) — auf Mobile
          bleibt Vala oben, gestapelt vor dem Akkordeon (DOM-Reihenfolge). */}
      <div className="flex flex-col lg:grid lg:grid-cols-[1fr_260px] lg:gap-6 lg:items-start">
        {/* Anleitungs-Akkordeon */}
        <div className="flex flex-col gap-2.5 order-2 lg:order-1">
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

        {/* Vala als volle Figur + Sprechblase */}
        <div className="order-1 lg:order-2 mb-5 lg:mb-0 lg:sticky lg:top-7">
          <div className="flex lg:flex-col items-center lg:items-center gap-4 lg:gap-0">
            {/* Sprechblase: auf Desktop über der Figur (Pfeil zeigt nach unten
                zu Vala), auf Mobile daneben (Pfeil zeigt nach links zu Vala) —
                dieselbe Idee wie StudentCard.tsx, nur größenmäßig für Fließtext
                statt einem kurzen Reaktions-Wort. */}
            <div className="relative flex-1 min-w-0 lg:flex-none bg-white border border-kh-border shadow-[0_8px_20px_rgba(20,40,45,.10)] rounded-2xl px-4 py-3.5 order-2 lg:order-1 lg:mb-3">
              <p className="text-[10.5px] font-bold text-kh-muted uppercase tracking-wide mb-1">{speaker}</p>
              <p className="text-[12.5px] text-kh-dark/90 leading-relaxed">{intro}</p>
              {/* Pfeil Desktop: unten Mitte, zeigt zur Figur darunter */}
              <span className="hidden lg:block absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-r-[8px] border-t-[10px] border-l-transparent border-r-transparent border-t-kh-border" />
              <span className="hidden lg:block absolute -bottom-[7px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[7px] border-r-[7px] border-t-[9px] border-l-transparent border-r-transparent border-t-white" />
              {/* Pfeil Mobile: links Mitte, zeigt zur Figur daneben */}
              <span className="lg:hidden absolute top-1/2 -translate-y-1/2 -left-2 w-0 h-0 border-t-[8px] border-b-[8px] border-r-[10px] border-t-transparent border-b-transparent border-r-kh-border" />
              <span className="lg:hidden absolute top-1/2 -translate-y-1/2 -left-[7px] w-0 h-0 border-t-[7px] border-b-[7px] border-r-[9px] border-t-transparent border-b-transparent border-r-white" />
            </div>

            {/* Vollfigur gibt es nur von Vala; für alle anderen Welten das
                runde Portrait aus GUIDE_PORTRAIT, damit immer die Figur zu
                sehen ist, die gerade spricht. Wichtig: Welten ohne eigenes
                Portrait (z.B. Sonnenhafen, wo alle Guides gemeinsam sprechen)
                fallen auf Valas Vollfigur zurueck - die darf dann NICHT rund
                beschnitten werden, sonst schneidet die Ellipse ihre winkende
                Hand oben links ab. */}
            <img
              src={portrait ?? VALA_FULL_FIGURE}
              alt={speaker}
              className={`order-1 lg:order-2 flex-shrink-0 h-auto ${portrait ? 'w-[96px] lg:w-[150px] rounded-full object-cover object-top ring-4 ring-white shadow-md' : 'w-[110px] lg:w-[180px]'}`}
            />
          </div>
        </div>
      </div>
    </>
  )
}
