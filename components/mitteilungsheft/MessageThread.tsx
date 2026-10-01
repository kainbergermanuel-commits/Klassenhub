'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Avatar from '@/components/ui/Avatar'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import type { Message } from '@/lib/types'

export type SenderAvatar = {
  name: string
  color: string
  seed: string | null
  hairColor: string | null
  skinColor: string | null
}

interface Props {
  messages: Message[]
  // Aus welcher Perspektive wird gelesen? Bestimmt, welche Zusatzinfos zur Blase gehoeren.
  side: 'parent' | 'teacher'
  // Wer liest gerade? Nur DIESE Person bekommt rechte Blasen mit "Du".
  currentUserId: string
  // Anzeigename je Absender-ID — fuer die Kopfzeile ueber der Bubble.
  senderNames?: Record<string, string>
  // Avatar je Absender-ID — fuer eingehende Nachrichten.
  senderAvatars?: Record<string, SenderAvatar>
  // Elternteil bestaetigt eine Nachricht ("Zur Kenntnis genommen").
  onAcknowledge?: (id: string) => void
}

// Drei Blasenarten statt zwei. Die Seite sagt "von mir oder nicht",
// die Farbe sagt "von der Elternseite oder von der Lehrerseite".
// Ohne diese Trennung erschien jede Nachricht einer Kollegin als die eigene.
type Kind = 'own' | 'teacher' | 'parent'

function kindOf(m: Message, currentUserId: string): Kind {
  if (m.sender_id === currentUserId) return 'own'
  return m.sender_id === m.parent_id ? 'parent' : 'teacher'
}

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' })
}

function dayKey(iso: string) {
  const d = new Date(iso); d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function dayLabel(iso: string) {
  const d = new Date(iso); d.setHours(0, 0, 0, 0)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)
  if (d.getTime() === today.getTime()) return 'Heute'
  if (d.getTime() === yesterday.getTime()) return 'Gestern'
  return new Date(iso).toLocaleDateString('de-AT', { weekday: 'long', day: 'numeric', month: 'long' })
}

// URLs im Text klickbar machen und kuerzen (Domain + Pfadende), voller Link im href.
// Reines React-Rendering, kein innerHTML -> kein XSS-Risiko.
const URL_RE = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/g

function shortUrl(raw: string) {
  const s = raw.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '')
  if (s.length <= 40) return s
  const slash = s.indexOf('/')
  const host = slash === -1 ? s : s.slice(0, slash)
  const tail = s.slice(s.lastIndexOf('/') + 1)
  return `${host}/…/${tail.length > 18 ? tail.slice(0, 18) + '…' : tail}`
}

function linkify(text: string, own: boolean) {
  return text.split(URL_RE).map((part, i) => {
    if (i % 2 === 0) return part
    // Satzzeichen am Ende gehoert nicht zum Link.
    const m = part.match(/^(.*?)([.,;:!?)\]]*)$/)!
    const url = m[1]
    const href = url.startsWith('http') ? url : `https://${url}`
    return (
      <span key={i}>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          title={href}
          className={`underline underline-offset-2 font-medium ${own ? 'text-white' : 'text-kh-teal'}`}
        >
          {shortUrl(url)}
        </a>
        {m[2]}
      </span>
    )
  })
}

const INITIAL_COUNT = 4

