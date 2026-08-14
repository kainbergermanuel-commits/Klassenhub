import type { Role } from '@/lib/types'
import PageHeader from '@/components/layout/PageHeader'
import AnimateIn from '@/components/ui/AnimateIn'
import {
  PRIVACY_INFO,
  PRIVACY_INFO_LABEL,
  isPlaceholder,
  openPrivacyInfoKeys,
  type PrivacyInfoKey,
} from '@/lib/privacyInfo'

/** Datenschutzseite, rollenspezifisch.
 *
 *  Grundlage ist die vollständige Datenaufnahme in docs/datenbestand.md.
 *  Kommt dort eine Tabelle dazu, muss sie hier nachgezogen werden.
 *
 *  Zwei Regeln, die beim Ändern gelten:
 *
 *  1. Die Seite beschreibt die APP. Kein Wort zur Begleitforschung — die
 *     App-Nutzung ist verpflichtend, eine Forschungsteilnahme wäre freiwillig,
 *     und die beiden Ebenen dürfen sich auf keiner Oberfläche berühren.
 *  2. Beschrieben wird, was die App ANZEIGT. Wo die Datenbank technisch mehr
 *     erlaubt als die Oberfläche zeigt (siehe docs/datenbestand.md, Punkt 3.1),
 *     wird das hier nicht als Verbot ausgegeben. */

interface Props {
  role: Role
}

interface Group {
  icon: string
  title: string
  items: string[]
}

// ─── Was gespeichert wird ─────────────────────────────────────────────────

function storedGroups(role: Role): Group[] {
  const isStudent = role === 'student'

  const konto: Group = {
    icon: 'badge',
    title: 'Konto',
    items: isStudent
      ? [
          'Dein Benutzername und dein Passwort',
          'Dein Name und deine Klasse',
          'Dein Avatar: Farbe, Frisur, Hautton',
        ]
      : [
          'Benutzername und Passwort (das Passwort nur verschlüsselt)',
          'Name, Rolle und Klasse',
          'Avatar-Einstellungen: Farbe, Frisur, Hautton',
        ],
  }

  const hausuebungen: Group = {
    icon: 'menu_book',
    title: 'Hausübungen',
    items: isStudent
      ? [
          'Welche Hausübung du erledigt hast und wann',
          'Ob deine Eltern es bestätigt haben',
          'Ob du eine Fristverlängerung genutzt hast',
        ]
      : [
          'Welche Hausübung wann als erledigt markiert wurde',
          'Wann eine Erledigung von einem Elternteil bestätigt wurde',
          'Genutzte Fristverlängerungen und Erinnerungen an die Eltern',
        ],
  }

  const abenteuer: Group = {
    icon: 'local_fire_department',
    title: 'Abenteuer',
    items: isStudent
      ? [
          'Deine Flamme und die Meilensteine, die du erreicht hast',
          'Genutzte Joker und Zeitkristalle',
          'Welchen Weg du bei einer Quest gewählt hast',
          'Welche Rätsel du gelöst hast',
        ]
      : [
          'Erreichte Meilensteine der Streak',
          'Genutzte Joker und Zeitkristalle',
          'Gewählte Quest-Pfade und gelöste Rätsel',
          'Der Fortschritt beim gemeinsamen Klassenziel',
        ],
  }

  const alltag: Group = {
    icon: 'calendar_month',
    title: 'Schulalltag',
    items: isStudent
      ? [
          'Dein Stundenplan',
          'Deine Dienste und ob du sie erledigt hast',
          'Termine deiner Klasse',
          'Ob du eine Erinnerung schon gesehen hast',
        ]
      : [
          'Stundenplan der Klasse und der einzelnen Kinder',
          'Dienste und deren Erledigung',
          'Termine, auch persönliche Termine einzelner Kinder',
          'Erinnerungen und wer sie bereits gesehen hat',
        ],
  }

  const anwesenheit: Group = {
    icon: 'event_available',
    title: 'Anwesenheit',
    items: isStudent
      ? [
          'An welchen Tagen du gefehlt hast',
          'Ob das Fehlen entschuldigt war',
          'Eine kurze Notiz dazu, die deine Eltern oder deine Lehrperson schreiben',
        ]
      : [
          'Datum und Status jeder Abwesenheit (entschuldigt oder unentschuldigt)',
          'Eine Notiz im Freitext, dazu wer gemeldet und wer bestätigt hat',
        ],
  }

  const heft: Group = {
    icon: 'forum',
    title: 'Mitteilungsheft',
    items: [
      'Der Text der Nachrichten',
      'Wer sie geschrieben hat und wann',
      'Wann sie gelesen und, falls verlangt, bestätigt wurde',
    ],
  }

  // Kinder haben kein Mitteilungsheft — es läuft zwischen Lehrperson und
  // Elternteil, deshalb taucht es in der Schüler-Fassung nicht auf.
  return isStudent
    ? [konto, hausuebungen, abenteuer, alltag, anwesenheit]
    : [konto, hausuebungen, abenteuer, alltag, anwesenheit, heft]
}

