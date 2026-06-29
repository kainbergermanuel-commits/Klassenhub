'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

interface Student {
  id: string
  full_name: string
}

interface Props {
  currentPreview: string | null
  previewName: string | null
  previewStudentId: string | null
  previewParentId: string | null
  students: Student[]
  parents: Student[]
}

const ROLES = [
  { key: 'teacher', label: 'Lehrperson', icon: 'school' },
  { key: 'student', label: 'Schüler', icon: 'face' },
  { key: 'parent', label: 'Elternteil', icon: 'family_restroom' },
] as const

export default function RolePreviewBar({ currentPreview, previewName, previewStudentId, previewParentId, students, parents }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [active, setActive] = useState(currentPreview ?? 'teacher')
  const [showDropup, setShowDropup] = useState<'student' | 'parent' | null>(null)
  const [localName, setLocalName] = useState<string | null>(previewName)
  const studentDropupRef = useRef<HTMLDivElement>(null)
  const parentDropupRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const inStudent = studentDropupRef.current?.contains(e.target as Node)
      const inParent = parentDropupRef.current?.contains(e.target as Node)
      if (!inStudent && !inParent) setShowDropup(null)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function switchTo(role: string, personId?: string) {
    // Namen sofort lokal setzen, damit kein falscher Name vor dem Reload aufblitzt
    if (role === 'student') {
      const s = personId ? students.find(s => s.id === personId) : students[0]
      setLocalName(s?.full_name.split(' ')[0] ?? null)
    } else if (role === 'parent') {
      const p = personId ? parents.find(p => p.id === personId) : parents[0]
      setLocalName(p ? p.full_name.split(' ').slice(1).join(' ') || p.full_name : null)
    } else {
      setLocalName(null)
    }
    setActive(role)
    setShowDropup(null)
    await fetch('/api/preview-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: role === 'teacher' ? null : role, personId }),
    })
    window.location.href = pathname
  }

  const activeStudentId = previewStudentId ?? students[0]?.id
  const activeStudentName = active === 'student' ? (localName ?? students[0]?.full_name.split(' ')[0]) : undefined
  const activeParentId = previewParentId ?? parents[0]?.id
  const activeParentName = active === 'parent'
    ? (localName ?? (parents[0] ? parents[0].full_name.split(' ').slice(1).join(' ') || parents[0].full_name : undefined))
    : undefined

  return (
    <div className="fixed bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-1 bg-kh-dark/90 backdrop-blur-sm text-white rounded-full px-2 py-1.5 shadow-xl">
        <span className="msym text-[15px] text-[#9FC4C0] ml-1.5 mr-0.5">preview</span>
        <span className="hidden md:inline text-[11px] font-semibold text-[#9FC4C0] mr-1">Vorschau</span>

        {/* Lehrer */}
        <button
          onClick={() => switchTo('teacher')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold transition-all duration-200 ${
            active === 'teacher' ? 'bg-kh-teal text-white' : 'text-[#9FC4C0] hover:text-white hover:bg-white/10'
          }`}
        >
          <span className="msym text-[15px]" style={{ fontVariationSettings: `'FILL' ${active === 'teacher' ? 1 : 0}` }}>school</span>
          <span className="hidden md:inline">Lehrperson</span>
        </button>

        {/* Schüler + Dropup */}
        <div className="relative" ref={studentDropupRef}>
          <button
            onClick={() => {
              if (active !== 'student') {
                switchTo('student', activeStudentId)
              } else {
                setShowDropup(v => v === 'student' ? null : 'student')
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold transition-all duration-200 ${
              active === 'student' ? 'bg-kh-teal text-white' : 'text-[#9FC4C0] hover:text-white hover:bg-white/10'
            }`}
          >
            <span className="msym text-[15px]" style={{ fontVariationSettings: `'FILL' ${active === 'student' ? 1 : 0}` }}>face</span>
            <span className="hidden md:inline">{active === 'student' ? (activeStudentName ?? 'Schüler') : 'Schüler'}</span>
            <span className="md:hidden">{active === 'student' ? (activeStudentName ?? '') : ''}</span>
            {active === 'student' && (
              <span className="msym text-[13px]">{showDropup === 'student' ? 'expand_more' : 'expand_less'}</span>
            )}
          </button>

          {showDropup === 'student' && active === 'student' && (
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-kh-dark/95 backdrop-blur-sm rounded-2xl py-1.5 shadow-xl min-w-[150px] max-h-[260px] overflow-y-auto">
              {students.map(s => {
                const firstName = s.full_name.split(' ')[0]
                const isSelected = s.id === activeStudentId
                return (
                  <button
                    key={s.id}
                    onClick={() => switchTo('student', s.id)}
                    className={`w-full text-left px-4 py-2 text-[12px] font-semibold transition-colors flex items-center gap-2 ${
                      isSelected ? 'text-white bg-white/10' : 'text-[#9FC4C0] hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {isSelected && <span className="msym text-[13px] text-kh-teal-light">check</span>}
                    {!isSelected && <span className="w-[13px]" />}
                    {firstName}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Elternteil + Dropup */}
        <div className="relative" ref={parentDropupRef}>
          <button
            onClick={() => {
              if (active !== 'parent') {
                switchTo('parent', activeParentId)
              } else {
                setShowDropup(v => v === 'parent' ? null : 'parent')
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold transition-all duration-200 ${
              active === 'parent' ? 'bg-kh-teal text-white' : 'text-[#9FC4C0] hover:text-white hover:bg-white/10'
            }`}
          >
            <span className="msym text-[15px]" style={{ fontVariationSettings: `'FILL' ${active === 'parent' ? 1 : 0}` }}>family_restroom</span>
            <span className="hidden md:inline">{active === 'parent' ? (activeParentName ?? 'Elternteil') : 'Elternteil'}</span>
            <span className="md:hidden">{active === 'parent' ? (activeParentName ?? '') : ''}</span>
            {active === 'parent' && (
              <span className="msym text-[13px]">{showDropup === 'parent' ? 'expand_more' : 'expand_less'}</span>
            )}
          </button>

          {showDropup === 'parent' && active === 'parent' && (
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-kh-dark/95 backdrop-blur-sm rounded-2xl py-1.5 shadow-xl min-w-[150px] max-h-[260px] overflow-y-auto">
              {parents.map(p => {
                const firstName = p.full_name.split(' ').slice(1).join(' ') || p.full_name
                const isSelected = p.id === activeParentId
                return (
                  <button
                    key={p.id}
                    onClick={() => switchTo('parent', p.id)}
                    className={`w-full text-left px-4 py-2 text-[12px] font-semibold transition-colors flex items-center gap-2 ${
                      isSelected ? 'text-white bg-white/10' : 'text-[#9FC4C0] hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {isSelected && <span className="msym text-[13px] text-kh-teal-light">check</span>}
                    {!isSelected && <span className="w-[13px]" />}
                    {firstName}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
