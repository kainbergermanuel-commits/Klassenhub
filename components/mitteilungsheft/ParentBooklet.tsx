'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import MessageThread, { type SenderAvatar } from './MessageThread'
import type { Message } from '@/lib/types'

function firstName(full: string) { return full.split(' ')[0] }

interface Props {
  messages: Message[]
  /** Name der Klasse, zu der dieses Heft gehört. */
  className?: string | null
  /** Nur gesetzt, wenn es Geschwister gibt — sonst wäre der Name redundant. */
  childName?: string | null
  /** Ungelesenes in den Heften der Geschwister. Leer, wenn es nur ein Kind gibt. */
  andereHefte?: { childId: string; childName: string; count: number }[]
  userId: string
  classId: string
  senderNames?: Record<string, string>
  senderAvatars?: Record<string, SenderAvatar>
}

export default function ParentBooklet({ messages, userId, classId, senderNames, senderAvatars, andereHefte = [], className = null, childName = null }: Props) {
  const router = useRouter()
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const markedRef = useRef(false)

  // Lehrer-Nachrichten beim Öffnen als gesehen markieren (beidseitig).
  useEffect(() => {
    if (markedRef.current) return
    const unseen = messages.filter(m => m.sender_id !== userId && !m.seen_at).map(m => m.id)
    if (unseen.length === 0) return
    markedRef.current = true
    const supabase = createClient()
    supabase.from('messages').update({ seen_at: new Date().toISOString() }).in('id', unseen)
      .then(() => router.refresh())
  }, [messages, userId, router])

  async function send() {
    const text = body.trim()
    if (!text || sending) return
    setSending(true)
    const supabase = createClient()
    await supabase.from('messages').insert({
      class_id: classId,
      parent_id: userId,
      sender_id: userId,
      body: text,
    })
    setBody('')
    setSending(false)
    router.refresh()
  }

  const [wechselt, setWechselt] = useState<string | null>(null)

  // Umschalten wie im ChildSwitcher: Cookie serverseitig setzen, dann neu
  // laden. Die aktive Klasse und damit das gezeigte Heft hängen daran.
  async function zumHeft(childId: string) {
    if (wechselt) return
    setWechselt(childId)
    await fetch('/api/active-child', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childId }),
    })
    router.refresh()
  }

  async function acknowledge(id: string) {
    const supabase = createClient()
    await supabase.from('messages').update({ acknowledged_at: new Date().toISOString() }).eq('id', id)
    router.refresh()
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-70px)] -mb-20 max-md:h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-20px)] max-md:-mb-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-[14px] gradient-teal flex items-center justify-center text-white flex-shrink-0">
          <span className="msym text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>menu_book</span>
        </div>
        <div>
          <h1 className="text-[22px] font-extrabold text-kh-dark tracking-tight leading-tight">
            {childName ? `Mitteilungsheft von ${firstName(childName)}` : 'Mitteilungsheft'}
          </h1>
          <p className="text-[13px] text-kh-muted font-medium">
            {className
              ? `Direkter Draht zu den Lehrpersonen der ${className}`
              : 'Direkter Draht zu den Lehrpersonen'}
          </p>
        </div>
      </div>

      {andereHefte.map(h => (
        <button
          key={h.childId}
          onClick={() => zumHeft(h.childId)}
          disabled={!!wechselt}
          className="w-full flex items-center gap-3 mb-3 px-4 py-3 rounded-2xl text-left border border-kh-teal/30 bg-kh-teal-light/60 hover:border-kh-teal transition-colors disabled:opacity-60"
        >
          <span className="msym text-[22px] text-kh-teal flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
            mark_email_unread
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[13.5px] font-bold text-kh-dark">
              {h.count === 1
                ? `Im Heft von ${firstName(h.childName)} liegt eine ungelesene Nachricht`
                : `Im Heft von ${firstName(h.childName)} liegen ${h.count} ungelesene Nachrichten`}
            </span>
            <span className="block text-[11.5px] text-kh-muted leading-snug">
              {wechselt === h.childId ? 'Wird geöffnet…' : `Tippen, um zum Heft von ${firstName(h.childName)} zu wechseln`}
            </span>
          </span>
          <span className="msym text-[20px] text-kh-teal flex-shrink-0">chevron_right</span>
        </button>
      ))}

      <div className="flex-1 overflow-y-auto scrollbar-kh -mx-1 px-1">
        <MessageThread messages={messages} side="parent" currentUserId={userId} senderNames={senderNames} senderAvatars={senderAvatars} onAcknowledge={acknowledge} />
      </div>

      <div className="flex items-end gap-2 pt-3 border-t border-kh-border/50">
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          rows={1}
          placeholder="Antwort schreiben…"
          className="flex-1 resize-none rounded-[18px] border border-kh-border/70 px-4 py-2.5 text-[16px] md:text-[14px] focus:outline-none focus:border-kh-teal max-h-32"
        />
        <button
          onClick={send}
          disabled={!body.trim() || sending}
          aria-label="Senden"
          className="w-11 h-11 rounded-full gradient-teal text-white flex items-center justify-center flex-shrink-0 disabled:opacity-40 hover:brightness-105 transition-[filter,opacity] duration-150 tap"
        >
          <span className="msym text-[20px]">send</span>
        </button>
      </div>
    </div>
  )
}
