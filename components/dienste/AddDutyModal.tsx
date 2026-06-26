'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Profile } from '@/lib/types'

interface Props {
  classId: string
  userId: string
  weekStart: string
  students: Profile[]
  onClose: () => void
}

const DUTY_OPTIONS = [
  { name: 'Tafel wischen', icon: 'cleaning_services' },
  { name: 'Lüften', icon: 'air' },
  { name: 'Blumen gießen', icon: 'local_florist' },
  { name: 'Ordner austeilen', icon: 'folder_open' },
  { name: 'Müll entleeren', icon: 'delete' },
  { name: 'Benutzerdefiniert', icon: 'edit' },
]

export default function AddDutyModal({ classId, userId, weekStart, students, onClose }: Props) {
  const router = useRouter()
  const [dutyName, setDutyName] = useState(DUTY_OPTIONS[0].name)
  const [customName, setCustomName] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isCustom = dutyName === 'Benutzerdefiniert'
  const finalName = isCustom ? customName.trim() : dutyName

  function toggleStudent(id: string) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function save() {
    if (!finalName || selected.length === 0 || saving) return
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const { error: dbError } = await supabase.from('duties').upsert({
      class_id: classId,
      week_start: weekStart,
      duty_name: finalName,
      assignee_ids: selected,
      created_by: userId,
    }, { onConflict: 'class_id,week_start,duty_name' })
    if (dbError) { setError('Fehler beim Speichern. Bitte erneut versuchen.'); setSaving(false); return }
    router.refresh()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-extrabold text-kh-dark">Dienst zuweisen</h2>
          <button onClick={onClose} className="msym text-2xl text-kh-muted hover:text-kh-dark transition-colors">close</button>
        </div>

        {/* Duty picker */}
        <div className="mb-4">
          <label className="text-xs font-bold text-kh-muted uppercase tracking-wider block mb-2">Dienst</label>
          <div className="grid grid-cols-2 gap-2">
            {DUTY_OPTIONS.map(opt => (
              <button
                key={opt.name}
                onClick={() => setDutyName(opt.name)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all duration-150"
                style={dutyName === opt.name
                  ? { borderColor: '#0F8A82', background: '#E0F0EE', color: '#0F8A82' }
                  : { borderColor: '#E4DDCF', background: 'white', color: '#46565A' }
                }
              >
                <span className="msym text-[18px]">{opt.icon}</span>
                {opt.name}
              </button>
            ))}
          </div>
          {isCustom && (
            <input
              autoFocus
              value={customName}
              onChange={e => setCustomName(e.target.value)}
              placeholder="Dienstname eingeben…"
              className="mt-2 w-full border border-kh-border rounded-xl px-4 py-3 text-sm font-medium text-kh-dark placeholder:text-[#B0BCBA] outline-none focus:border-kh-teal transition-colors"
            />
          )}
        </div>

        {/* Student picker */}
        <div className="mb-5">
          <label className="text-xs font-bold text-kh-muted uppercase tracking-wider block mb-2">Schüler:innen</label>
          <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto">
            {students.map(s => (
              <button
                key={s.id}
                onClick={() => toggleStudent(s.id)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all duration-150 text-left"
                style={selected.includes(s.id)
                  ? { borderColor: '#0F8A82', background: '#E0F0EE' }
                  : { borderColor: '#E4DDCF', background: 'white' }
                }
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center font-extrabold text-xs text-white flex-shrink-0"
                  style={{ background: s.avatar_color }}
                >
                  {s.full_name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <span className="text-sm font-semibold text-kh-dark">{s.full_name}</span>
                {selected.includes(s.id) && (
                  <span className="msym text-kh-teal text-xl ml-auto" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-3 text-sm font-semibold text-kh-red bg-kh-red-light px-3.5 py-2.5 rounded-xl">{error}</div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-full border border-kh-border text-sm font-bold text-kh-muted hover:bg-[#F6F3ED] transition-colors">
            Abbrechen
          </button>
          <button
            onClick={save}
            disabled={!finalName || selected.length === 0 || saving}
            className="flex-1 py-3 rounded-full gradient-teal text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {saving ? 'Speichern…' : 'Zuweisen'}
          </button>
        </div>
      </div>
    </div>
  )
}
