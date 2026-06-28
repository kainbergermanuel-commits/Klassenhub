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
