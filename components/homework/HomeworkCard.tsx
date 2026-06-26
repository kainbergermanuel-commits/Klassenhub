'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { todayISO, addDaysISO } from '@/lib/date'
import type { HomeworkWithStatus, Role } from '@/lib/types'

interface Props {
  hw: HomeworkWithStatus
  role: Role
  userId: string
}

const TODAY = todayISO()
const TOMORROW = addDaysISO(1)

function getStatus(hw: HomeworkWithStatus, done: boolean, role: Role) {
  if (done) return {
    pillLabel: 'Erledigt', pillIcon: 'check_circle', pillColor: '#2E9C6E', pillBg: '#DDF0E7',
    metaColor: '#2E9C6E', cardBg: '#fff', cardBorder: 'none', canToggle: hw.due_date >= TOMORROW,
  }
  if (hw.due_date <= TODAY) {
    if (role === 'teacher') return {
      pillLabel: 'Abgeschlossen', pillIcon: 'event_available', pillColor: '#6E7E80', pillBg: '#ECE6D9',
      metaColor: '#6E7E80', cardBg: '#fff', cardBorder: 'none', canToggle: false,
    }
    return {
      pillLabel: 'Versäumt', pillIcon: 'error', pillColor: '#C95040', pillBg: '#FDECEA',
      metaColor: '#C0473A', cardBg: '#FEF5F3', cardBorder: '1px solid #F5D5D0', canToggle: false,
    }
  }
  if (hw.due_date === TOMORROW) return {
    pillLabel: 'Morgen', pillIcon: 'schedule', pillColor: '#C98A2B', pillBg: '#F8ECD6',
    metaColor: '#C98A2B', cardBg: '#fff', cardBorder: 'none', canToggle: true,
  }
  return {
    pillLabel: 'Offen', pillIcon: 'event', pillColor: '#6E7E80', pillBg: '#ECE6D9',
    metaColor: '#6E7E80', cardBg: '#fff', cardBorder: 'none', canToggle: true,
  }
}

