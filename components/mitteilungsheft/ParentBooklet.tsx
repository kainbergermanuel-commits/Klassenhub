'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import MessageThread, { type SenderAvatar } from './MessageThread'
import type { Message } from '@/lib/types'

interface Props {
  messages: Message[]
  userId: string
  classId: string
  senderNames?: Record<string, string>
  senderAvatars?: Record<string, SenderAvatar>
}

export default function ParentBooklet({ messages, userId, classId, senderNames, senderAvatars }: Props) {
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

  return (
    <div className="flex flex-col h-[calc(100vh-70px)] -mb-20 max-md:h-[calc(100vh-env(safe-area-inset-top)-20px)] max-md:-mb-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-[14px] gradient-teal flex items-center justify-center text-white flex-shrink-0">
          <span className="msym text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>menu_book</span>
        </div>
        <div>
          <h1 className="text-[22px] font-extrabold text-kh-dark tracking-tight leading-tight">Mitteilungsheft</h1>
          <p className="text-[13px] text-kh-muted font-medium">Direkter Draht zur Lehrkraft</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-kh -mx-1 px-1">
        <MessageThread messages={messages} side="parent" senderNames={senderNames} senderAvatars={senderAvatars} />
      </div>

      <div className="flex items-end gap-2 pt-3 border-t border-kh-border/50">
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          rows={1}
          placeholder="Antwort schreiben…"
          className="flex-1 resize-none rounded-[18px] border border-kh-border/70 px-4 py-2.5 text-[14px] focus:outline-none focus:border-kh-teal max-h-32"
        />
        <button
          onClick={send}
          disabled={!body.trim() || sending}
          aria-label="Senden"
          className="w-11 h-11 rounded-full gradient-teal text-white flex items-center justify-center flex-shrink-0 disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          <span className="msym text-[20px]">send</span>
        </button>
      </div>
    </div>
  )
}
