import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * Merkt sich, welches Kind ein Elternteil gerade ansieht.
 *
 * Gegenstück zu /api/active-class. Hier wird bewusst NICHT geprüft, ob das
 * Kind zum Konto gehört: das Cookie ist nur ein Wunsch. Die Prüfung passiert
 * beim Lesen in getActiveChild(), und die eigentliche Grenze zieht ohnehin
 * RLS über my_child_ids().
 */
export async function POST(req: Request) {
  const { childId } = await req.json()
  const jar = await cookies()
  if (childId) {
    jar.set('active_child_id', childId, { path: '/', httpOnly: true, sameSite: 'lax' })
  } else {
    jar.delete('active_child_id')
  }
  return NextResponse.json({ ok: true })
}
