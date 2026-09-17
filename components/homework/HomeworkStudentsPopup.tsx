'use client'

import { useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import Avatar from '@/components/ui/Avatar'
import { isHwForStudent } from '@/lib/homeworkScope'

/** Die Hausübung, so viel wie das Auge davon braucht. `excluded_student_ids`
 *  ist Pflicht (siehe lib/homeworkScope.ts): fehlt die Spalte in einer
 *  Abfrage, meldet es TypeScript, statt ausgenommene Kinder still unter
 *  "Nicht gemacht" einzureihen. */
export type EyeHomework = {
  id: string
  class_id: string
  title: string
  subject_color: string
  subject_short: string
  excluded_student_ids: string[] | null
}

interface StudentRow {
  id: string
  full_name: string
  done: boolean
  /** Von den Eltern bestätigt — nur das zählt für Flamme und Klassenziel. */
  confirmed: boolean
  /** Persönlich per Zeitkristall verlängerte Frist (0 = keine). */
  extraDays: number
  avatar_color: string
  avatar_seed: string | null
  avatar_hair_color: string | null
  avatar_skin_color: string | null
}

/**
 * Das "Auge" einer Hausübung: wer hat sie gemacht, wer wartet noch auf die
 * Bestätigung der Eltern, wer hat sie nicht gemacht, wer bekommt sie gar
 * nicht. Bewusst EINE Komponente für die HÜ-Seite und die Startseite — die
 * Startseite zeigte vorher nur gemacht/nicht gemacht und damit eine andere
 * Wahrheit als dasselbe Symbol eine Ebene tiefer.
 */
export default function HomeworkStudentsPopup({ hw }: { hw: EyeHomework }) {
  const [open, setOpen] = useState(false)
  const [students, setStudents] = useState<StudentRow[] | null>(null)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const openPopup = useCallback(async () => {
    setOpen(true)
    // Bei jedem Öffnen neu laden. Hakt ein Kind zwischendurch ab, wäre eine
    // einmal gecachte Liste dauerhaft falsch — die Karte wird durch
    // router.refresh() nicht neu erzeugt. Die alte Liste bleibt so lange
    // stehen, bis die neue da ist, deshalb kein Flackern.
    const supabase = createClient()
    const [{ data: allStudents }, { data: completions }, { data: extensions }] = await Promise.all([
      supabase.from('profiles').select('id, full_name, avatar_color, avatar_seed, avatar_hair_color, avatar_skin_color').eq('class_id', hw.class_id).eq('role', 'student').order('full_name'),
      supabase.from('homework_completions').select('student_id,confirmed_by_parent_at').eq('homework_id', hw.id),
      // Verlängerungen sind für die Lehrkraft sichtbar (Transparenz statt
      // stiller Ausnahme, siehe supabase/feature-hw-extension.sql).
      supabase.from('homework_extensions').select('student_id,extra_days').eq('homework_id', hw.id),
    ])
    const doneIds = new Set((completions ?? []).map(c => c.student_id))
    const confirmedIds = new Set((completions ?? []).filter(c => c.confirmed_by_parent_at).map(c => c.student_id))
    const extraById = new Map((extensions ?? []).map(e => [e.student_id, e.extra_days]))
    setStudents((allStudents ?? []).map(s => ({
      ...s,
      avatar_color: s.avatar_color ?? '#0F8A82',
      avatar_seed: s.avatar_seed ?? null,
      avatar_hair_color: s.avatar_hair_color ?? null,
      avatar_skin_color: s.avatar_skin_color ?? null,
      done: doneIds.has(s.id),
      confirmed: confirmedIds.has(s.id),
      extraDays: extraById.get(s.id) ?? 0,
    })))
  }, [hw.id, hw.class_id])

  return (
    <>
      <button onClick={openPopup} aria-label="Wer hat die Hausübung gemacht?" className="msym text-[17px] text-kh-teal/60 hover:text-kh-teal transition-colors leading-none">visibility</button>
      {open && mounted && createPortal(
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-[11px] flex items-center justify-center font-extrabold text-[13px] text-white flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${hw.subject_color}ee 0%, ${hw.subject_color}99 100%)` }}
                >
                  {hw.subject_short}
                </div>
                <h2 className="text-[16px] font-extrabold text-kh-dark">{hw.title}</h2>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Schließen" className="msym text-2xl text-kh-muted hover:text-kh-dark transition-colors">close</button>
            </div>
            {students === null ? (
              <div className="text-center py-8 text-kh-muted text-sm">Lädt…</div>
            ) : (
              <div className="flex flex-col gap-4">
                {/* Bestätigt — zählt für Flamme und Klassenziel */}
                <StudentGroup
                  label="Bestätigt"
                  icon="verified"
                  fill={1}
                  color="#2E9C6E"
                  chipBg="#DDF0E7"
                  students={students.filter(s => s.done && s.confirmed)}
                  emptyText="Noch niemand"
                />
                <div className="border-t border-kh-border/40" />
                {/* Gemacht, aber die Eltern-Bestätigung fehlt noch */}
                <StudentGroup
                  label="Wartet auf Bestätigung"
                  icon="hourglass_top"
                  fill={0}
                  color="#C98A2B"
                  chipBg="#F8ECD6"
                  students={students.filter(s => s.done && !s.confirmed)}
                  emptyText="Niemand"
                />
                <div className="border-t border-kh-border/40" />
                {/* Nicht gemacht */}
                <StudentGroup
                  label="Nicht gemacht"
                  icon="radio_button_unchecked"
                  fill={0}
                  color="#6E7E80"
                  chipBg="#F6F3ED"
                  students={students.filter(s => !s.done && isHwForStudent(hw, s.id))}
                  emptyText="Alle haben gemacht 🎉"
                />
                {/* Ausgenommene Kinder standen vorher unter "Nicht gemacht" und
                    sahen damit aus wie ein Versäumnis. Eigene Gruppe, und nur
                    da, wenn es sie überhaupt gibt. */}
                {students.some(s => !isHwForStudent(hw, s.id)) && (
                  <>
                    <div className="border-t border-kh-border/40" />
                    <StudentGroup
                      label="Bekommen diese HÜ nicht"
                      icon="do_not_disturb_on"
                      fill={0}
                      color="#6E7E80"
                      chipBg="#F6F3ED"
                      students={students.filter(s => !isHwForStudent(hw, s.id))}
                      emptyText="Niemand"
                    />
                  </>
                )}
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}

function StudentGroup({
  label, icon, fill, color, chipBg, students, emptyText,
}: {
  label: string
  icon: string
  fill: 0 | 1
  color: string
  chipBg: string
  students: StudentRow[]
  emptyText: string
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <span className="msym text-[16px]" style={{ color, fontVariationSettings: `'FILL' ${fill}` }}>{icon}</span>
        <span className="text-[12px] font-extrabold uppercase tracking-wide" style={{ color }}>
          {label} · {students.length}
        </span>
      </div>
      {students.length === 0
        ? <p className="text-xs text-kh-muted pl-1">{emptyText}</p>
        : <div className="flex flex-wrap gap-1.5">
            {students.map(s => (
              <span key={s.id} className="flex items-center gap-1.5 text-[12px] font-semibold pl-1 pr-2.5 py-0.5 rounded-full" style={{ background: chipBg, color }}>
                <Avatar name={s.full_name} color={s.avatar_color} seed={s.avatar_seed} hairColor={s.avatar_hair_color} skinColor={s.avatar_skin_color} size={20} />
                {s.full_name.split(' ')[0]}
                {s.extraDays > 0 && (
                  <span className="msym text-[13px] text-[#4A6FA5]" title={`Zeitkristall: Frist um ${s.extraDays} Tage verlängert`} style={{ fontVariationSettings: "'FILL' 1" }}>diamond</span>
                )}
              </span>
            ))}
          </div>
      }
    </div>
  )
}
