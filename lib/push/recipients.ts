import type { SupabaseClient } from '@supabase/supabase-js'

/** Neue Zeile in public.messages, wie sie der Database Webhook liefert. */
export interface MessageRow {
  id: string
  class_id: string
  parent_id: string
  sender_id: string | null
  created_at?: string
}

export type PushKind = 'messages' | 'events' | 'reminders' | 'homework'

export interface PushPlan {
  kind: PushKind
  classId: string
  recipientIds: string[]
  title: string
  body: string
  url: string
  /** Gleicher tag ersetzt eine ältere, noch sichtbare Benachrichtigung. */
  tag: string
}

/**
 * Wer bekommt eine Push-Nachricht zu einer neuen Mitteilungsheft-Zeile?
 *
 * - Lehrperson schreibt → genau das Elternteil, dem das Heft gehört
 *   (parent_id). Sammelnachrichten sind bereits pro Heft aufgefächert,
 *   jede Kopie löst also genau eine Push-Nachricht aus.
 * - Elternteil schreibt → die Lehrperson, die zuletzt in DIESEM Heft
 *   geschrieben hat (ihr wird geantwortet). Bewusst nicht alle, die je
 *   geschrieben haben: Sammelnachrichten mehrerer Lehrpersonen hätten
 *   sonst meist 3–4 Empfänger gemacht (in 1b sind 8 eingetragen). Hat
 *   noch niemand geschrieben, die mit is_primary für diese Klasse.
 *
 * Text bewusst ohne Nachrichteninhalt: er steht auf dem Sperrbildschirm.
 */
export async function planMessagePush(db: SupabaseClient, row: MessageRow): Promise<PushPlan> {
  const base = { kind: 'messages' as const, classId: row.class_id, url: '/mitteilungsheft', title: 'ClassHaven' }

  if (row.sender_id !== row.parent_id) {
    return { ...base, recipientIds: [row.parent_id], body: 'Neue Nachricht im Mitteilungsheft', tag: 'heft' }
  }

  const { data: lastTeacherMsg } = await db
    .from('messages')
    .select('sender_id')
    .eq('parent_id', row.parent_id)
    .eq('class_id', row.class_id)
    .neq('sender_id', row.parent_id)
    .not('sender_id', 'is', null)
    .lt('created_at', row.created_at ?? new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
  let teacherIds = (lastTeacherMsg ?? []).map((m: { sender_id: string }) => m.sender_id)

  if (teacherIds.length === 0) {
    const { data: primary } = await db
      .from('teacher_classes')
      .select('teacher_id')
      .eq('class_id', row.class_id)
      .eq('is_primary', true)
    teacherIds = (primary ?? []).map((r: { teacher_id: string }) => r.teacher_id)
  }

  const { data: parent } = await db.from('profiles').select('full_name').eq('id', row.parent_id).single()
  const name = (parent as { full_name: string } | null)?.full_name
  return {
    ...base,
    recipientIds: teacherIds,
    body: name ? `Neue Antwort von ${name}` : 'Neue Antwort im Mitteilungsheft',
    tag: `heft-${row.parent_id}`,
  }
}
