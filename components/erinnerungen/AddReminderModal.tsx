'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { todayISO } from '@/lib/date'

interface Props {
  classId: string
  userId: string
  onClose: () => void
}

export default function AddReminderModal({ classId, userId, onClose }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    if (!title.trim() || !date || saving) return
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const { error: dbError } = await supabase.from('reminders').insert({
      class_id: classId,
      title: title.trim(),
      description: description.trim() || null,
      event_date: date,
      created_by: userId,
    })
    if (dbError) { setError('Fehler beim Speichern. Bitte erneut versuchen.'); setSaving(false); return }
    router.refresh()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-extrabold text-kh-dark">Neue Erinnerung</h2>
          <button onClick={onClose} className="msym text-2xl text-kh-muted hover:text-kh-dark transition-colors">close</button>
        </div>

        <div className="flex flex-col gap-3">
          <input
            autoFocus
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && save()}
            placeholder="Titel *"
            className="w-full border border-kh-border rounded-xl px-4 py-3 text-sm font-medium text-kh-dark placeholder:text-[#B0BCBA] outline-none focus:border-kh-teal transition-colors"
          />
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Beschreibung (optional)"
            className="w-full border border-kh-border rounded-xl px-4 py-3 text-sm font-medium text-kh-dark placeholder:text-[#B0BCBA] outline-none focus:border-kh-teal transition-colors"
          />
          <div>
            <label className="text-xs font-bold text-kh-muted uppercase tracking-wider block mb-1.5">Datum *</label>
            <input
              type="date"
              value={date}
              min={todayISO()}
              onChange={e => setDate(e.target.value)}
              className="w-full border border-kh-border rounded-xl px-4 py-3 text-sm font-medium text-kh-dark outline-none focus:border-kh-teal transition-colors"
            />
          </div>
        </div>

        {error && (
          <div className="mt-4 text-sm font-semibold text-kh-red bg-kh-red-light px-3.5 py-2.5 rounded-xl">{error}</div>
        )}

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-3 rounded-full border border-kh-border text-sm font-bold text-kh-muted hover:bg-[#F6F3ED] transition-colors">
            Abbrechen
          </button>
          <button
            onClick={save}
            disabled={!title.trim() || !date || saving}
            className="flex-1 py-3 rounded-full gradient-teal text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {saving ? 'Speichern…' : 'Posten'}
          </button>
        </div>
      </div>
    </div>
  )
}
