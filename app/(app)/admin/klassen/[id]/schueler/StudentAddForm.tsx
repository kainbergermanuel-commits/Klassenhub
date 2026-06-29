'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminCreateStudentsForClass } from '@/app/actions/adminManagement'

interface Result { fullName: string; username: string; password: string }

export default function StudentAddForm({ classId }: { classId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Result[] | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [text, setText] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const names = text.split('\n').map(n => n.trim()).filter(Boolean)
    if (!names.length) return
    setLoading(true)
    try {
      const { results: r, errors: errs } = await adminCreateStudentsForClass(classId, names)
      setResults(r)
      setErrors(errs)
      setText('')
      router.refresh()
    } catch {}
    setLoading(false)
  }

  if (results) {
    return (
      <div>
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-3">
          <div className="px-4 py-2.5 border-b border-kh-border grid grid-cols-3 gap-2">
            <span className="text-[10.5px] font-bold text-kh-muted uppercase tracking-wide">Name</span>
            <span className="text-[10.5px] font-bold text-kh-muted uppercase tracking-wide">Benutzername</span>
            <span className="text-[10.5px] font-bold text-kh-muted uppercase tracking-wide">Passwort</span>
          </div>
          {results.map(s => (
            <div key={s.username} className="px-4 py-2.5 border-b border-kh-border/50 last:border-0 grid grid-cols-3 gap-2 items-center">
              <span className="text-[13px] font-semibold text-kh-dark truncate">{s.fullName}</span>
              <span className="font-mono text-[12px] text-kh-dark">{s.username}</span>
              <span className="font-mono text-[12px] text-kh-dark">{s.password}</span>
            </div>
          ))}
        </div>
        {errors.length > 0 && (
          <div className="bg-kh-red-light text-kh-red text-xs font-semibold rounded-xl px-4 py-3 mb-3">
            {errors.map((e, i) => <div key={i}>{e}</div>)}
          </div>
        )}
        <button onClick={() => setResults(null)} className="text-sm font-bold text-kh-teal hover:text-kh-dark transition">
          Weitere hinzufügen
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        rows={5}
        placeholder={"Anna Schneider\nFelix Wagner\n…"}
        className="w-full rounded-xl border border-kh-border px-4 py-3 text-base font-medium text-kh-dark placeholder:text-kh-muted focus:outline-none focus:ring-2 focus:ring-kh-teal/40 focus:border-kh-teal transition resize-none"
      />
      <button
        type="submit"
        disabled={loading || !text.trim()}
        className="w-full bg-kh-dark text-white font-bold rounded-xl py-3 text-sm flex items-center justify-center gap-2 hover:bg-kh-teal transition disabled:opacity-50"
      >
        {loading
          ? <><span className="msym animate-spin text-lg">progress_activity</span>Wird angelegt…</>
          : <><span className="msym text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>person_add</span>Schüler:innen anlegen</>
        }
      </button>
    </form>
  )
}
