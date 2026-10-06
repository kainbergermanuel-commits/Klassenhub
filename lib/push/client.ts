'use client'

import { savePushSubscription, removePushSubscription } from '@/app/actions/push'
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

/** Beim Abmelden: Gerät vom Konto lösen, sonst bekäme ein geteiltes Gerät
 *  (Familienhandy, Tablet) nach dem nächsten Login die Push-Nachrichten der
 *  vorigen Person. Muss VOR signOut laufen, solange die Session noch gilt.
 *  Fehler werden geschluckt: Abmelden darf daran nie scheitern. */
export async function forgetDeviceOnLogout(): Promise<void> {
  try {
    if (!('serviceWorker' in navigator)) return
    const reg = await navigator.serviceWorker.getRegistration()
    const sub = await reg?.pushManager.getSubscription()
    if (!sub) return
    await removePushSubscription(sub.endpoint)
    await sub.unsubscribe()
  } catch { /* siehe oben */ }
}

/** Beim Öffnen der App: ein im Browser vorhandenes Abo erneut speichern.
 *  Heilt drei Fälle still: der Browser hat den Endpoint gewechselt, die Zeile
 *  wurde nach einem 410 gelöscht, oder das Speichern beim Aktivieren ging
 *  schief. Einmal pro Sitzung reicht. */
export async function resyncSubscription(): Promise<void> {
  const FLAG = 'kh-push-sync'
  try {
    if (sessionStorage.getItem(FLAG)) return
    if (!('serviceWorker' in navigator) || !('Notification' in window)) return
    if (Notification.permission !== 'granted') return
    const reg = await navigator.serviceWorker.getRegistration()
    const sub = await reg?.pushManager.getSubscription()
    if (!sub) return
    const res = await savePushSubscription(sub.toJSON() as PushSubscriptionJSON, navigator.userAgent)
    if (!res.error) sessionStorage.setItem(FLAG, '1')
  } catch { /* nicht kritisch */ }
}
