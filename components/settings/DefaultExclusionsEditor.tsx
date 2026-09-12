'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Avatar from '@/components/ui/Avatar'
import { setSubjectDefaultExclusion } from '@/app/actions/defaultExclusions'
import type { SubjectOption } from '@/lib/subjectsCatalog'

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
  className: string
  students: Student[]
  subjects: SubjectOption[]
  /** Bestehende Standard-Ausnahmen: Kind-ID → Fachkürzel[]. */
  initial: Record<string, string[]>
}

/**
 * Standard-Ausnahmen je Kind und Fach.
 *
 * „Dieses Kind ist in Englisch nicht dabei" — mehr sagt diese Liste nicht,
 * und mehr wird auch nicht gespeichert. Kein Förderstatus, kein Grund, keine
 * Diagnose; dieselbe Linie wie bei den Ausnahmen an der einzelnen Hausübung
 * (supabase/add-homework-exclusions.sql).
 *
 * Die Einstellung wirkt als VORAUSWAHL beim Anlegen einer Hausübung, nicht als
 * stille Automatik: im Formular sieht die Lehrperson die vorausgewählten
 * Kinder und kann sie im Einzelfall wieder dazunehmen.
 */
export default function DefaultExclusionsEditor({ classId, className, students, subjects, initial }: Props) {
  const router = useRouter()
  const [map, setMap] = useState<Record<string, string[]>>(initial)
  const [openId, setOpenId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const total = Object.values(map).reduce((n, arr) => n + arr.length, 0)

  function toggle(studentId: string, short: string) {
    const current = map[studentId] ?? []
    const on = current.includes(short)
    const next = on ? current.filter(s => s !== short) : [...current, short]
    // Sofort sichtbar, danach speichern. Schlägt das Speichern fehl, wird
    // zurückgerollt — eine Ausnahme, die nur in der Oberfläche existiert,
    // wäre der gefährlichste Zustand dieses Bausteins.
    setMap(prev => ({ ...prev, [studentId]: next }))
    setError(null)
    startTransition(async () => {
      try {
        await setSubjectDefaultExclusion(classId, studentId, short, !on)
        router.refresh()
      } catch (e) {
        setMap(prev => ({ ...prev, [studentId]: current }))
        setError(e instanceof Error ? e.message : 'Speichern fehlgeschlagen.')
      }
    })
  }

  return (
    <div className="kh-card px-5 py-5">
      <button onClick={() => setExpanded(v => !v)} className="w-full flex items-start gap-3 text-left">
        <span className="msym text-[22px] text-kh-teal flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>rule</span>
        <div className="flex-1 min-w-0">
          <h2 className="font-extrabold text-[15px] text-kh-dark">Standard-Ausnahmen · {className}</h2>
          <p className="text-[12.5px] text-kh-muted font-medium mt-0.5 leading-snug">
            Kinder, die in einem Fach dauerhaft nicht mitarbeiten, bekommen dessen
            Hausübungen nicht mehr automatisch.
            {total > 0 && ` Derzeit ${total} ${total === 1 ? 'Eintrag' : 'Einträge'}.`}
          </p>
        </div>
        <span className="msym text-[20px] text-kh-muted flex-shrink-0">{expanded ? 'expand_less' : 'expand_more'}</span>
      </button>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-kh-border/50">
          <p className="text-[11.5px] text-kh-muted font-semibold leading-snug mb-3">
            Beim Anlegen einer Hausübung sind diese Kinder im betreffenden Fach schon
            ausgenommen — sichtbar und für den Einzelfall änderbar. Der Grund der Ausnahme
            wird nirgends gespeichert.
          </p>

          {error && (
            <div className="bg-kh-red-light text-kh-red text-sm font-semibold rounded-xl px-4 py-3 mb-3">{error}</div>
          )}

          <div className="flex flex-col gap-1.5">
            {students.map(s => {
              const mine = map[s.id] ?? []
              const isOpen = openId === s.id
              return (
                <div key={s.id} className="rounded-xl bg-white/70 ring-1 ring-kh-border/40 px-3 py-2.5">
                  <button
                    onClick={() => setOpenId(isOpen ? null : s.id)}
                    className="w-full flex items-center gap-2.5 text-left"
                  >
                    <Avatar
                      name={s.full_name} color={s.avatar_color} seed={s.avatar_seed}
                      hairColor={s.avatar_hair_color} skinColor={s.avatar_skin_color} size={26}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13.5px] font-bold text-kh-dark truncate">{s.full_name}</div>
                      <div className="text-[11.5px] font-semibold text-kh-muted">
                        {mine.length === 0
                          ? 'nimmt an allen Fächern teil'
                          : `nicht dabei in ${mine.join(', ')}`}
                      </div>
                    </div>
                    <span className="msym text-[18px] text-kh-muted">{isOpen ? 'expand_less' : 'edit'}</span>
                  </button>

                  {isOpen && (
                    <div className="mt-2.5 pt-2.5 border-t border-kh-border/40 flex flex-wrap gap-1.5">
                      {subjects.map(sub => {
                        const on = mine.includes(sub.short)
                        return (
                          <button
                            key={sub.short}
                            onClick={() => toggle(s.id, sub.short)}
                            aria-pressed={on}
                            title={on ? `${s.full_name.split(' ')[0]} ist in ${sub.label} nicht dabei` : `${s.full_name.split(' ')[0]} ist in ${sub.label} dabei`}
                            className={`px-2.5 py-1 rounded-full border text-[11.5px] font-bold transition-all ${
                              on
                                ? 'border-kh-border bg-[#F6F3ED] text-kh-muted line-through decoration-1'
                                : 'border-kh-teal/40 bg-kh-teal/5 text-kh-dark'
                            }`}
                          >
                            {sub.short}
                          </button>
                        )
                      })}
                      {subjects.length === 0 && (
                        <span className="text-[12px] text-kh-muted font-semibold">Kein Fächer-Katalog vorhanden.</span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
            {students.length === 0 && (
              <div className="text-[12.5px] text-kh-muted font-semibold">Keine Kinder in dieser Klasse.</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
