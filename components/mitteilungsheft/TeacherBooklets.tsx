'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Avatar from '@/components/ui/Avatar'
import MessageThread, { type SenderAvatar } from './MessageThread'
import type { Message } from '@/lib/types'

type ParentLite = {
  id: string
  full_name: string
  child_id: string | null
  class_id?: string | null
  avatar_color: string
  avatar_seed: string | null
  avatar_hair_color: string | null
  avatar_skin_color: string | null
}
type StudentLite = {
  id: string
  full_name: string
  class_id?: string | null
  avatar_color: string
  avatar_seed: string | null
  avatar_hair_color: string | null
  avatar_skin_color: string | null
}
type ClassLite = { id: string; name: string }

interface Props {
  parents: ParentLite[]
  students: StudentLite[]
  allParents: ParentLite[]
  allStudents: StudentLite[]
  classes: ClassLite[]
  messages: Message[]
  broadcastMessages: Message[]
  userId: string
  ownName: string
  classId: string
}

function firstName(full: string) { return full.split(' ')[0] }

export default function TeacherBooklets({ parents, students, allParents, allStudents, classes, messages, broadcastMessages, userId, ownName, classId }: Props) {
  const router = useRouter()
  const [openParentId, setOpenParentId] = useState<string | null>(null)
  const [composing, setComposing] = useState(false)
  const [showBroadcasts, setShowBroadcasts] = useState(false)

  const studentById = useMemo(
    () => Object.fromEntries(students.map(s => [s.id, s])),
    [students],
  )
  // Anzeigenamen je Absender: eigene Lehrkraft + alle Eltern.
  const senderNames = useMemo(
    () => ({ [userId]: ownName, ...Object.fromEntries(parents.map(p => [p.id, p.full_name])) }),
    [userId, ownName, parents],
  )
  // Avatare eingehender Absender (Eltern) = Avatar des Elternteils selbst.
  const senderAvatars = useMemo(() => {
    const map: Record<string, SenderAvatar> = {}
    for (const p of parents) {
      map[p.id] = { name: p.full_name, color: p.avatar_color, seed: p.avatar_seed, hairColor: p.avatar_hair_color, skinColor: p.avatar_skin_color }
    }
    return map
  }, [parents])

  const byParent = useMemo(() => {
    const map: Record<string, Message[]> = {}
    for (const m of messages) (map[m.parent_id] ??= []).push(m)
    return map
  }, [messages])

  // Liste der Hefte, sortiert nach letztem Eintrag.
  const booklets = useMemo(() => {
    return parents
      .map(p => {
        const msgs = byParent[p.id] ?? []
        const last = msgs[msgs.length - 1] ?? null
        const unread = msgs.filter(m => m.sender_id === p.id && !m.seen_at).length
        return { parent: p, last, unread }
      })
      .sort((a, b) => {
        // Ungelesene immer oben, danach nach letztem Eintrag.
        if ((a.unread > 0) !== (b.unread > 0)) return a.unread > 0 ? -1 : 1
        const ta = a.last ? new Date(a.last.created_at).getTime() : 0
        const tb = b.last ? new Date(b.last.created_at).getTime() : 0
        return tb - ta
      })
  }, [parents, byParent])

  // Sammelnachrichten (Fan-out-Kopien je broadcast_id) mit aggregiertem Gesehen-Status.
  // Klassenübergreifend: Quelle ist broadcastMessages (alle eigenen Klassen).
  const broadcastNames = useMemo(
    () => Object.fromEntries(allParents.map(p => [p.id, p.full_name])),
    [allParents],
  )
  const classNameById = useMemo(
    () => Object.fromEntries(classes.map(c => [c.id, c.name])),
    [classes],
  )
  const broadcasts = useMemo(() => {
    const groups: Record<string, Message[]> = {}
    for (const m of broadcastMessages) if (m.broadcast_id) (groups[m.broadcast_id] ??= []).push(m)
    return Object.entries(groups)
      .map(([id, msgs]) => ({
        id,
        body: msgs[0].body,
        created_at: msgs[0].created_at,
        total: msgs.length,
        seen: msgs.filter(m => m.seen_at).length,
        classNames: [...new Set(msgs.map(m => classNameById[m.class_id]).filter(Boolean))].sort(),
        recipients: msgs
          .map(m => ({ name: broadcastNames[m.parent_id] ?? '?', seen: !!m.seen_at }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [broadcastMessages, broadcastNames, classNameById])

  const openParent = openParentId ? parents.find(p => p.id === openParentId) ?? null : null

  if (showBroadcasts) {
    return <BroadcastsView broadcasts={broadcasts} onBack={() => setShowBroadcasts(false)} />
  }

  if (openParent) {
    return (
      <TeacherThread
        parent={openParent}
        child={openParent.child_id ? studentById[openParent.child_id] : undefined}
        messages={byParent[openParent.id] ?? []}
        userId={userId}
        senderNames={senderNames}
        senderAvatars={senderAvatars}
        classId={classId}
        onBack={() => setOpenParentId(null)}
      />
    )
  }

  return (
    <>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2.5">
        <div>
          <h1 className="text-[25px] font-extrabold text-kh-dark tracking-tight">Mitteilungshefte</h1>
          <p className="text-[13.5px] text-kh-muted font-medium mt-0.5">{parents.length} Eltern</p>
        </div>
        <div className="flex items-center gap-2">
          {broadcasts.length > 0 && (
            <button
              onClick={() => setShowBroadcasts(true)}
              className="flex items-center gap-1.5 border border-kh-border text-kh-muted px-3.5 py-[10px] rounded-full font-bold text-sm hover:border-kh-teal hover:text-kh-teal transition-colors"
            >
              <span className="msym text-[18px]">outgoing_mail</span>
              Gesendet
            </button>
          )}
          <button
            onClick={() => setComposing(true)}
            className="flex items-center gap-2 gradient-teal text-white px-[17px] py-[11px] rounded-full font-bold text-sm hover:opacity-90 transition-opacity"
          >
            <span className="msym text-[19px]">campaign</span>
            Sammelnachricht
          </button>
        </div>
      </div>

      {parents.length === 0 ? (
        <div className="text-center py-16 text-kh-muted">
          <span className="msym text-5xl block mb-3 text-kh-teal-light">menu_book</span>
          <p className="font-medium">Noch keine Eltern in dieser Klasse.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-2">
          {booklets.map(({ parent, last, unread }) => (
            <button
              key={parent.id}
              onClick={() => setOpenParentId(parent.id)}
              className="flex items-center gap-3 p-3.5 rounded-2xl bg-white shadow-sm hover:-translate-y-[2px] hover:shadow-md transition-all text-left min-w-0"
            >
              {(() => {
                const child = parent.child_id ? studentById[parent.child_id] : undefined
                return (
                  <div className="flex flex-col items-center gap-0.5 flex-shrink-0 w-[52px]">
                    {child
                      ? <Avatar name={child.full_name} color={child.avatar_color} seed={child.avatar_seed} hairColor={child.avatar_hair_color} skinColor={child.avatar_skin_color} size={38} />
                      : <div className="w-[38px] h-[38px] rounded-full bg-kh-teal-light text-kh-teal font-bold flex items-center justify-center">{firstName(parent.full_name)[0]?.toUpperCase()}</div>}
                    {child && <span className="text-[11px] font-semibold text-kh-muted truncate max-w-full">{firstName(child.full_name)}</span>}
                  </div>
                )
              })()}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[15px] text-kh-dark truncate">{parent.full_name}</span>
                </div>
                <p className="text-[13px] text-kh-muted truncate mt-0.5">
                  {last
                    ? `${last.sender_id === parent.id ? '' : 'Sie: '}${last.body}`
                    : 'Noch keine Nachrichten'}
                </p>
              </div>
              {unread > 0 && (
                <span className="gradient-teal text-white min-w-5 h-5 px-2 rounded-full text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                  {unread}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {composing && (
        <ComposeModal
          allParents={allParents}
          allStudents={allStudents}
          classes={classes}
          activeClassId={classId}
          userId={userId}
          onClose={() => setComposing(false)}
        />
      )}
    </>
  )
}

function TeacherThread({
  parent, child, messages, userId, senderNames, senderAvatars, classId, onBack,
}: {
  parent: ParentLite
  child?: StudentLite
  messages: Message[]
  userId: string
  senderNames: Record<string, string>
  senderAvatars: Record<string, SenderAvatar>
  classId: string
  onBack: () => void
}) {
  const router = useRouter()
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const markedRef = useRef(false)

  // Eltern-Nachrichten als gesehen markieren.
  useEffect(() => {
    if (markedRef.current) return
    const unseen = messages.filter(m => m.sender_id === parent.id && !m.seen_at).map(m => m.id)
    if (unseen.length === 0) return
    markedRef.current = true
    const supabase = createClient()
    supabase.from('messages').update({ seen_at: new Date().toISOString() }).in('id', unseen)
      .then(() => router.refresh())
  }, [messages, parent.id, router])

  async function send() {
    const text = body.trim()
    if (!text || sending) return
    setSending(true)
    const supabase = createClient()
    await supabase.from('messages').insert({
      class_id: classId,
      parent_id: parent.id,
      sender_id: userId,
      body: text,
    })
    setBody('')
    setSending(false)
    router.refresh()
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-9rem)] max-md:h-[calc(100dvh-7rem)]">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} aria-label="Zurück" className="w-9 h-9 rounded-full flex items-center justify-center text-kh-muted hover:bg-[#EDEDEC] transition-colors flex-shrink-0">
          <span className="msym text-[22px]">arrow_back</span>
        </button>
        {child
          ? <Avatar name={child.full_name} color={child.avatar_color} seed={child.avatar_seed} hairColor={child.avatar_hair_color} skinColor={child.avatar_skin_color} size={44} />
          : <div className="w-11 h-11 rounded-full bg-kh-teal-light text-kh-teal font-bold flex items-center justify-center flex-shrink-0">{firstName(parent.full_name)[0]?.toUpperCase()}</div>}
        <div className="min-w-0">
          <h1 className="text-[18px] font-extrabold text-kh-dark tracking-tight leading-tight truncate">{parent.full_name}</h1>
          {child && <p className="text-[13px] text-kh-muted font-medium truncate">Eltern von {firstName(child.full_name)}</p>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-kh -mx-1 px-1">
        <MessageThread messages={messages} side="teacher" senderNames={senderNames} senderAvatars={senderAvatars} />
      </div>

      <div className="flex items-end gap-2 pt-3 border-t border-kh-border/50">
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          rows={1}
          placeholder="Nachricht schreiben…"
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

type BroadcastSummary = {
  id: string
  body: string
  created_at: string
  total: number
  seen: number
  classNames: string[]
  recipients: { name: string; seen: boolean }[]
}

function BroadcastsView({ broadcasts, onBack }: { broadcasts: BroadcastSummary[]; onBack: () => void }) {
  const [openId, setOpenId] = useState<string | null>(null)

  return (
    <>
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onBack} aria-label="Zurück" className="w-9 h-9 rounded-full flex items-center justify-center text-kh-muted hover:bg-[#EDEDEC] transition-colors flex-shrink-0">
          <span className="msym text-[22px]">arrow_back</span>
        </button>
        <div>
          <h1 className="text-[22px] font-extrabold text-kh-dark tracking-tight leading-tight">Gesendete Sammelnachrichten</h1>
          <p className="text-[13px] text-kh-muted font-medium">Lesestatus je Mitteilung</p>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        {broadcasts.map(b => {
          const open = openId === b.id
          const allSeen = b.seen === b.total
          const notSeen = b.recipients.filter(r => !r.seen)
          return (
            <div key={b.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <button
                onClick={() => setOpenId(open ? null : b.id)}
                className="w-full flex items-center gap-3 p-4 text-left"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] text-kh-dark font-medium line-clamp-2">{b.body}</p>
                  <p className="text-[12px] text-kh-muted mt-1">
                    {new Date(b.created_at).toLocaleDateString('de-AT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {b.classNames.length > 0 && (
                  <span className="flex items-center gap-1 text-[12px] font-semibold text-kh-muted flex-shrink-0">
                    <span className="msym text-[15px]">group</span>
                    {b.classNames.join(', ')}
                  </span>
                )}
                <span className={`flex items-center gap-1 text-[12.5px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${allSeen ? 'bg-kh-teal-light text-kh-teal' : 'bg-[#F8ECD6] text-kh-amber'}`}>
                  <span className="msym text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>{allSeen ? 'done_all' : 'visibility'}</span>
                  {b.seen}/{b.total}
                </span>
                <span className="msym text-[20px] text-kh-muted flex-shrink-0">{open ? 'expand_less' : 'expand_more'}</span>
              </button>
              {open && (
                <div className="px-4 pb-4 -mt-1">
                  <div className="border-t border-kh-border/50 pt-3 flex flex-col gap-1.5">
                    {b.recipients.map((r, i) => (
                      <div key={i} className="flex items-center gap-2 text-[13px]">
                        <span className={`msym text-[16px] ${r.seen ? 'text-kh-teal' : 'text-kh-border'}`} style={{ fontVariationSettings: `'FILL' ${r.seen ? 1 : 0}` }}>
                          {r.seen ? 'check_circle' : 'radio_button_unchecked'}
                        </span>
                        <span className={r.seen ? 'text-kh-dark' : 'text-kh-muted'}>{r.name}</span>
                        {!r.seen && <span className="text-[11px] text-kh-amber ml-auto">noch nicht gesehen</span>}
                      </div>
                    ))}
                    {notSeen.length === 0 && (
                      <p className="text-[12.5px] font-semibold text-kh-teal flex items-center gap-1.5">
                        <span className="msym text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        Alle haben gesehen
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}

function ComposeModal({
  allParents, allStudents, classes, activeClassId, userId, onClose,
}: {
  allParents: ParentLite[]
  allStudents: StudentLite[]
  classes: ClassLite[]
  activeClassId: string
  userId: string
  onClose: () => void
}) {
  const router = useRouter()
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  // Standardmäßig nur die aktive Klasse gewählt.
  const [pickedClasses, setPickedClasses] = useState<Set<string>>(new Set([activeClassId]))

  // Eltern je Schüler (child_id) gruppieren – über alle Klassen.
  const parentsByChild = useMemo(() => {
    const map: Record<string, ParentLite[]> = {}
    for (const p of allParents) if (p.child_id) (map[p.child_id] ??= []).push(p)
    return map
  }, [allParents])

  // Auswählbare Schüler = mit verknüpftem Elternteil UND in einer gewählten Klasse.
  const selectable = useMemo(
    () => allStudents.filter(s => parentsByChild[s.id]?.length && s.class_id && pickedClasses.has(s.class_id)),
    [allStudents, parentsByChild, pickedClasses],
  )
  const studentsWithoutParent = useMemo(
    () => allStudents.filter(s => s.class_id && pickedClasses.has(s.class_id) && !(parentsByChild[s.id]?.length)),
    [allStudents, parentsByChild, pickedClasses],
  )

  function toggle(studentId: string) {
    setPicked(prev => {
      const next = new Set(prev)
      next.has(studentId) ? next.delete(studentId) : next.add(studentId)
      return next
    })
  }

  function toggleClass(cid: string) {
    setPickedClasses(prev => {
      const next = new Set(prev)
      if (next.has(cid)) { if (next.size > 1) next.delete(cid) } // mind. eine Klasse bleibt gewählt
      else next.add(cid)
      return next
    })
  }

  // Eltern der aktuell gewählten Klassen (Basis für "an alle").
  const parentsInClasses = useMemo(
    () => allParents.filter(p => p.class_id && pickedClasses.has(p.class_id)),
    [allParents, pickedClasses],
  )

  // Ziel-Eltern: keine Schülerauswahl = an alle Eltern der gewählten Klassen;
  // sonst Eltern der ausgewählten (und noch sichtbaren) Schüler.
  const targetParents: ParentLite[] = useMemo(() => {
    if (picked.size === 0) return parentsInClasses
    const out: ParentLite[] = []
    const visible = new Set(selectable.map(s => s.id))
    for (const sid of picked) if (visible.has(sid)) out.push(...(parentsByChild[sid] ?? []))
    return out
  }, [picked, parentsInClasses, selectable, parentsByChild])

  async function send() {
    const text = body.trim()
    if (!text || sending || targetParents.length === 0) return
    setSending(true)
    const supabase = createClient()
    const broadcastId = targetParents.length > 1 ? crypto.randomUUID() : null
    // Jede Zeile trägt die EIGENE Klasse des Elternteils (RLS-Anforderung).
    const rows = targetParents
      .filter(p => p.class_id)
      .map(p => ({
        class_id: p.class_id as string,
        parent_id: p.id,
        sender_id: userId,
        body: text,
        broadcast_id: broadcastId,
      }))
    await supabase.from('messages').insert(rows)
    setSending(false)
    onClose()
    router.refresh()
  }

  const modal = (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[74px] px-4 pb-4 bg-black/40" onClick={onClose}>
      <div
        className="bg-white w-full max-w-md rounded-3xl p-5 max-h-[calc(100dvh-90px)] overflow-y-auto scrollbar-kh shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[18px] font-extrabold text-kh-dark">Sammelnachricht</h2>
          <button onClick={onClose} aria-label="Schließen" className="w-8 h-8 rounded-full flex items-center justify-center text-kh-muted hover:bg-[#EDEDEC]">
            <span className="msym text-[20px]">close</span>
          </button>
        </div>

        {/* Klassen-Picker (nur bei mehreren Klassen) */}
        {classes.length > 1 && (
          <div className="mb-4">
            <span className="text-[12px] font-bold text-kh-muted block mb-2">Klassen</span>
            <div className="flex flex-wrap gap-1.5">
              {classes.map(c => {
                const on = pickedClasses.has(c.id)
                return (
                  <button key={c.id} type="button" onClick={() => toggleClass(c.id)}
                    className={`text-[12px] font-bold px-3 py-1.5 rounded-full border transition-colors ${
                      on ? 'border-kh-teal bg-kh-teal/10 text-kh-teal' : 'border-kh-border text-kh-muted hover:border-kh-teal/50'
                    }`}>
                    {c.name}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-bold text-kh-muted">
              {picked.size > 0 ? `${targetParents.length} Empfänger` : 'An alle Eltern der gewählten Klassen'}
            </span>
            <div className="flex gap-1.5">
              <button type="button" onClick={() => setPicked(new Set(selectable.map(s => s.id)))}
                className="text-[11px] font-bold px-3 py-1 rounded-full border border-kh-border hover:border-kh-teal hover:text-kh-teal text-kh-muted transition-colors">
                Alle
              </button>
              <button type="button" onClick={() => setPicked(new Set())}
                className="text-[11px] font-bold px-3 py-1 rounded-full border border-kh-border hover:border-kh-teal hover:text-kh-teal text-kh-muted transition-colors">
                Keinen
              </button>
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto scrollbar-kh flex flex-col gap-3">
            {classes.filter(c => pickedClasses.has(c.id)).map(c => {
              const group = selectable.filter(s => s.class_id === c.id)
              if (group.length === 0) return null
              const showHeading = pickedClasses.size > 1
              return (
                <div key={c.id}>
                  {showHeading && (
                    <span className="text-[11px] font-bold text-kh-muted/80 block mb-1.5">{c.name}</span>
                  )}
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {group.map(s => {
                      const selected = picked.has(s.id)
                      const first = s.full_name.split(' ')[0].split('-')[0]
                      const long = first.length >= 8
                      return (
                        <button key={s.id} type="button" onClick={() => toggle(s.id)}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border transition-all min-w-0 ${
                            selected ? 'border-kh-teal bg-kh-teal/10' : 'border-kh-border hover:border-kh-teal/50'
                          }`}>
                          <Avatar name={s.full_name} color={s.avatar_color} seed={s.avatar_seed}
                            hairColor={s.avatar_hair_color} skinColor={s.avatar_skin_color} size={22} />
                          <span className={`${long ? 'text-[10px]' : 'text-[12px]'} font-semibold leading-tight truncate min-w-0 ${selected ? 'text-kh-teal' : 'text-kh-dark'}`}>
                            {first}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
          {studentsWithoutParent.length > 0 && (
            <p className="mt-2 text-[12px] text-kh-amber flex items-center gap-1.5">
              <span className="msym text-[15px]">info</span>
              {studentsWithoutParent.length} Schüler ohne verknüpftes Elternteil (nicht auswählbar).
            </p>
          )}
        </div>

        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={4}
          placeholder="Nachricht an die ausgewählten Hefte…"
          className="w-full resize-none rounded-[16px] border border-kh-border/70 px-4 py-3 text-[14px] focus:outline-none focus:border-kh-teal mb-4"
        />

        <button
          onClick={send}
          disabled={!body.trim() || sending || targetParents.length === 0}
          className="w-full py-3 rounded-full gradient-teal text-white font-bold text-sm disabled:opacity-40 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
        >
          <span className="msym text-[19px]">send</span>
          An {targetParents.length} {targetParents.length === 1 ? 'Heft' : 'Hefte'} senden
        </button>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
