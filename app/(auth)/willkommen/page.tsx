import { redirect } from 'next/navigation'
import { getAuth } from '@/lib/auth'
import WillkommenForm from './WillkommenForm'

/**
 * Willkommens-Screen beim allerersten Login.
 *
 * Liegt bewusst in der (auth)-Gruppe und NICHT unter (app): das App-Layout
 * leitet jeden hierher um, dessen `onboarded_at` noch NULL ist — läge die
 * Seite selbst unter (app), würde sie sich endlos auf sich selbst umleiten.
 */
export default async function WillkommenPage() {
  const { user, profile } = await getAuth()
  if (!user || !profile) redirect('/login')

  // Schon erledigt (oder direkt aufgerufen): normal weiter.
  if (profile.onboarded_at) redirect('/')

  const vorname = profile.full_name.split(' ')[0]

  return (
    <WillkommenForm
      vorname={vorname}
      nachname={profile.full_name.split(' ').slice(1).join(' ')}
      role={profile.role}
    />
  )
}
