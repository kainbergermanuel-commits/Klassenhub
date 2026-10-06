'use client'

import { useEffect, useState } from 'react'
import {
  savePushSubscription, removePushSubscription, sendTestPush,
  loadNotificationPrefs, setNotificationPref,
} from '@/app/actions/push'
import type { PushSubscriptionJSON } from '@/lib/push/send'

type Status = 'loading' | 'unsupported' | 'ios-install' | 'denied' | 'off' | 'on'

function urlBase64ToUint8Array(base64: string) {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(padded)
  return Uint8Array.from(raw, c => c.charCodeAt(0))
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

/** Push-Benachrichtigungen fürs Gerät ein-/ausschalten. Fragt die
 *  Browser-Erlaubnis erst auf Knopfdruck, nie beim Laden der Seite. */
export default function PushSettingsCard() {
  const [status, setStatus] = useState<Status>('loading')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [messagesOn, setMessagesOn] = useState(true)

  useEffect(() => {
    (async () => {
      const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
      if (!supported) {
        setStatus(isIOS() && !isStandalone() ? 'ios-install' : 'unsupported')
        return
      }
      if (Notification.permission === 'denied') { setStatus('denied'); return }
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      setStatus(sub ? 'on' : 'off')
      const prefs = await loadNotificationPrefs().catch(() => ({}))
      setMessagesOn((prefs as { messages?: boolean }).messages ?? true)
    })()
  }, [])

  async function currentSubscription(): Promise<PushSubscriptionJSON | null> {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    return sub ? (sub.toJSON() as PushSubscriptionJSON) : null
  }

  async function enable() {
    setBusy(true); setMessage(null)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') { setStatus(permission === 'denied' ? 'denied' : 'off'); return }
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      })
      const res = await savePushSubscription(sub.toJSON() as PushSubscriptionJSON, navigator.userAgent)
      if (res.error) { setMessage(res.error); await sub.unsubscribe(); return }
      setStatus('on')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Aktivieren fehlgeschlagen')
    } finally {
      setBusy(false)
    }
  }

  async function disable() {
    setBusy(true); setMessage(null)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await removePushSubscription(sub.endpoint)
        await sub.unsubscribe()
      }
      setStatus('off')
    } finally {
      setBusy(false)
    }
  }

  async function probe() {
    setBusy(true); setMessage(null)
    try {
      const sub = await currentSubscription()
      if (!sub) { setMessage('Auf diesem Gerät nicht aktiviert.'); return }
      const res = await sendTestPush(sub)
      setMessage(res.error ?? 'Probe verschickt. Sie sollte gleich erscheinen.')
    } finally {
      setBusy(false)
    }
  }

  async function toggleMessages() {
    const next = !messagesOn
    setMessagesOn(next)
    const res = await setNotificationPref('messages', next)
    if (res.error) { setMessagesOn(!next); setMessage(res.error) }
  }

  return (
    <div className="kh-card p-6 max-w-md">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-[13px] bg-kh-amber-light text-kh-amber flex items-center justify-center flex-shrink-0">
          <span className="msym text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>notifications</span>
        </div>
        <div className="min-w-0">
          <h2 className="font-extrabold text-[16px] text-kh-dark">Benachrichtigungen</h2>
          <p className="text-[12.5px] text-kh-muted font-medium">Für dieses Gerät</p>
        </div>
      </div>

      {status === 'loading' && <p className="text-sm text-kh-muted">Wird geprüft …</p>}

      {status === 'ios-install' && (
        <p className="text-sm text-kh-dark leading-relaxed">
          Auf dem iPhone kommen Benachrichtigungen nur in der installierten App an: in Safari auf
          <span className="msym text-[17px] align-[-3px] mx-1">ios_share</span>
          tippen, dann „Zum Home-Bildschirm“. Danach ClassHaven von dort öffnen und hier aktivieren.
        </p>
      )}

      {status === 'unsupported' && (
        <p className="text-sm text-kh-muted">Dieser Browser unterstützt keine Benachrichtigungen.</p>
      )}

      {status === 'denied' && (
        <p className="text-sm text-kh-dark leading-relaxed">
          Benachrichtigungen sind für ClassHaven blockiert. Sie lassen sich in den Einstellungen des
          Browsers bzw. des Geräts wieder erlauben.
        </p>
      )}

      {status === 'off' && (
        <>
          <p className="text-sm text-kh-dark leading-relaxed mb-4">
            Bei neuen Nachrichten im Mitteilungsheft erscheint ein Hinweis, auch wenn die App geschlossen ist.
            Der Nachrichtentext wird dabei nicht angezeigt.
          </p>
          <button onClick={enable} disabled={busy} className="w-full py-3 rounded-full gradient-teal text-white text-sm font-bold hover:brightness-105 transition-[filter,opacity] duration-150 tap disabled:opacity-40">
            {busy ? 'Wird aktiviert …' : 'Aktivieren'}
          </button>
        </>
      )}

      {status === 'on' && (
        <div className="flex flex-col gap-3">
          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <span className="text-sm font-semibold text-kh-dark">Mitteilungsheft</span>
            <input type="checkbox" checked={messagesOn} onChange={toggleMessages} className="w-5 h-5 accent-[#0F8A82]" />
          </label>
          <div className="flex gap-2 pt-1">
            <button onClick={probe} disabled={busy} className="flex-1 border border-kh-border rounded-xl px-3 py-2.5 text-sm font-bold text-kh-dark disabled:opacity-60">
              Probe senden
            </button>
            <button onClick={disable} disabled={busy} className="flex-1 border border-kh-border rounded-xl px-3 py-2.5 text-sm font-bold text-kh-muted disabled:opacity-60">
              Ausschalten
            </button>
          </div>
        </div>
      )}

      {message && <p className="text-[12.5px] font-medium text-kh-muted mt-3">{message}</p>}
    </div>
  )
}
