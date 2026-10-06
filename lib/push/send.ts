import webpush from 'web-push'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { PushPlan } from './recipients'

export interface PushSubscriptionJSON {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

export interface PushPayload {
  title: string
  body: string
  url: string
  tag: string
}

let configured = false
function configure() {
  if (configured) return
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? 'mailto:admin@classhaven.at',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  )
  configured = true
}

/** Schickt an ein einzelnes Gerät. Liefert den HTTP-Status des Push-Dienstes. */
export async function sendToSubscription(sub: PushSubscriptionJSON, payload: PushPayload): Promise<number> {
  configure()
  try {
    const res = await webpush.sendNotification(sub, JSON.stringify(payload), { TTL: 60 * 60 * 24 })
    return res.statusCode
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode
    if (status) return status
    throw err
  }
}

export interface DispatchReport {
  dryRun: boolean
  skippedReason?: string
  recipients: number
  mutedByPrefs: number
  devices: number
  sent: number
  removedExpired: number
  failed: number
}

/**
 * Führt einen PushPlan aus. Zwei Notbremsen aus der Umgebung:
 *  - PUSH_DRY_RUN=true  → nichts verschicken, nur berichten
 *  - PUSH_CLASSES=1t,1b → nur für diese Klassennamen (leer = keine)
 */
export async function dispatch(db: SupabaseClient, plan: PushPlan): Promise<DispatchReport> {
  const dryRun = process.env.PUSH_DRY_RUN !== 'false'
  const report: DispatchReport = { dryRun, recipients: plan.recipientIds.length, mutedByPrefs: 0, devices: 0, sent: 0, removedExpired: 0, failed: 0 }

  const allowed = (process.env.PUSH_CLASSES ?? '').split(',').map(s => s.trim()).filter(Boolean)
  const { data: cls } = await db.from('classes').select('name').eq('id', plan.classId).single()
  const className = (cls as { name: string } | null)?.name
  if (!className || !allowed.includes(className)) {
    return { ...report, skippedReason: `Klasse ${className ?? plan.classId} nicht in PUSH_CLASSES` }
  }
  if (plan.recipientIds.length === 0) return report

  const { data: muted } = await db
    .from('notification_prefs' as never)
    .select('user_id')
    .eq('kind', plan.kind)
    .eq('enabled', false)
    .in('user_id', plan.recipientIds) as unknown as { data: { user_id: string }[] | null }
  const mutedIds = new Set((muted ?? []).map(r => r.user_id))
  report.mutedByPrefs = mutedIds.size
  const targets = plan.recipientIds.filter(id => !mutedIds.has(id))
  if (targets.length === 0) return report

  const { data: subs } = await db
    .from('push_subscriptions' as never)
    .select('id,endpoint,p256dh,auth')
    .in('user_id', targets) as unknown as { data: { id: string; endpoint: string; p256dh: string; auth: string }[] | null }
  report.devices = subs?.length ?? 0
  if (dryRun || !subs?.length) return report

  const payload: PushPayload = { title: plan.title, body: plan.body, url: plan.url, tag: plan.tag }
  const expired: string[] = []
  await Promise.all(subs.map(async s => {
    const status = await sendToSubscription({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload)
      .catch(() => 0)
    if (status >= 200 && status < 300) report.sent++
    else if (status === 404 || status === 410) expired.push(s.id)
    else report.failed++
  }))
  if (expired.length) {
    await db.from('push_subscriptions' as never).delete().in('id', expired)
    report.removedExpired = expired.length
  }
  return report
}