export default function MessageThread({ messages, side, currentUserId, senderNames = {}, senderAvatars = {}, onAcknowledge }: Props) {
  const endRef = useRef<HTMLDivElement>(null)
  const [expanded, setExpanded] = useState(false)
  // Optimistisch: sofort als bestätigt anzeigen, bevor der Server-Refresh durch ist.
  const [ackedLocal, setAckedLocal] = useState<Set<string>>(new Set())
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [messages.length, expanded])
  const router = useRouter()
  const { confirm, dialog } = useConfirm()
  // Optimistisch: sofort als gelöscht anzeigen, bevor der Server-Refresh durch ist.
  const [deletedLocal, setDeletedLocal] = useState<Set<string>>(new Set())

  // Löschen läuft über delete_own_message (feature-message-delete.sql): dort
  // stehen die Regeln (nur eigene, nicht bestätigte; Sammelnachricht überall).
  async function deleteMessage(m: Message) {
    const ok = await confirm({
      title: 'Nachricht löschen?',
      message: m.broadcast_id
        ? 'Das ist eine Sammelnachricht. Sie wird aus allen Heften entfernt, in die sie geschickt wurde. Dort steht dann „Nachricht gelöscht“.'
        : 'Der Text wird entfernt. Im Heft steht dann „Nachricht gelöscht“.',
      confirmLabel: 'Löschen',
      tone: 'danger',
      icon: 'delete',
    })
    if (!ok) return
    setDeletedLocal(prev => new Set(prev).add(m.id))
    const { error } = await (createClient() as any).rpc('delete_own_message', { p_id: m.id })
    if (error) {
      setDeletedLocal(prev => { const n = new Set(prev); n.delete(m.id); return n })
      await confirm({
        title: 'Löschen nicht möglich',
        message: error.code === 'P0001'
          ? 'Diese Nachricht wurde bereits zur Kenntnis genommen und kann nicht mehr gelöscht werden.'
          : 'Die Nachricht konnte nicht gelöscht werden. Bitte später nochmal versuchen.',
        confirmLabel: 'OK',
        cancelLabel: 'Schließen',
        icon: 'error',
      })
      return
    }
    router.refresh()
  }

  // Standardmäßig nur die letzten 5 Nachrichten zeigen.
  const hiddenCount = Math.max(0, messages.length - INITIAL_COUNT)
  const visible = expanded ? messages : messages.slice(-INITIAL_COUNT)

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center text-kh-muted py-12">
        <span className="msym text-5xl block mb-3 text-kh-teal-light">menu_book</span>
        <p className="font-medium">Noch keine Einträge.</p>
        <p className="text-[13px] mt-0.5">Schreib die erste Mitteilung.</p>
      </div>
    )
  }

  let lastDay: number | null = null

  return (
    <div className="flex flex-col gap-4 py-2 pr-5">
      {hiddenCount > 0 && !expanded && (
        <div className="flex justify-center">
          <button
            onClick={() => setExpanded(true)}
            className="flex items-center gap-1.5 text-[12.5px] font-semibold text-kh-teal bg-kh-teal-light px-3.5 py-1.5 rounded-full hover:opacity-90 transition-opacity"
          >
            <span className="msym text-[16px]">expand_less</span>
            Ältere Nachrichten anzeigen ({hiddenCount})
          </button>
        </div>
      )}
      {visible.map(m => {
        const kind = kindOf(m, currentUserId)
        const own = kind === 'own'
        const name = m.sender_id ? senderNames[m.sender_id] : undefined
        const avatar = m.sender_id ? senderAvatars[m.sender_id] : undefined
        const deleted = !!m.deleted_at || deletedLocal.has(m.id)
        // Bestätigte Nachrichten bleiben stehen — sonst verlöre die Bestätigung ihren Sinn.
        const deletable = own && !deleted && !m.acknowledged_at && !ackedLocal.has(m.id)
        const showDay = dayKey(m.created_at) !== lastDay
        lastDay = dayKey(m.created_at)

        return (
          <div key={m.id}>
            {showDay && (
              <div className="flex justify-center my-2">
                <span className="text-[12px] font-semibold text-kh-muted bg-[#F1EFE8] px-3 py-1 rounded-full">
                  {dayLabel(m.created_at)}
                </span>
              </div>
            )}
            <div className={`flex items-start gap-2.5 ${own ? 'justify-end' : 'justify-start'}`}>
              {!own && (
                <div className="mt-2.5 flex-shrink-0">
                  <Avatar name={avatar?.name ?? name ?? ''} color={avatar?.color ?? '#E8E4DC'} seed={avatar?.seed ?? null} hairColor={avatar?.hairColor} skinColor={avatar?.skinColor} size={32} />
                </div>
              )}
              <div className={`flex flex-col min-w-0 max-w-[78%] ${own ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-1.5 mb-1 px-1 text-[10.5px]">
                  {own ? (
                    <>
                      <span className="text-kh-muted/85">{timeOf(m.created_at)}</span>
                      <span className="font-semibold text-kh-muted">Du</span>
                      {m.seen_at && !deleted && (
                        <span className="msym text-[14px] text-kh-teal" style={{ fontVariationSettings: "'FILL' 1" }}>done_all</span>
                      )}
                      {deletable && (
                        <button
                          onClick={() => deleteMessage(m)}
                          aria-label="Nachricht löschen"
                          title="Nachricht löschen"
                          className="-my-1.5 -mr-1.5 p-1.5 rounded-full text-kh-muted/70 hover:text-kh-red hover:bg-kh-red/10 transition-colors"
                        >
                          <span className="msym text-[15px] block">delete</span>
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="font-semibold text-kh-muted">{name ?? (kind === 'teacher' ? 'Lehrkraft' : 'Mitteilung')}</span>
                      {kind === 'teacher' && side === 'teacher' && (
                        <span className="text-[10px] font-semibold text-kh-teal bg-kh-teal-light px-1.5 py-px rounded-full">Kollegium</span>
                      )}
                      <span className="text-kh-muted/85">{timeOf(m.created_at)}</span>
                    </>
                  )}
                </div>
                {deleted ? (
                  <div
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-[13px] italic text-kh-muted border border-dashed border-kh-border ${
                      own ? 'rounded-[18px_18px_2px_18px]' : 'rounded-[2px_18px_18px_18px]'
                    }`}
                  >
                    <span className="msym text-[16px] not-italic">block</span>
                    Nachricht gelöscht
                  </div>
                ) : (
                <div
                  className={`px-4 py-2.5 text-[14px] leading-snug whitespace-pre-wrap [overflow-wrap:anywhere] shadow-sm ${
                    own
                      ? 'gradient-teal text-white rounded-[18px_18px_2px_18px]'
                      : 'text-kh-dark rounded-[2px_18px_18px_18px]'
                  } ${kind === 'teacher' ? 'border-l-[3px] border-kh-teal' : ''}`}
                  style={
                    own
                      ? undefined
                      : kind === 'teacher'
                        // Lehrerseite, aber eingehend: naeher am eigenen Gradient als am Eltern-Mint,
                        // damit links nicht zwei verwandte Toene nebeneinanderstehen.
                        ? { background: 'linear-gradient(135deg, #CFE7E4 0%, #EAF4F2 100%)', color: '#22423F' }
                        : { background: 'linear-gradient(135deg, #C2E6DF 0%, #E4F3F0 100%)', color: '#2C5550' }
                  }
                >
                  {linkify(m.body, own)}
                </div>
                )}
                {m.requires_ack && !deleted && (() => {
                  const acked = !!m.acknowledged_at || ackedLocal.has(m.id)
                  // Elternteil, eingehende Lehrer-Nachricht: aktiver Bestätigungs-Button.
                  if (kind === 'teacher' && side === 'parent') {
                    return acked ? (
                      <span className="mt-1.5 flex items-center gap-1 text-[11.5px] font-semibold text-kh-teal">
                        <span className="msym text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>task_alt</span>
                        Zur Kenntnis genommen
                      </span>
                    ) : (
                      <button
                        onClick={() => { setAckedLocal(prev => new Set(prev).add(m.id)); onAcknowledge?.(m.id) }}
                        className="mt-1.5 flex items-center gap-1.5 text-[12px] font-bold px-3 py-1.5 rounded-full gradient-teal text-white hover:brightness-105 transition-[filter,opacity] duration-150 tap"
                      >
                        <span className="msym text-[15px]">task_alt</span>
                        Zur Kenntnis genommen
                      </button>
                    )
                  }
                  // Lehrer-Sicht auf eine Nachricht der Lehrerseite (eigene oder die einer
                  // Kollegin): Bestätigungs-Status dieses Hefts, in drei Stufen.
                  // "gesehen, nicht bestätigt" und "nie geöffnet" sind zwei verschiedene
                  // Gespräche und dürfen nicht zu einem Zustand verschmelzen.
                  if (kind !== 'parent' && side === 'teacher') {
                    const state = acked
                      ? { icon: 'task_alt', fill: 1, text: 'Bestätigt', cls: 'text-kh-teal' }
                      : m.seen_at
                        ? { icon: 'pending_actions', fill: 1, text: 'Gelesen, noch nicht bestätigt', cls: 'text-kh-amber' }
                        : { icon: 'mark_email_unread', fill: 0, text: 'Noch nicht geöffnet', cls: 'text-kh-muted' }
                    return (
                      <span className={`mt-1.5 flex items-center gap-1 text-[11px] font-semibold ${state.cls}`}>
                        <span className="msym text-[14px]" style={{ fontVariationSettings: `'FILL' ${state.fill}` }}>{state.icon}</span>
                        {state.text}
                      </span>
                    )
                  }
                  return null
                })()}
              </div>
            </div>
          </div>
        )
      })}
      <div ref={endRef} />
      {dialog}
    </div>
  )
}
