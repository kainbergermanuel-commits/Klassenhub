'use client'

import { useState, useTransition } from 'react'
import { saveTeacherSubjects, type TeacherSubject } from '@/app/actions/saveTeacherSubjects'

const SUBJECTS = [
  { label: 'Mathematik',          short: 'M',   color: '#0F8A82' },
  { label: 'Deutsch',             short: 'D',   color: '#B0413E' },
  { label: 'Englisch',            short: 'E',   color: '#2F6DB0' },
  { label: 'Biologie',            short: 'BU',  color: '#10B981' },
  { label: 'Geografie',           short: 'GW',  color: '#C98A2B' },
  { label: 'Geschichte',          short: 'GS',  color: '#7B5EA7' },
  { label: 'Physik',              short: 'PH',  color: '#0369A1' },
  { label: 'Chemie',              short: 'CH',  color: '#9D174D' },
  { label: 'Musik',               short: 'MU',  color: '#D44B9E' },
  { label: 'Bew. & Sport',        short: 'BSP', color: '#E07B35' },
  { label: 'Digitale Grundbildung', short: 'DGB', color: '#6366F1' },
  { label: 'Berufsorientierung',  short: 'BO',  color: '#64748B' },
  { label: 'Sonstiges',           short: 'Sonst.', color: '#6E7E80' },
]

export default function TeacherSubjectsEditor({ initial }: { initial: TeacherSubject[] }) {
  const [selected, setSelected] = useState<TeacherSubject[]>(initial)
  const [saved, setSaved] = useState(false)
  const [, startTransition] = useTransition()

  function toggle(s: typeof SUBJECTS[0]) {
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
    startTransition(async () => {
      await saveTeacherSubjects(selected)
      setSaved(true)
    })
  }

  return (
    <div className="bg-[#FAF8F3] rounded-2xl p-5 border border-kh-border">
      <h2 className="text-[15px] font-extrabold text-kh-dark mb-1">Meine Fächer</h2>
      <p className="text-[12.5px] text-kh-muted mb-4">Fächer auswählen · Stern = Hauptfach (bestimmt Kartenfarbe)</p>

      <div className="flex flex-wrap gap-2 mb-4">
        {SUBJECTS.map(s => {
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

      <button
        onClick={save}
        disabled={selected.length === 0}
        className="px-5 py-2 rounded-full gradient-teal text-white text-[13px] font-bold hover:opacity-90 transition-opacity disabled:opacity-40"
      >
        {saved ? '✓ Gespeichert' : 'Speichern'}
      </button>
    </div>
  )
}
