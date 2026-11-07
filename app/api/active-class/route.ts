import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { classId } = await req.json()
  const jar = await cookies()
  if (classId) {
    jar.set('active_class_id', classId, { path: '/', httpOnly: true, sameSite: 'lax' })
  } else {
    jar.delete('active_class_id')
  }
  return NextResponse.json({ ok: true })
}

/**
 * Umschalten per Link, für Push-Benachrichtigungen: Wer auf „Neue Nachricht
 * an Sie“ tippt, soll in der Klasse landen, aus der sie kommt, und nicht in
 * der, die gerade zufällig aktiv ist.
 *
 * Das Cookie ist auch hier nur ein Wunsch (siehe POST): Zugriff entscheidet
 * RLS. `next` muss ein Pfad innerhalb der App sein, sonst ginge der Link als
 * Weiterleitung auf eine fremde Seite durch.
 */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const classId = url.searchParams.get('classId')
  const next = url.searchParams.get('next') ?? '/'
  const ziel = next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : '/'
  const res = NextResponse.redirect(new URL(ziel, url.origin))
  if (classId && /^[0-9a-f-]{36}$/i.test(classId)) {
    res.cookies.set('active_class_id', classId, { path: '/', httpOnly: true, sameSite: 'lax' })
  }
  return res
}
