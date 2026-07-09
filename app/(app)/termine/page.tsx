import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveAuth } from '@/lib/previewAuth'
import { todayISO } from '@/lib/date'
import PageHeader from '@/components/layout/PageHeader'
import TermineView from './TermineView'
import type { CalendarEvent } from '@/lib/types'

export default async function TerminePage() {
  const { user, profile, activeClassId } = await getEffectiveAuth()
  if (!user || !profile) redirect('/login')
  if (!activeClassId) redirect('/')

  const supabase = await createClient()
  const today = todayISO()

  const { data } = await (supabase
    .from('events' as never)
    .select('*')
    .eq('class_id', activeClassId)
    .order('start_date', { ascending: true }) as unknown as Promise<{ data: CalendarEvent[] | null }>)

  const events = data ?? []
  const upcomingCount = events.filter(e => e.end_date >= today).length

  return (
    <div>
      <PageHeader
        icon="calendar_month"
        title="Termine"
        subtitle={`${upcomingCount} bevorstehend`}
        gradient="from-[#4C93C9] to-[#7EB8E5]"
      />
      <TermineView events={events} role={profile.role} today={today} classId={activeClassId} />
    </div>
  )
}
