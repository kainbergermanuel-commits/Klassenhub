'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Avatar from '@/components/ui/Avatar'

/**
 * Auswahl, welche Kinder eine Hausübung NICHT bekommen.
 *
 * Bewusst als Abwahl gebaut: beim Öffnen sind alle Kinder dabei, und wer die
 * HÜ nicht bekommen soll, wird aktiv herausgenommen. Der umgekehrte Weg
 * (zuteilen wie bei den Erinnerungen) hiesse, für eine ganz normale HÜ jedes
 * Mal die halbe Klasse anzuklicken.
 *
 * Der GRUND einer Ausnahme steht nirgends, weder hier noch in der Datenbank.
 * Die Oberfläche sagt nur "bekommt diese Hausübung nicht", nichts über das
 * Kind. Siehe supabase/add-homework-exclusions.sql.
 */

interface Student {
  id: string
  full_name: string
  avatar_color: string
  avatar_seed: string | null
  avatar_hair_color: string | null
  avatar_skin_color: string | null
}

interface Props {
  classId: string
  /** IDs der ausgenommenen Kinder. Leeres Array = die HÜ gilt für alle. */
  value: string[]
  onChange: (excludedIds: string[]) => void
  /** Beim Bearbeiten einer HÜ, die schon Ausnahmen hat, gleich aufgeklappt
   *  starten — sonst bliebe der bestehende Zustand hinter einem Klick
   *  verborgen und man ändert ihn versehentlich nicht mit. */
  defaultOpen?: boolean
}

export default function StudentExclusionPicker({ classId, value, onChange, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const [students, setStudents] = useState<Student[] | null>(null)

  // Erst beim Aufklappen laden. Der Normalfall ist "gilt für alle", da soll
  // das Anlegen einer HÜ keine zusätzliche Abfrage kosten.
  useEffect(() => {
    if (!open || students !== null) return
    createClient()
      .from('profiles')
      .select('id,full_name,avatar_color,avatar_seed,avatar_hair_color,avatar_skin_color')
      .eq('class_id', classId).eq('role', 'student').order('full_name')
      .then(({ data }) => setStudents(data ?? []))
  }, [open, classId, students])

  const excluded = new Set(value)

  function toggle(id: string) {
    const next = new Set(excluded)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onChange([...next])
  }

  const summary = value.length === 0
    ? 'Für alle Kinder'
    : `${value.length} ${value.length === 1 ? 'Kind bekommt' : 'Kinder bekommen'} sie nicht`

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="flex items-center gap-1.5 text-[12px] font-bold text-kh-muted hover:text-kh-dark transition-colors"
      >
        <span className="msym text-[15px]">{open ? 'expand_less' : 'expand_more'}</span>
        {summary}
        {value.length === 0 && <span className="font-semibold text-kh-muted/70">· einzelne ausnehmen</span>}
      </button>

      {open && (
        <>
          <p className="text-[11px] font-semibold text-kh-muted mt-2 leading-snug">
            Angetippte Kinder bekommen diese Hausübung nicht. Sie taucht bei ihnen
            nirgends auf und zählt für sie auch nicht als versäumt.
          </p>

          {students === null ? (
            <div className="text-[12px] text-kh-muted font-semibold py-4 text-center">Lädt…</div>
          ) : students.length === 0 ? (
            <div className="text-[12px] text-kh-muted font-semibold py-4 text-center">Keine Kinder in dieser Klasse.</div>
          ) : (
            <>
              {value.length > 0 && (
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="text-[11px] font-bold px-3 py-1 mt-2 rounded-full border border-kh-border hover:border-kh-teal hover:text-kh-teal text-kh-muted transition-colors"
                >
                  Alle wieder dazunehmen
                </button>
              )}
              {/* Bewusst KEIN festes Spaltenraster: in einem Vierer-Grid sind
                  alle Spalten gleich breit, und lange Vornamen brechen mitten
                  im Wort um ("Alexand/er"). Als umbrechende Reihe wächst jeder
                  Chip mit seinem Namen, und kein Name wird zerschnitten. */}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {students.map(s => {
                  const isExcluded = excluded.has(s.id)
                  const firstName = s.full_name.split(' ')[0]
                  // Lange Vornamen etwas kleiner setzen. Das spart Breite, ohne
                  // dass ein Name zerschnitten wird — im festen Raster von
                  // vorher war beides nötig und half trotzdem nicht.
                  const long = firstName.length > 9
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggle(s.id)}
                      aria-pressed={isExcluded}
                      title={isExcluded ? `${firstName} bekommt diese HÜ nicht` : `${firstName} bekommt diese HÜ`}
                      className={`flex items-center gap-1 px-2 py-1 rounded-full border transition-all max-w-full ${
                        isExcluded
                          ? 'border-kh-border bg-[#F6F3ED] opacity-55'
                          : 'border-kh-teal/40 bg-kh-teal/5'
                      }`}
                    >
                      <span className={isExcluded ? 'grayscale' : ''}>
                        <Avatar
                          name={s.full_name} color={s.avatar_color} seed={s.avatar_seed}
                          hairColor={s.avatar_hair_color} skinColor={s.avatar_skin_color} size={18}
                        />
                      </span>
                      {/* Eine Zeile, notfalls mit Auslassungspunkten. Ein
                          angeschnittener Name bleibt lesbar, ein mitten im Wort
                          umgebrochener nicht. */}
                      <span className={`${long ? 'text-[10px]' : 'text-[11.5px]'} font-semibold leading-tight whitespace-nowrap overflow-hidden text-ellipsis min-w-0 ${
                        isExcluded ? 'text-kh-muted line-through decoration-1' : 'text-kh-dark'
                      }`}>
                        {firstName}
                      </span>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
