'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { confirmReport, rejectReport } from '@/app/actions/attendance'
import Avatar from '@/components/ui/Avatar'

interface Person {
  id: string
  full_name: string
  avatar_color?: string | null
  avatar_seed?: string | null
  avatar_hair_color?: string | null
  avatar_skin_color?: string | null
}

export interface PendingAttendanceReport {
  id: string
  student_id: string
  date: string
  note: string
}

export interface AbsentTodayEntry {
  student_id: string
  status: 'entschuldigt' | 'unentschuldigt'
  pending: boolean
}

interface Props {
  pendingReports: PendingAttendanceReport[]
  absentToday: AbsentTodayEntry[]
  students: Person[]
}

function fmtDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('de-AT', { weekday: 'short', day: 'numeric', month: 'short' })
}

/** Anwesenheit auf der Lehrer-Startseite: offene Elternmeldungen direkt hier
 *  bestätigen/ablehnen (null Extra-Klicks) + wer heute fehlt auf einen Blick.
 *  Ohne Meldungen und ohne Abwesende bleibt die Karte bewusst unsichtbar —
 *  kein Rauschen auf der Startseite. */
export default function AttendanceTeacherCard({ pendingReports, absentToday, students }: Props) {
  const router = useRouter()
  // Optimistisch ausgeblendete Meldungen (bestätigt/abgelehnt), bis refresh greift
  const [handled, setHandled] = useState<Record<string, 'confirm' | 'reject'>>({})
  const [error, setError] = useState<string | null>(null)

  const studentById = Object.fromEntries(students.map(s => [s.id, s]))
  const visibleReports = pendingReports.filter(r => !handled[r.id])

  async function handle(id: string, action: 'confirm' | 'reject') {
    setHandled(prev => ({ ...prev, [id]: action }))
    setError(null)
    try {
      if (action === 'confirm') await confirmReport(id)
      else await rejectReport(id)
      router.refresh()
    } catch (e) {
      setHandled(prev => { const rest = { ...prev }; delete rest[id]; return rest })
      setError(e instanceof Error ? e.message : 'Aktion fehlgeschlagen')
    }
  }

  // Abgelehnte Meldungen verschwinden auch aus „heute abwesend"
  const rejectedIds = new Set(
    pendingReports.filter(r => handled[r.id] === 'reject').map(r => `${r.student_id}|${r.date}`)
  )
  const today = new Date()
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const visibleAbsent = absentToday.filter(a => !rejectedIds.has(`${a.student_id}|${todayIso}`))

  if (visibleReports.length === 0 && visibleAbsent.length === 0 && !error) return null

  return (
    <div className="animate-card-enter rounded-2xl p-5 shadow-[0_8px_16px_rgba(20,40,45,.10)]" style={{ background: 'linear-gradient(135deg, #F0FAF6 0%, #FEFEFC 100%)' }}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="flex items-center gap-2 font-extrabold text-base text-kh-dark whitespace-nowrap min-w-0">
          <span className="msym text-[20px] text-kh-teal flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>fact_check</span>
          <span className="truncate">Anwesenheit heute</span>
        </h2>
        <Link href="/anwesenheit" className="text-sm font-semibold text-kh-teal hover:underline flex-shrink-0">Abgleich</Link>
      </div>

      {error && <div className="text-[12.5px] font-semibold text-kh-red mb-2">{error}</div>}

      {/* Offene Elternmeldungen — mit einem Tap direkt von hier erledigen */}
      {visibleReports.length > 0 && (
        <div className="flex flex-col gap-2 mb-1">
          {visibleReports.map(r => {
            const student = studentById[r.student_id]
            return (
              <div key={r.id} className="flex items-center gap-3 rounded-xl bg-white px-3 py-2.5 flex-wrap">
                {student && <Avatar name={student.full_name} color={student.avatar_color ?? '#0F8A82'} seed={student.avatar_seed} hairColor={student.avatar_hair_color} skinColor={student.avatar_skin_color} size={32} />}
                <div className="flex-1 min-w-[130px]">
                  <div className="font-bold text-[13.5px] text-kh-dark truncate">{student?.full_name ?? 'Unbekannt'}</div>
                  <div className="text-[12px] text-kh-muted truncate">
                    {fmtDate(r.date)}{r.note && <span className="italic"> · „{r.note}"</span>}
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handle(r.id, 'confirm')}
                    className="px-3 py-1.5 rounded-full text-[12px] font-bold text-white gradient-teal hover:brightness-105 active:brightness-95 transition"
                  >
                    Bestätigen
                  </button>
                  <button
                    onClick={() => handle(r.id, 'reject')}
                    title="Ablehnen — das Kind gilt als anwesend"
                    className="w-8 h-8 rounded-full flex items-center justify-center text-kh-red bg-kh-red-light hover:bg-kh-red hover:text-white transition-colors"
                  >
                    <span className="msym text-[16px]">close</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Wer fehlt heute — Avatar-Chips mit Status-Farbe */}
      {visibleAbsent.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          <span className="text-[12px] font-semibold text-kh-muted mr-1">
            {visibleAbsent.length === 1 ? 'Heute abwesend:' : `${visibleAbsent.length} heute abwesend:`}
          </span>
          {visibleAbsent.map(a => {
            const student = studentById[a.student_id]
            if (!student) return null
            const tone = a.pending
              ? { color: '#C98A2B', bg: '#F8ECD6', title: 'Elternmeldung, noch unbestätigt' }
              : a.status === 'entschuldigt'
                ? { color: '#C98A2B', bg: '#F8ECD6', title: 'Entschuldigt' }
                : { color: '#E06B57', bg: '#FDECEA', title: 'Unentschuldigt' }
            return (
              <span
                key={a.student_id}
                title={tone.title}
                className="flex items-center gap-1.5 text-[12px] font-semibold pl-1 pr-2.5 py-0.5 rounded-full"
                style={{ color: tone.color, background: tone.bg }}
              >
                <Avatar name={student.full_name} color={student.avatar_color ?? '#0F8A82'} seed={student.avatar_seed} hairColor={student.avatar_hair_color} skinColor={student.avatar_skin_color} size={20} />
                {student.full_name.split(' ')[0]}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}
