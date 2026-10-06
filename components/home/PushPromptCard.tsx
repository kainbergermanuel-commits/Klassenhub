'use client'

import { useEffect, useState } from 'react'
import { deviceStatus, enablePush, type DeviceStatus } from '@/lib/push/client'

/** Pro Gerät, wie AnnouncementCard: die Erlaubnis gilt ja auch pro Gerät. */
const STORAGE_KEY = 'kh-push-frage'
/** Nach dem ersten „Später" so viele Tage Ruhe, nach dem zweiten für immer. */
const PAUSE_TAGE = 4

interface Memo { later: number; until?: string }

function readMemo(): Memo {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '') as Memo
  } catch {
    return { later: 0 }
  }
}

function writeMemo(m: Memo) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(m)) } catch { /* privater Modus */ }
}

/**
 * Einmalige Frage auf der Eltern-Startseite, ob Push fürs Mitteilungsheft
 * aktiviert werden soll. Die Erlaubnis kann nur die Person selbst auf dem
 * Gerät geben, darum fragen wir aktiv statt still in den Einstellungen zu
 * warten. Erscheint nur, solange das Gerät nicht aktiviert ist und niemand
 * im Systemdialog abgelehnt hat. Vorbelegt auf „versteckt", siehe
 * AnnouncementCard (kein Aufblitzen).
 */
export default function PushPromptCard() {
  const [status, setStatus] = useState<DeviceStatus | 'done' | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const memo = readMemo()
    if (memo.later >= 2) return
    if (memo.until && new Date() < new Date(memo.until)) return
    deviceStatus().then(s => {
      if (s === 'off' || s === 'ios-install') setStatus(s)
    }).catch(() => {})
  }, [])

  function later() {
    const memo = readMemo()
    const until = new Date(Date.now() + PAUSE_TAGE * 86_400_000).toISOString()
    writeMemo({ later: memo.later + 1, until })
    setStatus(null)
  }

  async function enable() {
    setBusy(true); setError(null)
    try {
      const res = await enablePush()
      if (res.error) { setError(res.error); return }
      if (res.status === 'on') {
        setStatus('done')
        setTimeout(() => setStatus(null), 2500)
      } else {
        // Abgelehnt oder Dialog weggewischt: nicht weiter bedrängen.
        writeMemo({ later: 2 })
        setStatus(null)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Aktivieren fehlgeschlagen')
    } finally {
      setBusy(false)
    }
  }

  if (!status) return null

  return (
    <div
      className="animate-card-enter mb-4 rounded-xl border border-kh-teal/10 px-3.5 py-3"
      style={{ background: 'linear-gradient(to bottom left, rgba(15,138,130,.13) 0%, rgba(15,138,130,.055) 45%, rgba(15,138,130,0) 100%)' }}
    >
      <div className="flex items-start gap-2.5">
        <span
          className="msym flex-shrink-0 text-[18px] text-kh-teal/75 mt-px"
          style={{ fontVariationSettings: "'FILL' 1" }}
          aria-hidden="true"
        >
          {status === 'done' ? 'check_circle' : 'notifications'}
        </span>

        <div className="min-w-0 flex-1">
          {status === 'done' && (
            <p className="text-[12.5px] font-bold leading-snug text-kh-dark/80">
              Aktiviert. Neue Nachrichten im Mitteilungsheft erscheinen ab jetzt als Hinweis.
            </p>
          )}

          {status === 'off' && (
            <>
              <p className="text-[12.5px] font-bold leading-snug text-kh-dark/85">
                Bei neuen Nachrichten im Mitteilungsheft benachrichtigt werden?
              </p>
              <p className="text-[12px] font-medium leading-snug text-kh-muted mt-0.5">
                Auch wenn die App geschlossen ist. Der Nachrichtentext wird nicht angezeigt.
              </p>
              <div className="flex gap-2 mt-2.5">
                <button
                  onClick={enable}
                  disabled={busy}
                  className="rounded-full gradient-teal px-4 py-1.5 text-[12.5px] font-bold text-white tap transition-[filter,opacity] hover:brightness-105 disabled:opacity-50"
                >
                  {busy ? 'Einen Moment …' : 'Ja, aktivieren'}
                </button>
                <button
                  onClick={later}
                  disabled={busy}
                  className="rounded-full px-3 py-1.5 text-[12.5px] font-bold text-kh-muted hover:text-kh-dark transition-colors"
                >
                  Später
                </button>
              </div>
            </>
          )}

          {status === 'ios-install' && (
            <>
              <p className="text-[12.5px] font-bold leading-snug text-kh-dark/85">
                Benachrichtigungen fürs Mitteilungsheft?
              </p>
              <p className="text-[12px] font-medium leading-snug text-kh-muted mt-0.5">
                Am iPhone geht das nur in der installierten App: in Safari auf
                <span className="msym text-[15px] align-[-3px] mx-0.5">ios_share</span>
                tippen, dann „Zum Home-Bildschirm“. ClassHaven danach von dort öffnen.
              </p>
              <button
                onClick={later}
                className="mt-2 rounded-full px-3 py-1.5 -ml-3 text-[12.5px] font-bold text-kh-muted hover:text-kh-dark transition-colors"
              >
                Später
              </button>
            </>
          )}

          {error && <p className="text-[12px] font-medium text-kh-red mt-1.5">{error}</p>}
        </div>
      </div>
    </div>
  )
}
