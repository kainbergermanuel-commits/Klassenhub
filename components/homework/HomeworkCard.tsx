'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { todayISO, addDaysISO } from '@/lib/date'
import type { HomeworkWithStatus, Role } from '@/lib/types'
import Avatar from '@/components/ui/Avatar'

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
  const [showStudents, setShowStudents] = useState(false)
  const [students, setStudents] = useState<{ id: string; full_name: string; done: boolean; avatar_color: string; avatar_seed: string | null; avatar_hair_color: string | null; avatar_skin_color: string | null }[] | null>(null)

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

  async function openStudents() {
    setShowStudents(true)
    if (students !== null) return
    const supabase = createClient()
    const [{ data: allStudents }, { data: completions }] = await Promise.all([
      supabase.from('profiles').select('id, full_name, avatar_color, avatar_seed, avatar_hair_color, avatar_skin_color').eq('class_id', hw.class_id).eq('role', 'student').order('full_name'),
      supabase.from('homework_completions').select('student_id').eq('homework_id', hw.id),
    ])
    const doneIds = new Set((completions ?? []).map(c => c.student_id))
    setStudents((allStudents ?? []).map(s => ({ ...s, done: doneIds.has(s.id) })))
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
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-kh-teal">{hw.completion_count ?? 0} gemacht</span>
              <button onClick={openStudents} className="msym text-[17px] text-kh-teal/60 hover:text-kh-teal transition-colors leading-none">visibility</button>
            </div>
            <div className="flex gap-1.5 text-[#B6C0BE]">
              <button onClick={() => setEditing(true)} className="msym text-[19px] hover:text-kh-teal transition-colors">edit</button>
              <button onClick={deleteHw} className="msym text-[19px] hover:text-kh-red transition-colors">delete</button>
            </div>
          </div>
        )}
      </div>

      {/* Students popup */}
      {showStudents && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => setShowStudents(false)}>
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
              <button onClick={() => setShowStudents(false)} className="msym text-2xl text-kh-muted hover:text-kh-dark transition-colors">close</button>
            </div>
            {students === null ? (
              <div className="text-center py-8 text-kh-muted text-sm">Lädt…</div>
            ) : (
              <div className="flex flex-col gap-4">
                {/* Gemacht */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="msym text-[16px] text-kh-teal" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    <span className="text-[12px] font-extrabold text-kh-teal uppercase tracking-wide">Gemacht · {students.filter(s => s.done).length}</span>
                  </div>
                  {students.filter(s => s.done).length === 0
                    ? <p className="text-xs text-kh-muted pl-1">Noch niemand</p>
                    : <div className="flex flex-wrap gap-1.5">
                        {students.filter(s => s.done).map(s => (
                          <span key={s.id} className="flex items-center gap-1.5 text-[12px] font-semibold bg-[#DDF0E7] text-[#2E9C6E] pl-1 pr-2.5 py-0.5 rounded-full">
                            <Avatar name={s.full_name} color={s.avatar_color} seed={s.avatar_seed} hairColor={s.avatar_hair_color} skinColor={s.avatar_skin_color} size={20} />
                            {s.full_name.split(' ')[0]}
                          </span>
                        ))}
                      </div>
                  }
                </div>
                <div className="border-t border-kh-border/40" />
                {/* Nicht gemacht */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="msym text-[16px] text-kh-muted" style={{ fontVariationSettings: "'FILL' 0" }}>radio_button_unchecked</span>
                    <span className="text-[12px] font-extrabold text-kh-muted uppercase tracking-wide">Nicht gemacht · {students.filter(s => !s.done).length}</span>
                  </div>
                  {students.filter(s => !s.done).length === 0
                    ? <p className="text-xs text-kh-muted pl-1">Alle haben gemacht 🎉</p>
                    : <div className="flex flex-wrap gap-1.5">
                        {students.filter(s => !s.done).map(s => (
                          <span key={s.id} className="flex items-center gap-1.5 text-[12px] font-semibold bg-[#F6F3ED] text-kh-muted pl-1 pr-2.5 py-0.5 rounded-full">
                            <Avatar name={s.full_name} color={s.avatar_color} seed={s.avatar_seed} hairColor={s.avatar_hair_color} skinColor={s.avatar_skin_color} size={20} />
                            {s.full_name.split(' ')[0]}
                          </span>
                        ))}
                      </div>
                  }
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
