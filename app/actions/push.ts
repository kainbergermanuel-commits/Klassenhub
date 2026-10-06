'use server'

import { getAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { sendToSubscription, type PushSubscriptionJSON } from '@/lib/push/send'
import type { PushKind } from '@/lib/push/recipients'

// Bewusst getAuth (echte Person) statt getEffectiveAuth: in der
// Rollen-Vorschau darf ein Gerät nie auf eine andere Person abonniert werden.

function isValidSubscription(sub: unknown): sub is PushSubscriptionJSON {
  const s = sub as PushSubscriptionJSON
  return typeof s?.endpoint === 'string' && s.endpoint.startsWith('https://')
    && typeof s.keys?.p256dh === 'string' && typeof s.keys?.auth === 'string'
}

export async function savePushSubscription(sub: PushSubscriptionJSON, userAgent: string): Promise<{ error?: string }> {
  const { user } = await getAuth()
  if (!user) return { error: 'Nicht angemeldet' }
  if (!isValidSubscription(sub)) return { error: 'Ungültiges Abo' }

  const supabase = await createClient()
  // Gleiches Gerät, anderes Konto (geteiltes Tablet): der Endpoint gehört
  // schon jemand anderem, die RLS verbietet das Überschreiben (42501).
  const { error } = await supabase.from('push_subscriptions' as never).upsert({
    user_id: user.id,
    endpoint: sub.endpoint,
    p256dh: sub.keys.p256dh,
    auth: sub.keys.auth,
    user_agent: userAgent.slice(0, 300),
  } as never, { onConflict: 'endpoint' })
  if (error) return { error: error.code === '42501' ? 'Dieses Gerät ist schon für ein anderes Konto aktiviert.' : error.message }
  return {}
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  const { user } = await getAuth()
  if (!user) return
  const supabase = await createClient()
  await supabase.from('push_subscriptions' as never).delete().eq('endpoint', endpoint).eq('user_id', user.id)
}

export async function loadNotificationPrefs(): Promise<Partial<Record<PushKind, boolean>>> {
  const { user } = await getAuth()
  if (!user) return {}
  const supabase = await createClient()
  const { data } = await supabase.from('notification_prefs' as never).select('kind,enabled')
    .eq('user_id', user.id) as unknown as { data: { kind: PushKind; enabled: boolean }[] | null }
  return Object.fromEntries((data ?? []).map(r => [r.kind, r.enabled]))
}

export async function setNotificationPref(kind: PushKind, enabled: boolean): Promise<{ error?: string }> {
  const { user } = await getAuth()
  if (!user) return { error: 'Nicht angemeldet' }
  const supabase = await createClient()
  const { error } = await supabase.from('notification_prefs' as never)
    .upsert({ user_id: user.id, kind, enabled } as never, { onConflict: 'user_id,kind' })
  return error ? { error: error.message } : {}
}

/**
 * Probe-Benachrichtigung an genau das Gerät, das gerade fragt. Braucht keine
 * Tabelle und keinen Webhook: prüft nur Service Worker, Schlüssel und den
 * Weg über den Push-Dienst. Ignoriert PUSH_DRY_RUN absichtlich, weil sie nur
 * an das eigene Gerät geht.
 */
export async function sendTestPush(sub: PushSubscriptionJSON): Promise<{ status?: number; error?: string }> {
  const { user } = await getAuth()
  if (!user) return { error: 'Nicht angemeldet' }
  if (!isValidSubscription(sub)) return { error: 'Ungültiges Abo' }
  const status = await sendToSubscription(sub, {
    title: 'ClassHaven',
    body: 'Probe: Benachrichtigungen funktionieren auf diesem Gerät.',
    url: '/einstellungen',
    tag: 'probe',
  })
  return status >= 200 && status < 300 ? { status } : { status, error: `Push-Dienst antwortete ${status}` }
}
