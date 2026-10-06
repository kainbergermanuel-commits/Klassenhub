'use client'

import { savePushSubscription } from '@/app/actions/push'
import type { PushSubscriptionJSON } from './send'

/** Gemeinsame Browser-Seite für PushSettingsCard und PushPromptCard. */

export type DeviceStatus = 'unsupported' | 'ios-install' | 'denied' | 'off' | 'on'

function urlBase64ToUint8Array(base64: string) {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0))
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

export async function deviceStatus(): Promise<DeviceStatus> {
  const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  if (!supported) return isIOS() && !isStandalone() ? 'ios-install' : 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  const reg = await navigator.serviceWorker.ready
  return (await reg.pushManager.getSubscription()) ? 'on' : 'off'
}

/** Fragt die Erlaubnis an (nur aus einem Klick heraus aufrufen!) und
 *  speichert das Abo. Liefert den neuen Status oder eine Fehlermeldung. */
export async function enablePush(): Promise<{ status: DeviceStatus; error?: string }> {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return { status: permission === 'denied' ? 'denied' : 'off' }
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
  })
  const res = await savePushSubscription(sub.toJSON() as PushSubscriptionJSON, navigator.userAgent)
  if (res.error) {
    await sub.unsubscribe()
    return { status: 'off', error: res.error }
  }
  return { status: 'on' }
}
