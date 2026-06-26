import { redirect } from 'next/navigation'
import { getEffectiveAuth } from '@/lib/previewAuth'
import ChangePasswordForm from '@/components/settings/ChangePasswordForm'

export default async function SettingsPage() {
  const { user } = await getEffectiveAuth()
  if (!user) redirect('/login')

  return (
    <>
      <div className="mb-5">
        <h1 className="text-[25px] font-extrabold text-kh-dark tracking-tight">Einstellungen</h1>
        <p className="text-[13.5px] text-kh-muted font-medium mt-0.5">{user.email}</p>
      </div>
      <ChangePasswordForm />
    </>
  )
}
