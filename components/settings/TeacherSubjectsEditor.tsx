'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { saveTeacherSubjects, type TeacherSubject } from '@/app/actions/saveTeacherSubjects'
import type { SubjectOption } from '@/lib/subjectsCatalog'

interface Props {
  initial: TeacherSubject[]
  activeClassId?: string | null
  allClasses?: { id: string; name: string }[]
  /** Fächer-Katalog (Admin-verwaltet, siehe lib/subjectsCatalog.ts). */
  subjects: SubjectOption[]
}

export default function TeacherSubjectsEditor({ initial, activeClassId, allClasses = [], subjects }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<TeacherSubject[]>(initial)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(false)
  const [switching, setSwitching] = useState(false)
  const [, startTransition] = useTransition()

  async function switchClass(classId: string) {
    if (classId === activeClassId || switching) return
    setSwitching(true)
    await fetch('/api/active-class', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classId }),
    })
    router.refresh()
  }

  function toggle(s: SubjectOption) {
    setSelected(prev => {
      const exists = prev.find(x => x.short === s.short)
      if (exists) {
        const next = prev.filter(x => x.short !== s.short)
        // if removed was primary, make first remaining primary
        if (exists.primary && next.length > 0) next[0] = { ...next[0], primary: true }
        return next
      }
      return [...prev, { subject: s.label, short: s.short, color: s.color, primary: prev.length === 0 }]
    })
    setSaved(false)
  }

  function setPrimary(short: string) {
    setSelected(prev => prev.map(x => ({ ...x, primary: x.short === short })))
    setSaved(false)
  }

  function save() {
    setError(false)
    startTransition(async () => {
      try {
        await saveTeacherSubjects(selected)
        setSaved(true)
      } catch {
        setError(true)
      }
    })
  }

  return (
    <div className="bg-[#FAF8F3] rounded-2xl p-5 border border-kh-border">
      <h2 className="text-[15px] font-extrabold text-kh-dark mb-1">Meine Fächer</h2>
      {allClasses.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {allClasses.map(c => (
            <button
              key={c.id}
              onClick={() => switchClass(c.id)}
              disabled={switching}
              className={`w-[72px] flex items-center justify-center gap-1.5 text-[12px] font-semibold px-2.5 py-1 rounded-full transition-all ${
                c.id === activeClassId
                  ? 'bg-kh-teal/15 text-kh-teal'
                  : 'text-kh-muted/60 hover:text-kh-muted hover:bg-kh-border/20'
              }`}
            >
              <span className="msym text-[14px]" style={{ fontVariationSettings: `'FILL' ${c.id === activeClassId ? 1 : 0}` }}>group</span>
              {c.name}
            </button>
          ))}
        </div>
      )}
      <p className="text-[12.5px] text-kh-muted mb-4">Fächer auswählen · Stern = Hauptfach (bestimmt Kartenfarbe)</p>

      <div className="flex flex-wrap gap-2 mb-4">
        {subjects.map(s => {
          const active = selected.find(x => x.short === s.short)
          return (
            <button
              key={s.short}
              onClick={() => toggle(s)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-bold transition-all border"
              style={active
                ? { background: s.color, color: '#fff', borderColor: s.color }
                : { background: '#fff', color: '#46565A', borderColor: '#D8D0C2' }
              }
            >
              {s.label}
              {active && (
                <span
                  className="msym text-[14px] leading-none"
                  onClick={e => { e.stopPropagation(); setPrimary(s.short) }}
                  style={{ color: active.primary ? '#FFD700' : 'rgba(255,255,255,0.6)' }}
                >
                  {active.primary ? 'star' : 'star'}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {selected.map(s => (
            <span
              key={s.short}
              className="flex items-center gap-1 text-[12px] font-bold px-2.5 py-1 rounded-full text-white"
              style={{ background: s.color }}
            >
              {s.primary && <span className="msym text-[12px]" style={{ color: '#FFD700' }}>star</span>}
              {s.subject}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={selected.length === 0}
          className="px-5 py-2 rounded-full gradient-teal text-white text-[13px] font-bold hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          {saved ? '✓ Gespeichert' : 'Speichern'}
        </button>
        {error && <span className="text-[12px] font-semibold text-kh-red">Fehler beim Speichern.</span>}
      </div>
    </div>
  )
}
