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

/** Anwesenheits-Modul für die rechte Seitenspalte der Lehrer-Startseite:
 *  offene Elternmeldungen mit einem Tap bestätigen/ablehnen, darunter die
 *  heute Abwesenden als kompakte Liste. Ohne Inhalt bleibt die Karte
 *  unsichtbar — kein Rauschen auf der Startseite. */
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
  const now = new Date()
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const visibleAbsent = absentToday.filter(a => !rejectedIds.has(`${a.student_id}|${todayIso}`))

  if (visibleReports.length === 0 && visibleAbsent.length === 0 && !error) return null

  return (
    <div className="bg-white rounded-[20px] p-5 shadow-sm border border-kh-border/50 max-md:rounded-2xl max-md:border-0 max-md:bg-gradient-to-br max-md:from-white max-md:via-white max-md:to-kh-page max-md:shadow-[0_8px_16px_rgba(20,40,45,.10)]">
      <div className="flex items-center gap-2 mb-4">
        <span className="msym text-[19px] text-kh-teal flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>fact_check</span>
        <h2 className="flex-1 font-extrabold text-[15px] text-kh-dark truncate">Anwesenheit</h2>
        <Link
          href="/anwesenheit"
          className="w-8 h-8 rounded-full gradient-teal text-white flex items-center justify-center hover:brightness-105 transition-[filter,opacity] duration-150 tap flex-shrink-0"
          aria-label="Zum Tages-Abgleich"
        >
          <span className="msym text-[19px]">arrow_forward</span>
        </Link>
      </div>

      {error && <div className="text-[12px] font-semibold text-kh-red mb-2">{error}</div>}

      {/* Offene Elternmeldungen — mit einem Tap direkt von hier erledigen */}
      {visibleReports.length > 0 && (
        <div className="mb-1">
          <div className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-kh-muted/70 mb-2">
            Offene {visibleReports.length === 1 ? 'Meldung' : 'Meldungen'}
          </div>
          <div className="flex flex-col gap-1.5">
            {visibleReports.map(r => {
              const student = studentById[r.student_id]
              return (
                <div key={r.id} className="flex items-center gap-2.5 rounded-xl bg-kh-bg/70 px-2.5 py-2">
                  {student && <Avatar name={student.full_name} color={student.avatar_color ?? '#0F8A82'} seed={student.avatar_seed} hairColor={student.avatar_hair_color} skinColor={student.avatar_skin_color} size={28} />}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[13px] text-kh-dark truncate leading-tight">{student?.full_name.split(' ')[0] ?? 'Unbekannt'}</div>
                    <div className="text-[11.5px] text-kh-muted truncate leading-tight" title={r.note ? `„${r.note}"` : undefined}>
                      {fmtDate(r.date)}{r.note && <span className="italic"> · „{r.note}"</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => handle(r.id, 'confirm')}
                    title="Bestätigen"
                    aria-label={`Meldung von ${student?.full_name ?? 'Unbekannt'} bestätigen`}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white gradient-teal hover:brightness-105 active:brightness-95 transition flex-shrink-0"
                  >
                    <span className="msym text-[15px]">check</span>
                  </button>
                  <button
                    onClick={() => handle(r.id, 'reject')}
                    title="Ablehnen — das Kind gilt als anwesend"
                    aria-label={`Meldung von ${student?.full_name ?? 'Unbekannt'} ablehnen`}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-kh-red bg-kh-red-light hover:bg-kh-red hover:text-white transition-colors flex-shrink-0"
                  >
                    <span className="msym text-[15px]">close</span>
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Heute abwesend — kompakte Liste mit Status rechts */}
      {visibleAbsent.length > 0 && (
        <div className={visibleReports.length > 0 ? 'mt-3.5' : ''}>
          <div className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-kh-muted/70 mb-2">
            Heute abwesend · {visibleAbsent.length}
          </div>
          <div className="flex flex-col gap-0.5">
            {visibleAbsent.map(a => {
              const student = studentById[a.student_id]
              if (!student) return null
              const tone = a.pending
                ? { label: 'Gemeldet', color: '#C98A2B' }
                : a.status === 'entschuldigt'
                  ? { label: 'Entschuldigt', color: '#C98A2B' }
                  : { label: 'Unentschuldigt', color: '#E06B57' }
              return (
                <div key={a.student_id} className="flex items-center gap-2.5 px-1 py-[5px]">
                  <Avatar name={student.full_name} color={student.avatar_color ?? '#0F8A82'} seed={student.avatar_seed} hairColor={student.avatar_hair_color} skinColor={student.avatar_skin_color} size={24} />
                  <span className="flex-1 min-w-0 font-semibold text-[13px] text-kh-dark truncate">{student.full_name.split(' ')[0]}</span>
                  <span className="text-[11px] font-bold flex-shrink-0" style={{ color: tone.color }} title={tone.label === 'Gemeldet' ? 'Elternmeldung, noch unbestätigt' : tone.label}>
                    {tone.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