// ─── Wer sieht was ────────────────────────────────────────────────────────

function visibility(role: Role): { icon: string; who: string; text: string }[] {
  if (role === 'student') {
    return [
      {
        icon: 'school',
        who: 'Deine Lehrperson',
        text: 'sieht alles, was oben steht. Das braucht sie, um die Klasse zu führen.',
      },
      {
        icon: 'family_restroom',
        who: 'Deine Eltern',
        text: 'sehen deine Hausübungen, deine Flamme, deine Termine und deine Anwesenheit. Sie sehen dieselben Dinge wie du.',
      },
      {
        icon: 'group',
        who: 'Deine Mitschüler:innen',
        text: 'sehen nur deinen Namen und deinen Avatar. Sie sehen nicht, welche Hausübungen du erledigt hast, und sie sehen deine Flamme nicht. Es gibt in der App keine Rangliste.',
      },
      {
        icon: 'visibility_off',
        who: 'Niemand außer dir',
        text: 'sieht deine gelösten Rätsel, deine Erfolge im Rucksack und wie oft du bei einem Rätsel probiert hast.',
      },
    ]
  }

  if (role === 'parent') {
    return [
      {
        icon: 'family_restroom',
        who: 'Sie als Elternteil',
        text: 'sehen Ihr eigenes Kind: Hausübungen, Flamme, Termine, Anwesenheit und Ihr eigenes Mitteilungsheft. Andere Kinder werden Ihnen nie namentlich angezeigt.',
      },
      {
        icon: 'school',
        who: 'Die Lehrpersonen der Klasse',
        text: 'sehen alle oben genannten Daten der Klasse. Das ist für die Klassenführung nötig.',
      },
      {
        icon: 'child_care',
        who: 'Ihr Kind',
        text: 'sieht seine eigenen Daten und von den anderen Kindern nur Name und Avatar.',
      },
      {
        icon: 'groups',
        who: 'Andere Eltern',
        text: 'sehen Ihr Kind nicht. Das Mitteilungsheft ist streng getrennt: Auch bei einer Sammelnachricht bekommt jedes Elternteil eine eigene Kopie im eigenen Heft.',
      },
      {
        icon: 'leaderboard',
        who: 'Gemeinsam sichtbar',
        text: 'ist nur der Fortschritt beim Klassenziel, und zwar als Summe der ganzen Klasse ohne Namen.',
      },
    ]
  }

  return [
    {
      icon: 'school',
      who: 'Lehrpersonen',
      text: 'sehen alle Daten der eigenen Klassen. Die Unterrichtsplanung und der eigene Stundenplan samt Gangaufsichten sind ausschließlich für Lehrpersonen sichtbar.',
    },
    {
      icon: 'family_restroom',
      who: 'Eltern',
      text: 'sehen in der Oberfläche ausschließlich das eigene Kind sowie das eigene Mitteilungsheft. Andere Kinder erscheinen nirgends namentlich.',
    },
    {
      icon: 'child_care',
      who: 'Schüler:innen',
      text: 'sehen die eigenen Daten. Von Mitschüler:innen sind nur Name und Avatar sichtbar, keine Erledigungen und keine Streak. Eine Rangliste gibt es bewusst nicht.',
    },
    {
      icon: 'lock',
      who: 'Niemand außer dem Kind',
      text: 'sieht gelöste Rätsel, Rucksack-Erfolge und Rätsel-Versuche. Diese Tabellen haben bewusst keine Eltern- oder Lehrer-Leseberechtigung.',
    },
  ]
}

// ─── Seite ────────────────────────────────────────────────────────────────

const NOT_STORED = [
  'Keine E-Mail-Adressen von Kindern. Der Login läuft über einen Benutzernamen.',
  'Keine Telefonnummern, Wohnadressen oder Geburtsdaten.',
  'Keine hochgeladenen Dateien und keine Fotos.',
  'Keine Standortdaten.',
  'Keine Werbung, keine Analyse-Dienste, kein Tracking.',
  'Keine Weitergabe an Dritte.',
]

