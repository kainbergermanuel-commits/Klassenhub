/** Angaben für die Datenschutzseite, die sich NICHT aus dem Code erheben
 *  lassen — Verantwortliche Stelle, Kontakt, Serverstandort, Aufbewahrungs-
 *  dauer. Bewusst hier gebündelt statt im JSX verstreut, damit klar ist, was
 *  von Hand gepflegt werden muss.
 *
 *  Solange ein Wert noch der Platzhalter ist, blendet /datenschutz einen
 *  Hinweis ein — aber NUR für Lehrpersonen. Kinder und Eltern sehen den
 *  betreffenden Punkt dann gar nicht, statt eine halbfertige Angabe zu lesen.
 *
 *  Vollständige Datenaufnahme: docs/datenbestand.md */

/** Marker für „noch nicht ausgefüllt". Ein Wert, der damit beginnt, gilt als
 *  Platzhalter (siehe isPlaceholder). */
const TODO = 'TODO:'

export const PRIVACY_INFO = {
  /** Verantwortliche Stelle im Sinne der DSGVO — die Schule bzw. die
   *  Klassenleitung, nicht der Entwickler. */
  verantwortlich: `${TODO} Name der Schule und der verantwortlichen Person`,

  /** Wohin sich Eltern mit Fragen, Auskunfts- oder Löschwünschen wenden. */
  kontakt: `${TODO} Kontaktadresse für Datenschutzfragen`,

  /** Region des Supabase-Projekts. Am 06.08.2026 direkt gegen die Live-DB
   *  geprüft (Datenschutz-Dossier, Strang B): Frankfurt, also kein
   *  Drittlandtransfer. */
  serverstandort:
    'Die Daten liegen auf Servern in Frankfurt am Main (Europäische Union). Sie verlassen die EU nicht.',

  /** Wie lange die Daten nach dem Schuljahr aufbewahrt werden. */
  aufbewahrung: `${TODO} Aufbewahrungsdauer und Zeitpunkt der Löschung`,
} as const

export type PrivacyInfoKey = keyof typeof PRIVACY_INFO

/** True, solange der Wert noch nicht von Hand gesetzt wurde. */
export function isPlaceholder(value: string): boolean {
  return value.startsWith(TODO)
}

/** Alle noch offenen Angaben — für den Lehrer-Hinweis auf der Seite. */
export function openPrivacyInfoKeys(): PrivacyInfoKey[] {
  return (Object.keys(PRIVACY_INFO) as PrivacyInfoKey[]).filter(k =>
    isPlaceholder(PRIVACY_INFO[k])
  )
}

/** Klartext-Bezeichnung für den Hinweis, welche Angabe noch fehlt. */
export const PRIVACY_INFO_LABEL: Record<PrivacyInfoKey, string> = {
  verantwortlich: 'Verantwortliche Stelle',
  kontakt: 'Kontakt für Datenschutzfragen',
  serverstandort: 'Serverstandort',
  aufbewahrung: 'Aufbewahrungsdauer',
}
