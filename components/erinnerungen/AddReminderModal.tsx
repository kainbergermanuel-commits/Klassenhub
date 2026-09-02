'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { todayISO } from '@/lib/date'
import Avatar from '@/components/ui/Avatar'
import IconButton from '@/components/ui/IconButton'
import DatePicker from '@/components/ui/DatePicker'

interface Props {
  classId: string
  userId: string
  isPending?: boolean
  onClose: () => void
}

interface Student {
  id: string
  full_name: string
  avatar_color: string
  avatar_seed: string | null
  avatar_hair_color: string | null
  avatar_skin_color: string | null
}

function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10)
}
function tomorrowISO() { return addDays(todayISO(), 1) }

export default function AddReminderModal({ classId, userId, isPending = false, onClose }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(tomorrowISO())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showTargeting, setShowTargeting] = useState(false)
  const [students, setStudents] = useState<Student[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!showTargeting || students.length > 0) return
    createClient()
      .from('profiles')
      .select('id,full_name,avatar_color,avatar_seed,avatar_hair_color,avatar_skin_color')
      .eq('class_id', classId).eq('role', 'student').order('full_name')
      .then(({ data }) => setStudents(data ?? []))
  }, [showTargeting, classId, students.length])

  function toggleStudent(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const canPost = title.trim() && date && (!showTargeting || selectedIds.size > 0)

  async function save() {
    if (!canPost || saving) return
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const { error: dbError } = await supabase.from('reminders').insert({
      class_id: classId,
      title: title.trim(),
      description: description.trim() || null,
      event_date: date,
      created_by: userId,
      status: isPending ? 'pending' : 'published',
      target_student_ids: selectedIds.size > 0 ? [...selectedIds] : null,
    })
    if (dbError) { setError('Fehler beim Speichern. Bitte erneut versuchen.'); setSaving(false); return }
    router.refresh()
    onClose()
  }

  const modal = (
    <div className="modal-backdrop fixed inset-0 z-[200] flex items-start justify-center pt-[74px] px-4 pb-4 bg-black/40 overflow-y-auto" onClick={onClose}>
      <div className="modal-panel bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl my-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-extrabold text-kh-dark">Neue Erinnerung</h2>
            {isPending && <p className="text-xs text-kh-amber font-semibold mt-0.5">Wird zuerst von der Lehrperson bestätigt</p>}
          </div>
          <IconButton onClick={onClose} aria-label="Schließen" icon="close" size="sm" />
        </div>

        <div className="flex flex-col gap-3">
          <input
            autoFocus value={title} onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && save()}
            placeholder="Titel *"
            className="w-full border border-kh-border rounded-xl px-4 py-3 text-base font-medium text-kh-dark placeholder:text-[#B0BCBA] outline-none focus:border-kh-teal transition-colors"
          />
          <input
            value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Beschreibung (optional)"
            className="w-full border border-kh-border rounded-xl px-4 py-3 text-base font-medium text-kh-dark placeholder:text-[#B0BCBA] outline-none focus:border-kh-teal transition-colors"
          />
          <div>
            <label className="text-xs font-bold text-kh-muted uppercase tracking-wider block mb-1.5">Datum *</label>
            <DatePicker value={date} min={todayISO()} onChange={setDate} />
          </div>

          {!isPending && (
            <div>
              <button type="button" onClick={() => setShowTargeting(v => !v)}
                className="flex items-center gap-1.5 text-[12px] font-bold text-kh-muted hover:text-kh-dark transition-colors">
                <span className="msym text-[15px]">{showTargeting ? 'expand_less' : 'expand_more'}</span>
                {selectedIds.size > 0 ? `${selectedIds.size} Schüler:in ausgewählt` : 'An alle · Empfänger einschränken'}
              </button>

              {showTargeting && (
                <>
                  <div className="flex gap-1.5 mt-2 mb-1">
                    <button type="button" onClick={() => setSelectedIds(new Set(students.map(s => s.id)))}
                      className="text-[11px] font-bold px-3 py-1 rounded-full border border-kh-border hover:border-kh-teal hover:text-kh-teal text-kh-muted transition-colors">
                      Alle
                    </button>
                    <button type="button" onClick={() => setSelectedIds(new Set())}
                      className="text-[11px] font-bold px-3 py-1 rounded-full border border-kh-border hover:border-kh-teal hover:text-kh-teal text-kh-muted transition-colors">
                      Keinen
                    </button>
                  </div>
                  <div className="mt-1 grid grid-cols-4 gap-2">
                    {students.map(s => {
                      const selected = selectedIds.has(s.id)
                      const firstName = s.full_name.split(' ')[0]
                      const long = firstName.length > 7
                      return (
                        <button key={s.id} type="button" onClick={() => toggleStudent(s.id)}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border transition-all ${
                            selected ? 'border-kh-teal bg-kh-teal/10' : 'border-kh-border hover:border-kh-teal/50'
                          }`}>
                          <Avatar name={s.full_name} color={s.avatar_color} seed={s.avatar_seed}
                            hairColor={s.avatar_hair_color} skinColor={s.avatar_skin_color} size={22} />
                          <span className={`${long ? 'text-[10px]' : 'text-[12px]'} font-semibold leading-tight break-words min-w-0 ${selected ? 'text-kh-teal' : 'text-kh-dark'}`}>
                            {firstName}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {error && <div className="mt-4 text-sm font-semibold text-kh-red bg-kh-red-light px-3.5 py-2.5 rounded-xl">{error}</div>}

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-3 rounded-full border border-kh-border text-sm font-bold text-kh-muted hover:bg-[#F6F3ED] transition-colors">
            Abbrechen
          </button>
          <button onClick={save} disabled={!canPost || saving}
            className="flex-1 py-3 rounded-full gradient-teal text-white text-sm font-bold hover:brightness-105 transition-[filter,opacity] duration-150 tap disabled:opacity-40">
            {saving ? 'Speichern…' : isPending ? 'Zur Bestätigung senden' : 'Posten'}
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