export default function HomeworkCard({ hw, role, userId }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [optimisticDone, setOptimisticDone] = useState(hw.done)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(hw.title)
  const [editDate, setEditDate] = useState(hw.due_date)
  const [saving, setSaving] = useState(false)
  const [deleted, setDeleted] = useState(false)

  const status = getStatus(hw, optimisticDone, role)

  if (deleted) return null

  async function toggleDone() {
    if (role !== 'student' || !status.canToggle) return
    const next = !optimisticDone
    setOptimisticDone(next)
    const supabase = createClient()
    if (next) {
      await supabase.from('homework_completions').upsert({ homework_id: hw.id, student_id: userId })
    } else {
      await supabase.from('homework_completions').delete().match({ homework_id: hw.id, student_id: userId })
    }
    startTransition(() => router.refresh())
  }

  async function deleteHw() {
    if (!confirm(`"${hw.title}" wirklich löschen?`)) return
    setDeleted(true)
    const supabase = createClient()
    await supabase.from('homework').delete().eq('id', hw.id)
    startTransition(() => router.refresh())
  }

  async function saveEdit() {
    if (!editTitle.trim() || !editDate) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('homework').update({ title: editTitle.trim(), due_date: editDate }).eq('id', hw.id)
    setSaving(false)
    setEditing(false)
    startTransition(() => router.refresh())
  }

  const dateLabel = `Fällig am: ${new Date(hw.due_date).toLocaleDateString('de-AT', { weekday: 'short', day: 'numeric', month: 'short' })}`

  return (
    <>
      <div
        className="rounded-2xl p-4 flex gap-3 items-start shadow-[0_2px_10px_rgba(20,50,55,.04)]"
        style={{ background: status.cardBg, border: status.cardBorder }}
      >
        {/* Subject badge */}
        <div
          className="w-[46px] h-[46px] rounded-[13px] flex items-center justify-center font-extrabold text-[15px] flex-shrink-0 text-white"
          style={{ background: `linear-gradient(135deg, ${hw.subject_color}ee 0%, ${hw.subject_color}99 100%)` }}
        >
          {hw.subject_short}
        </div>

        <div className="flex-1 min-w-0">
          <span
            className="inline-flex items-center gap-1 text-[10.5px] font-extrabold px-2.5 py-1 rounded-[7px] uppercase tracking-[.3px]"
            style={{ color: status.pillColor, background: status.pillBg }}
          >
            <span className="msym text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>{status.pillIcon}</span>
            {status.pillLabel}
          </span>

          <div
            className="font-bold text-[15.5px] mt-2"
            style={{ color: optimisticDone ? '#7C8A89' : '#15363F', textDecoration: optimisticDone ? 'line-through' : 'none' }}
          >
            {hw.title}
          </div>
          <div className="flex items-center gap-1 text-[12.5px] font-semibold mt-0.5" style={{ color: status.metaColor }}>
            <span className="msym text-[13px]" style={{ fontVariationSettings: "'FILL' 0" }}>event</span>
            {dateLabel} · {hw.subject}
          </div>

          {hw.attachment_name && (
            <span className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold text-[#46565A] bg-[#F6F3ED] border border-[#EEDED9] px-2.5 py-1 rounded-lg">
              <span className="msym text-[15px] text-[#8A9896]">attach_file</span>
              {hw.attachment_name}
            </span>
          )}
        </div>

        {/* Student: toggle */}
        {role === 'student' && (
          <button
            onClick={toggleDone}
            disabled={!status.canToggle && !optimisticDone}
            className="flex-shrink-0 w-[30px] h-[30px] rounded-full flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={optimisticDone
              ? { background: '#2E9C6E' }
              : status.canToggle
                ? { border: '2.5px solid #CBD5D3' }
                : { border: '2.5px solid #F5D5D0' }
            }
          >
            {optimisticDone && (
              <span className="msym text-white text-[19px]" style={{ fontVariationSettings: "'FILL' 1, 'wght' 600" }}>check</span>
            )}
          </button>
        )}

        {/* Parent: status badge */}
        {role === 'parent' && (
          <span className="flex-shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ color: status.pillColor, background: status.pillBg }}>
            {status.pillLabel}
          </span>
        )}

        {/* Teacher: count + edit/delete */}
        {role === 'teacher' && (
          <div className="flex-shrink-0 text-right flex flex-col items-end gap-2">
            <span className="text-xs font-bold text-kh-teal">{hw.completion_count ?? 0} abgegeben</span>
            <div className="flex gap-1.5 text-[#B6C0BE]">
              <button onClick={() => setEditing(true)} className="msym text-[19px] hover:text-kh-teal transition-colors">edit</button>
              <button onClick={deleteHw} className="msym text-[19px] hover:text-kh-red transition-colors">delete</button>
            </div>
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => setEditing(false)}>
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-extrabold text-kh-dark">HÜ bearbeiten</h2>
              <button onClick={() => setEditing(false)} className="msym text-2xl text-kh-muted hover:text-kh-dark transition-colors">close</button>
            </div>
            <div className="flex flex-col gap-3">
              <input
                autoFocus
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                placeholder="Titel"
                className="w-full border border-kh-border rounded-xl px-4 py-3 text-sm font-medium text-kh-dark outline-none focus:border-kh-teal transition-colors"
              />
              <div>
                <label className="text-xs font-bold text-kh-muted uppercase tracking-wider block mb-1.5">Fällig am</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={e => setEditDate(e.target.value)}
                  className="w-full border border-kh-border rounded-xl px-4 py-3 text-sm font-medium text-kh-dark outline-none focus:border-kh-teal transition-colors"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setEditing(false)} className="flex-1 py-3 rounded-full border border-kh-border text-sm font-bold text-kh-muted hover:bg-[#F6F3ED] transition-colors">
                Abbrechen
              </button>
              <button
                onClick={saveEdit}
                disabled={!editTitle.trim() || !editDate || saving}
                className="flex-1 py-3 rounded-full gradient-teal text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {saving ? 'Speichern…' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
