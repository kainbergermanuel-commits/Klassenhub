'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { setPreviewRole } from '@/app/actions/previewRole'

interface Student {
  id: string
  full_name: string
}

interface Props {
  currentPreview: string | null
  previewName: string | null
  previewStudentId: string | null
  students: Student[]
}

const ROLES = [
  { key: 'teacher', label: 'Lehrer', icon: 'school' },
  { key: 'student', label: 'Schüler', icon: 'face' },
  { key: 'parent', label: 'Elternteil', icon: 'family_restroom' },
] as const

export default function RolePreviewBar({ currentPreview, previewName, previewStudentId, students }: Props) {
  const [, startTransition] = useTransition()
  const [active, setActive] = useState(currentPreview ?? 'teacher')
  const [showDropup, setShowDropup] = useState(false)
  const dropupRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropupRef.current && !dropupRef.current.contains(e.target as Node)) {
        setShowDropup(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function switchTo(role: string, studentId?: string) {
    setActive(role)
    setShowDropup(false)
    startTransition(async () => {
      await setPreviewRole(role === 'teacher' ? null : role, studentId)
    })
  }

  const activeStudentId = previewStudentId ?? students[0]?.id
  const activeStudentName = previewName ?? students[0]?.full_name.split(' ')[0]

  return (
    <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-1 bg-kh-dark/90 backdrop-blur-sm text-white rounded-full px-2 py-1.5 shadow-xl">
        <span className="msym text-[15px] text-[#9FC4C0] ml-1.5 mr-0.5">preview</span>
        <span className="text-[11px] font-semibold text-[#9FC4C0] mr-1">Vorschau</span>

        {/* Lehrer */}
        <button
          onClick={() => switchTo('teacher')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold transition-all duration-200 ${
            active === 'teacher' ? 'bg-kh-teal text-white' : 'text-[#9FC4C0] hover:text-white hover:bg-white/10'
          }`}
        >
          <span className="msym text-[15px]" style={{ fontVariationSettings: `'FILL' ${active === 'teacher' ? 1 : 0}` }}>school</span>
          Lehrer
        </button>

        {/* Schüler + Dropup */}
        <div className="relative" ref={dropupRef}>
          <button
            onClick={() => {
              if (active !== 'student') {
                switchTo('student', activeStudentId)
              } else {
                setShowDropup(v => !v)
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold transition-all duration-200 ${
              active === 'student' ? 'bg-kh-teal text-white' : 'text-[#9FC4C0] hover:text-white hover:bg-white/10'
            }`}
          >
            <span className="msym text-[15px]" style={{ fontVariationSettings: `'FILL' ${active === 'student' ? 1 : 0}` }}>face</span>
            {active === 'student' ? (activeStudentName ?? 'Schüler') : 'Schüler'}
            {active === 'student' && (
              <span className="msym text-[13px]">{showDropup ? 'expand_more' : 'expand_less'}</span>
            )}
          </button>

          {showDropup && active === 'student' && (
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

        {/* Elternteil */}
        <button
          onClick={() => switchTo('parent')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold transition-all duration-200 ${
            active === 'parent' ? 'bg-kh-teal text-white' : 'text-[#9FC4C0] hover:text-white hover:bg-white/10'
          }`}
        >
          <span className="msym text-[15px]" style={{ fontVariationSettings: `'FILL' ${active === 'parent' ? 1 : 0}` }}>family_restroom</span>
          Elternteil
        </button>
      </div>
    </div>
  )
}