export default function PrivacyOverview({ role }: Props) {
  const isStudent = role === 'student'
  const isTeacher = role === 'teacher'
  const groups = storedGroups(role)
  const whoSeesWhat = visibility(role)
  const open = isTeacher ? openPrivacyInfoKeys() : []

  // Angaben, die noch Platzhalter sind, werden Kindern und Eltern gar nicht
  // gezeigt — eine halbfertige Auskunft ist schlechter als keine.
  const facts = (Object.keys(PRIVACY_INFO) as PrivacyInfoKey[]).filter(
    k => !isPlaceholder(PRIVACY_INFO[k])
  )

  return (
    <>
      <PageHeader
        icon="shield_person"
        title="Datenschutz"
        subtitle={
          isStudent
            ? 'Was KlassenHub über dich speichert und wer es sieht'
            : 'Welche Daten KlassenHub speichert und wer sie sieht'
        }
        gradient="from-kh-violet to-[#7B86D6]"
      />

      <div className="flex flex-col gap-4 max-w-3xl">
        {/* Einstieg */}
        <AnimateIn delay={0}>
          <section className="kh-card p-6">
            <p className="text-[14.5px] text-kh-dark font-medium leading-relaxed">
              {isStudent
                ? 'KlassenHub speichert nur das, was für die Schule gebraucht wird. Hier steht ehrlich, was das ist und wer es sehen kann. Wenn dir etwas davon komisch vorkommt, sag es deiner Lehrperson oder deinen Eltern.'
                : 'KlassenHub speichert ausschließlich Daten, die für den Schulalltag gebraucht werden. Diese Seite listet vollständig auf, welche das sind und wer sie sehen kann.'}
            </p>
          </section>
        </AnimateIn>

        {/* Offene Angaben — nur Lehrpersonen */}
        {open.length > 0 && (
          <AnimateIn delay={40}>
            <section className="rounded-2xl bg-kh-amber-light border border-kh-amber/25 p-5">
              <div className="flex items-start gap-3">
                <span
                  className="msym text-[22px] text-kh-amber flex-shrink-0"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  edit_note
                </span>
                <div className="min-w-0">
                  <h2 className="font-extrabold text-[15px] text-kh-dark">
                    Noch zu ergänzen
                  </h2>
                  <p className="text-[13.5px] text-kh-muted font-medium mt-1 leading-relaxed">
                    Diese Angaben lassen sich nicht aus der App ableiten und stehen
                    deshalb noch aus. Bis dahin werden sie Kindern und Eltern nicht
                    angezeigt. Einzutragen in{' '}
                    <code className="font-mono text-[12.5px] text-kh-dark">
                      lib/privacyInfo.ts
                    </code>
                    .
                  </p>
                  <ul className="mt-2.5 flex flex-wrap gap-1.5">
                    {open.map(k => (
                      <li
                        key={k}
                        className="text-[12.5px] font-bold text-kh-amber bg-white/70 rounded-full px-3 py-1"
                      >
                        {PRIVACY_INFO_LABEL[k]}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          </AnimateIn>
        )}

        {/* Was gespeichert wird */}
        <AnimateIn delay={80}>
          <section className="kh-card p-6">
            <SectionTitle
              icon="database"
              title={isStudent ? 'Was über dich gespeichert wird' : 'Welche Daten gespeichert werden'}
            />
            <div className="flex flex-col gap-3 mt-5">
              {groups.map(g => (
                <div key={g.title} className="kh-card-flat p-4">
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <span
                      className="msym text-[19px] text-kh-teal"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      {g.icon}
                    </span>
                    <h3 className="font-extrabold text-[14.5px] text-kh-dark">{g.title}</h3>
                  </div>
                  <ul className="flex flex-col gap-1.5">
                    {g.items.map(item => (
                      <li
                        key={item}
                        className="flex items-start gap-2 text-[13.5px] text-kh-muted font-medium leading-relaxed"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-kh-border mt-[7px] flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {!isStudent && (
              <p className="text-[13px] text-kh-muted font-medium mt-4 leading-relaxed">
                Die Notiz bei einer Abwesenheit ist ein freies Textfeld. Bitte
                schreiben Sie dort nur hinein, was die Schule wirklich wissen muss.
                Angaben zur Gesundheit sind besonders schützenswert und gehören nur
                dann in die App, wenn sie für die Entschuldigung nötig sind.
              </p>
            )}
          </section>
        </AnimateIn>

        {/* Wer sieht was */}
        <AnimateIn delay={120}>
          <section className="kh-card p-6">
            <SectionTitle icon="visibility" title="Wer sieht was" />
            <div className="flex flex-col gap-3 mt-5">
              {whoSeesWhat.map(v => (
                <div key={v.who} className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-kh-violet-light text-kh-violet flex items-center justify-center flex-shrink-0">
                    <span
                      className="msym text-[19px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      {v.icon}
                    </span>
                  </div>
                  <p className="text-[13.5px] text-kh-muted font-medium leading-relaxed pt-1">
                    <span className="font-extrabold text-kh-dark">{v.who}</span> {v.text}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </AnimateIn>

        {/* Was NICHT gespeichert wird */}
        <AnimateIn delay={160}>
          <section className="kh-card p-6">
            <SectionTitle
              icon="do_not_disturb_on"
              title={isStudent ? 'Was KlassenHub nicht speichert' : 'Was bewusst nicht gespeichert wird'}
            />
            <ul className="flex flex-col gap-2 mt-5">
              {NOT_STORED.map(n => (
                <li key={n} className="flex items-start gap-2.5">
                  <span
                    className="msym text-[18px] text-kh-green flex-shrink-0 mt-[1px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    check_circle
                  </span>
                  <span className="text-[13.5px] text-kh-dark font-medium leading-relaxed">{n}</span>
                </li>
              ))}
            </ul>
          </section>
        </AnimateIn>

        {/* Wo die Daten liegen */}
        {facts.length > 0 && (
          <AnimateIn delay={200}>
            <section className="kh-card p-6">
              <SectionTitle icon="dns" title="Wo die Daten liegen" />
              <dl className="flex flex-col gap-3 mt-5">
                {facts.map(k => (
                  <div key={k}>
                    <dt className="text-xs font-bold text-kh-muted uppercase tracking-wider">
                      {PRIVACY_INFO_LABEL[k]}
                    </dt>
                    <dd className="text-[13.5px] text-kh-dark font-medium mt-0.5 leading-relaxed">
                      {PRIVACY_INFO[k]}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          </AnimateIn>
        )}

        {/* Rechte */}
        <AnimateIn delay={240}>
          <section className="kh-card p-6">
            <SectionTitle
              icon="waving_hand"
              title={isStudent ? 'Was du tun kannst' : 'Ihre Rechte'}
            />
            <ul className="flex flex-col gap-2.5 mt-5">
              {(isStudent
                ? [
                    'Du kannst dein Passwort jederzeit in den Einstellungen ändern.',
                    'Du kannst deinen Avatar jederzeit ändern.',
                    'Du darfst fragen, was über dich gespeichert ist. Frag deine Lehrperson.',
                    'Wenn dir etwas unangenehm ist, sag es deiner Lehrperson oder deinen Eltern.',
                  ]
                : [
                    'Sie können jederzeit Auskunft darüber verlangen, welche Daten zu Ihrem Kind gespeichert sind.',
                    'Sie können die Berichtigung falscher Daten verlangen.',
                    'Sie können die Löschung von Daten verlangen, soweit keine schulrechtliche Aufbewahrungspflicht entgegensteht.',
                    'Passwort und Avatar lassen sich jederzeit selbst in den Einstellungen ändern.',
                  ]
              ).map(r => (
                <li key={r} className="flex items-start gap-2.5">
                  <span className="msym text-[18px] text-kh-teal flex-shrink-0 mt-[1px]">
                    arrow_circle_right
                  </span>
                  <span className="text-[13.5px] text-kh-dark font-medium leading-relaxed">{r}</span>
                </li>
              ))}
            </ul>

            {!isStudent && !isPlaceholder(PRIVACY_INFO.kontakt) && (
              <p className="text-[13.5px] text-kh-muted font-medium mt-4 leading-relaxed">
                Wenden Sie sich dafür an {PRIVACY_INFO.kontakt}.
              </p>
            )}
          </section>
        </AnimateIn>
      </div>
    </>
  )
}

function SectionTitle({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-11 h-11 rounded-[13px] bg-kh-teal-light text-kh-teal flex items-center justify-center flex-shrink-0">
        <span className="msym text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>
          {icon}
        </span>
      </div>
      <h2 className="font-extrabold text-[16px] text-kh-dark">{title}</h2>
    </div>
  )
}
