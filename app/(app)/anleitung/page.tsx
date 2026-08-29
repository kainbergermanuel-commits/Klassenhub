import { redirect } from 'next/navigation'
import { getEffectiveAuth } from '@/lib/previewAuth'
import AnleitungOverview from '@/components/anleitung/AnleitungOverview'
import { todayISO } from '@/lib/date'

/** "Erste Schritte" — der Anleitungs-Hub als EIGENER Menüpunkt (Abschnitt
 *  "Hilfe"). Lag zuvor als Unterseite unter Abenteuer und war damit nur
 *  sichtbar, wenn man ohnehin schon dort war — für Eltern, an die sich vier
 *  der Einträge exklusiv richten, praktisch unauffindbar.
 *  Jederzeit zum Nachblättern, kein aufgezwungenes Onboarding-Popup
 *  (Prinzip 4). Zuhause für alle How-tos; wächst mit dem System mit. */
export default async function AnleitungPage() {
  const { user, profile } = await getEffectiveAuth()
  if (!user || !profile) redirect('/login')

  // Die Anleitung wird von der Figur der laufenden Welt gesprochen.
  return <AnleitungOverview role={profile.role} season={todayISO().slice(0, 7)} />
}
