import { redirect } from 'next/navigation'
import { getEffectiveAuth } from '@/lib/previewAuth'
import PrivacyOverview from '@/components/datenschutz/PrivacyOverview'

/** Datenschutzseite: was die App speichert und wer es sieht, je nach Rolle
 *  unterschiedlich formuliert. Erreichbar über die Karte in den Einstellungen.
 *
 *  Inhaltliche Grundlage: docs/datenbestand.md — die vollständige Aufnahme
 *  aller Tabellen und ihrer RLS. */
export default async function DatenschutzPage() {
  const { user, profile } = await getEffectiveAuth()
  if (!user || !profile) redirect('/login')

  return <PrivacyOverview role={profile.role} />
}
