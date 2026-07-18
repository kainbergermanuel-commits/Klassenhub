import { redirect } from 'next/navigation'
import { getEffectiveAuth } from '@/lib/previewAuth'
import AnleitungOverview from '@/components/streaks/AnleitungOverview'

/** "Erste Schritte" — der Anleitungs-Hub als Unterseite von Abenteuer
 *  (Sub-Link wie "Die Reise", jederzeit zum Nachblättern, kein aufgezwungenes
 *  Onboarding-Popup, Prinzip 4). Zuhause für alle How-tos; wächst mit dem
 *  System mit. In Vala-Stimme (später ggf. eigener Onboarding-Guide). */
export default async function AnleitungPage() {
  const { user, profile } = await getEffectiveAuth()
  if (!user || !profile) redirect('/login')

  return <AnleitungOverview role={profile.role} />
}
