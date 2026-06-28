'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { SpecialRole } from '@/lib/types'

const OPTIONS: { value: SpecialRole | null; label: string; icon: string; color: string }[] = [
  { value: null, label: 'Keine Rolle', icon: 'person', color: '#9AA6A4' },
  { value: 'klassensprecher', label: 'Klassensprecher:in', icon: 'star', color: '#C98A2B' },
  { value: 'stv_klassensprecher', label: 'Stv. Klassensprecher:in', icon: 'star_half', color: '#C98A2B' },
  { value: 'hw_admin', label: 'HÜ-Administrator:in', icon: 'assignment', color: '#0F8A82' },
]

export default function SpecialRolePicker({ studentId, currentRole }: { studentId: string; currentRole: SpecialRole | null }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const current = OPTIONS.find(o => o.value === currentRole) ?? OPTIONS[0]

  async function setRole(value: SpecialRole | null) {
    setSaving(true)
    setOpen(false)
    const supabase = createClient()
    await supabase.from('profiles').update({ special_role: value }).eq('id', studentId)
    setSaving(false)
    router.refresh()
  }

  return (
    <div className="relative">
      {open && (
        <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
      )}
      <button
        onClick={() => setOpen(v => !v)}
        disabled={saving}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-bold transition-colors ${
          currentRole ? 'text-white' : 'bg-[#F2EFE8] text-kh-muted hover:text-kh-dark'
        }`}
        style={currentRole ? { background: current.color } : {}}
        title="Spezialrolle vergeben"
      >
        <span className="msym text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>{current.icon}</span>
        {currentRole ? current.label : 'Rolle vergeben'}
      </button>

      {open && (
        <div className="absolute top-full mt-1.5 left-0 bg-white rounded-2xl shadow-xl border border-kh-border/60 py-1.5 z-20 min-w-[210px]" onClick={e => e.stopPropagation()}>
          {OPTIONS.map(opt => (
            <button
              key={String(opt.value)}
              onClick={() => setRole(opt.value)}
              className={`w-full text-left px-4 py-2.5 text-[12.5px] font-semibold flex items-center gap-2.5 hover:bg-[#F6F3ED] transition-colors ${
                opt.value === currentRole ? 'text-kh-dark' : 'text-kh-muted'
              }`}
            >
              <span className="msym text-[15px]" style={{ color: opt.color, fontVariationSettings: "'FILL' 1" }}>{opt.icon}</span>
              {opt.label}
              {opt.value === currentRole && <span className="msym text-[13px] text-kh-teal ml-auto">check</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
