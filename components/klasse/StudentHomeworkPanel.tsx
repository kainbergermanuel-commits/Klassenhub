'use client'

import { useState, useEffect, useMemo } from 'react'
import Avatar from '@/components/ui/Avatar'
import SpecialRolePicker from './SpecialRolePicker'
import type { Homework, Profile } from '@/lib/types'

interface Props {
  students: Profile[]
  homework: Homework[]
  completionsByStudent: Record<string, string[]> // studentId → homeworkIds[]
}

function getWeekNumber(dateStr: string): number {
  const d = new Date(`${dateStr}T00:00:00`)
  const start = new Date(d.getFullYear(), 0, 1)
  return Math.ceil(((d.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7)
}

export default function StudentHomeworkPanel({ students, homework, completionsByStudent }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeSubject, setActiveSubject] = useState<string | null>(null)

  const selected = selectedId ? students.find(s => s.id === selectedId) ?? null : null
  const doneIds = new Set(selectedId ? (completionsByStudent[selectedId] ?? []) : [])

  // All subjects present in homework (stable order by first appearance, newest-first)
  const subjects = useMemo(() => {
    const seen = new Map<string, { label: string; short: string; color: string }>()
    const sorted = [...homework].sort((a, b) => b.due_date.localeCompare(a.due_date))
    for (const hw of sorted) {
      if (!seen.has(hw.subject)) seen.set(hw.subject, { label: hw.subject, short: hw.subject_short, color: hw.subject_color })
    }
    return Array.from(seen.values())
  }, [homework])

  // Reset filter when switching student
  useEffect(() => { setActiveSubject(null) }, [selectedId])

  // Group homework by KW, sorted newest first, with subject filter
  const grouped = useMemo(() => {
    if (!selectedId) return []
    const filtered = activeSubject ? homework.filter(h => h.subject === activeSubject) : homework
    const sorted = [...filtered].sort((a, b) => b.due_date.localeCompare(a.due_date))
    const map = new Map<string, { kw: number; year: number; items: Homework[] }>()
    for (const hw of sorted) {
      const kw = getWeekNumber(hw.due_date)
      const year = parseInt(hw.due_date.split('-')[0])
      const key = `${year}-${kw}`
      if (!map.has(key)) map.set(key, { kw, year, items: [] })
      map.get(key)!.items.push(hw)
    }
    return Array.from(map.values())
  }, [selectedId, homework, activeSubject])

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setSelectedId(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      {/* Student list with HÜ icon */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {students.map(s => (
          <div key={s.id} className="bg-white rounded-2xl px-4 py-3.5 shadow-sm flex items-center gap-3">
            <Avatar name={s.full_name} color={s.avatar_color} seed={s.avatar_seed} hairColor={s.avatar_hair_color} skinColor={s.avatar_skin_color} size={40} />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-[15px] text-kh-dark truncate">{s.full_name}</div>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className="text-xs text-kh-muted font-medium">{s.gender === 'f' ? 'Schülerin' : 'Schüler'}</span>
                <SpecialRolePicker studentId={s.id} currentRole={s.special_role ?? null} />
              </div>
            </div>
            <button
              onClick={() => setSelectedId(s.id)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-kh-muted hover:text-kh-teal hover:bg-[#EEF9F7] transition-colors"
              title="Hausübungen anzeigen"
            >
              <span className="msym text-[20px]" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>assignment</span>
            </button>
          </div>
        ))}
        {students.length === 0 && (
          <p className="text-sm text-kh-muted font-medium col-span-2">Noch keine Schüler:innen angelegt.</p>
        )}
      </div>

      {/* Backdrop */}
      {selectedId && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-40"
          onClick={() => setSelectedId(null)}
        />
      )}

      {/* Slide-in panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-[420px] bg-white z-50 shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          selectedId ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {selected && (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-kh-border/60">
              <Avatar name={selected.full_name} color={selected.avatar_color} seed={selected.avatar_seed} hairColor={selected.avatar_hair_color} skinColor={selected.avatar_skin_color} size={36} />
              <div className="flex-1 min-w-0">
                <div className="font-extrabold text-[16px] text-kh-dark truncate">{selected.full_name}</div>
                <div className="text-xs text-kh-muted font-medium">
                  {homework.length} Hausübungen · {doneIds.size} erledigt
                </div>
              </div>
              <button
                onClick={() => setSelectedId(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-kh-muted hover:text-kh-dark hover:bg-[#F2EFE8] transition-colors"
              >
                <span className="msym text-[20px]">close</span>
              </button>
            </div>

            {/* Subject filter */}
            {subjects.length > 1 && (
              <div className="flex gap-1.5 px-5 py-3 border-b border-kh-border/60 overflow-x-auto scrollbar-none flex-shrink-0">
                <button
                  onClick={() => setActiveSubject(null)}
                  className={`flex-shrink-0 px-3 py-1 rounded-full text-[11.5px] font-bold transition-colors ${
                    !activeSubject ? 'bg-kh-dark text-white' : 'bg-[#F2EFE8] text-kh-muted hover:text-kh-dark'
                  }`}
                >
                  Alle
                </button>
                {subjects.map(s => (
                  <button
                    key={s.label}
                    onClick={() => setActiveSubject(prev => prev === s.label ? null : s.label)}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full text-[11.5px] font-bold transition-colors ${
                      activeSubject === s.label ? 'text-white' : 'bg-[#F2EFE8] text-kh-muted hover:text-kh-dark'
                    }`}
                    style={activeSubject === s.label ? { background: s.color } : {}}
                  >
                    {s.short}
                  </button>
                ))}
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-6">
              {grouped.length === 0 ? (
                <div className="text-center text-kh-muted text-sm font-medium pt-12">Keine Hausübungen vorhanden.</div>
              ) : (
                grouped.map(({ kw, items }) => (
                  <div key={kw}>
                    <div className="text-[11px] font-bold text-[#9AA6A4] uppercase tracking-[.6px] mb-2.5">
                      KW {kw}
                    </div>
                    <div className="flex flex-col gap-2">
                      {items.map(hw => {
                        const done = doneIds.has(hw.id)
                        return (
                          <div
                            key={hw.id}
                            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${done ? 'bg-[#F2FAF8]' : 'bg-[#FAF8F3]'}`}
                          >
                            <div
                              className="w-9 h-9 rounded-[10px] flex items-center justify-center font-extrabold text-[12px] text-white flex-shrink-0"
                              style={{ background: `linear-gradient(135deg, ${hw.subject_color}ee 0%, ${hw.subject_color}99 100%)` }}
                            >
                              {hw.subject_short}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className={`font-semibold text-[14px] truncate ${done ? 'text-kh-muted line-through' : 'text-kh-dark'}`}>
                                {hw.title}
                              </div>
                              <div className="text-xs text-kh-muted font-medium mt-0.5">
                                Fällig: {new Date(`${hw.due_date}T00:00:00`).toLocaleDateString('de-AT', { weekday: 'short', day: 'numeric', month: 'short' })}
                              </div>
                            </div>
                            {done
                              ? <span className="msym text-kh-green text-xl flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                              : <span className="text-[11px] font-bold text-[#C95040] bg-[#FDECEA] px-2 py-1 rounded-full flex-shrink-0">Offen</span>
                            }
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}
