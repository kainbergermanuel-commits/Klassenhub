import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { planMessagePush, type MessageRow } from '@/lib/push/recipients'
import { dispatch } from '@/lib/push/send'

function secretMatches(given: string | null, expected: string | undefined): boolean {
  if (!given || !expected) return false
  const a = Buffer.from(given), b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

/**
 * Ziel des Supabase Database Webhooks (INSERT auf public.messages).
 * Geschützt über den Header x-push-secret. Antwortet immer schnell mit
 * einem Bericht; ein Fehler hier verhindert nie das Speichern der
 * Nachricht, weil der Webhook erst nach dem Insert läuft.
 */
export async function POST(req: Request) {
  if (!secretMatches(req.headers.get('x-push-secret'), process.env.PUSH_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const payload = await req.json().catch(() => null) as
    | { type?: string; table?: string; record?: Record<string, unknown> }
    | null
  if (payload?.type !== 'INSERT' || !payload.record) {
    return NextResponse.json({ skipped: 'kein INSERT' })
  }

  const db = createServiceClient()
  if (payload.table === 'messages') {
    const plan = await planMessagePush(db, payload.record as unknown as MessageRow)
    const report = await dispatch(db, plan)
    console.log('[push]', payload.table, (payload.record as { id?: string }).id, JSON.stringify({ to: plan.recipientIds, body: plan.body, ...report }))
    return NextResponse.json({ plan, report })
  }

  return NextResponse.json({ skipped: `Tabelle ${payload.table} noch nicht angebunden` })
}
