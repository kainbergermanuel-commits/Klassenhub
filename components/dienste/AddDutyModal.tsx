'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Profile } from '@/lib/types'
import Avatar from '@/components/ui/Avatar'

interface EditDuty {
  id: string
  duty_name: string
  assignee_ids: string[]
}

interface Props {
  classId: string
  userId: string
  weekStart: string
  students: Profile[]
  assignedStudentIds?: string[]
  onClose: () => void
  editDuty?: EditDuty
}

const DUTY_OPTIONS = [
  { name: 'Tafel wischen', icon: 'water_drop' },
  { name: 'Boden säubern', icon: 'cleaning_services' },
  { name: 'Lüften', icon: 'air' },
  { name: 'Blumen gießen', icon: 'local_florist' },
  { name: 'Ordner austeilen', icon: 'folder_open' },
  { name: 'Müll entleeren', icon: 'delete' },
  { name: 'Benutzerdefiniert', icon: 'edit' },
]

export default function AddDutyModal({ classId, userId, weekStart, students, assignedStudentIds = [], onClose, editDuty }: Props) {
  const router = useRouter()
  const isEdit = !!editDuty
  const initialDutyName = editDuty
    ? (DUTY_OPTIONS.some(o => o.name === editDuty.duty_name) ? editDuty.duty_name : 'Benutzerdefiniert')
    : DUTY_OPTIONS[0].name
  const [dutyName, setDutyName] = useState(initialDutyName)
  const [customName, setCustomName] = useState(
    editDuty && !DUTY_OPTIONS.some(o => o.name === editDuty.duty_name) ? editDuty.duty_name : ''
  )
  const [selected, setSelected] = useState<string[]>(editDuty?.assignee_ids ?? [])
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
    let dbError
    if (isEdit && editDuty) {
      ;({ error: dbError } = await supabase.from('duties').update({
        duty_name: finalName,
        assignee_ids: selected,
      }).eq('id', editDuty.id))
    } else {
      ;({ error: dbError } = await supabase.from('duties').upsert({
        class_id: classId,
        week_start: weekStart,
        duty_name: finalName,
        assignee_ids: selected,
        created_by: userId,
      }, { onConflict: 'class_id,week_start,duty_name' }))
    }
    if (dbError) { setError('Fehler beim Speichern. Bitte erneut versuchen.'); setSaving(false); return }
    router.refresh()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-extrabold text-kh-dark">{isEdit ? 'Dienst bearbeiten' : 'Dienst zuweisen'}</h2>
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
          <div className="grid grid-cols-5 gap-2">
            {students.map(s => {
              const isSelected = selected.includes(s.id)
              const firstName = s.full_name.split(' ')[0]
              const ownIds = editDuty?.assignee_ids ?? []
              const isDisabled = assignedStudentIds.includes(s.id) && !ownIds.includes(s.id)
              return (
                <button
                  key={s.id}
                  onClick={() => !isDisabled && toggleStudent(s.id)}
                  disabled={isDisabled}
                  className="flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-xl border transition-all duration-150"
                  style={isDisabled
                    ? { borderColor: '#E4DDCF', background: '#F6F3ED', opacity: 0.45, cursor: 'not-allowed' }
                    : isSelected
                      ? { borderColor: '#0F8A82', background: '#E0F0EE' }
                      : { borderColor: '#E4DDCF', background: 'white' }
                  }
                >
                  <div className="relative">
                    <Avatar name={s.full_name} color={s.avatar_color} seed={s.avatar_seed} hairColor={s.avatar_hair_color} skinColor={s.avatar_skin_color} size={30} />
                    {isSelected && (
                      <span
                        className="absolute -bottom-0.5 -right-0.5 msym text-[14px] text-kh-teal"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        check_circle
                      </span>
                    )}
                  </div>
                  <span className="text-[11.5px] font-semibold text-kh-dark leading-tight">{firstName}</span>
                </button>
              )
            })}
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
            {saving ? 'Speichern…' : isEdit ? 'Speichern' : 'Zuweisen'}
          </button>
        </div>
      </div>
    </div>
  )
}
