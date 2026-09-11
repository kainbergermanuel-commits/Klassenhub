'use client'

import { useEffect, useRef, useState } from 'react'
import Avatar from '@/components/ui/Avatar'
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

const INITIAL_COUNT = 4

export default function MessageThread({ messages, side, currentUserId, senderNames = {}, senderAvatars = {}, onAcknowledge }: Props) {
  const endRef = useRef<HTMLDivElement>(null)
  const [expanded, setExpanded] = useState(false)
  // Optimistisch: sofort als bestätigt anzeigen, bevor der Server-Refresh durch ist.
  const [ackedLocal, setAckedLocal] = useState<Set<string>>(new Set())
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [messages.length, expanded])

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
              <div className={`flex flex-col max-w-[78%] ${own ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-1.5 mb-1 px-1 text-[10.5px]">
                  {own ? (
                    <>
                      <span className="text-kh-muted/85">{timeOf(m.created_at)}</span>
                      <span className="font-semibold text-kh-muted">Du</span>
                      {m.seen_at && (
                        <span className="msym text-[14px] text-kh-teal" style={{ fontVariationSettings: "'FILL' 1" }}>done_all</span>
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
                <div
                  className={`px-4 py-2.5 text-[14px] leading-snug whitespace-pre-wrap break-words shadow-sm ${
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
                  {m.body}
                </div>
                {m.requires_ack && (() => {
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
    </div>
  )
}
