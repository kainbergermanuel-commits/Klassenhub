import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { role, personId } = await req.json()
  const res = NextResponse.json({ ok: true })

  if (!role) {
    res.cookies.delete('preview_role')
    res.cookies.delete('preview_student_id')
    res.cookies.delete('preview_parent_id')
  } else {
    res.cookies.set('preview_role', role, { path: '/', httpOnly: true, sameSite: 'lax' })
    if (role === 'student') {
      res.cookies.delete('preview_parent_id')
      if (personId) res.cookies.set('preview_student_id', personId, { path: '/', httpOnly: true, sameSite: 'lax' })
      else res.cookies.delete('preview_student_id')
    } else if (role === 'parent') {
      res.cookies.delete('preview_student_id')
      if (personId) res.cookies.set('preview_parent_id', personId, { path: '/', httpOnly: true, sameSite: 'lax' })
      else res.cookies.delete('preview_parent_id')
    }
  }

  return res
}
