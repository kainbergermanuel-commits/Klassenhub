'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClass, adminCreateStudentsForClass } from '@/app/actions/adminManagement'

interface StudentResult {
  fullName: string
  username: string
  password: string
}

export default function NeueKlassePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<{ className: string; students: StudentResult[]; errors: string[] } | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const fd = new FormData(e.currentTarget)
      const { classId, className } = await createClass(fd)

      const namesRaw = (fd.get('students') as string) ?? ''
      const names = namesRaw.split('\n').map(n => n.trim()).filter(Boolean)

      if (names.length > 0) {
        const { results: students, errors } = await adminCreateStudentsForClass(classId, names)
        setResults({ className, students, errors })
      } else {
        router.push('/admin')
        router.refresh()
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  if (results) {
    return (
      <div className="max-w-lg">
        <div className="flex items-center gap-3 mb-5">
          <span className="msym text-[28px] text-kh-teal" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          <div>
            <div className="font-extrabold text-[17px] text-kh-dark">Klasse {results.className} angelegt</div>
            <div className="text-xs text-kh-muted font-medium">{results.students.length} Schüler:innen erstellt</div>
          </div>
        </div>

        {results.students.length > 0 && (
          <div className="kh-card-flat overflow-hidden mb-4">
            <div className="px-4 py-2.5 border-b border-kh-border grid grid-cols-3 gap-2">
              <span className="text-[10.5px] font-bold text-kh-muted uppercase tracking-wide">Name</span>
              <span className="text-[10.5px] font-bold text-kh-muted uppercase tracking-wide">Benutzername</span>
              <span className="text-[10.5px] font-bold text-kh-muted uppercase tracking-wide">Passwort</span>
            </div>
            {results.students.map(s => (
              <div key={s.username} className="px-4 py-2.5 border-b border-kh-border/50 last:border-0 grid grid-cols-3 gap-2 items-center">
                <span className="text-[13px] font-semibold text-kh-dark truncate">{s.fullName}</span>
                <span className="font-mono text-[12px] text-kh-dark">{s.username}</span>
                <span className="font-mono text-[12px] text-kh-dark">{s.password}</span>
              </div>
            ))}
          </div>
        )}

        {results.errors.length > 0 && (
          <div className="bg-kh-red-light text-kh-red text-sm font-semibold rounded-xl px-4 py-3 mb-4">
            <div className="font-bold mb-1">Fehler bei {results.errors.length} Einträgen:</div>
            {results.errors.map((e, i) => <div key={i} className="text-xs">{e}</div>)}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => { router.push('/admin'); router.refresh() }}
            className="flex-1 bg-kh-dark text-white font-bold rounded-xl py-3 text-sm hover:bg-kh-teal transition"
          >
            Zur Übersicht
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-kh-muted text-sm font-semibold mb-5 hover:text-kh-dark transition">
        <span className="msym text-[18px]">arrow_back</span>
        Zurück
      </button>
      <h1 className="text-[25px] font-extrabold text-kh-dark tracking-tight mb-1">Klasse anlegen</h1>
      <p className="text-sm text-kh-muted font-medium mb-6">Neue Klasse erstellen, optional gleich Schüler:innen anlegen.</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="text-xs font-bold text-kh-dark mb-1.5 block">Klassenname</label>
          <input
            name="name"
            type="text"
            required
            placeholder="z.B. 4a"
            className="w-full rounded-xl border border-kh-border px-4 py-3 text-base font-medium text-kh-dark placeholder:text-kh-muted focus:outline-none focus:ring-2 focus:ring-kh-teal/40 focus:border-kh-teal transition"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-kh-dark mb-1.5 block">
            Schüler:innen <span className="text-kh-muted font-medium normal-case">(optional · eine Zeile pro Name)</span>
          </label>
          <textarea
            name="students"
            rows={8}
            placeholder={"Anna Schneider\nFelix Wagner\nLena Hofer\n…"}
            className="w-full rounded-xl border border-kh-border px-4 py-3 text-base font-medium text-kh-dark placeholder:text-kh-muted focus:outline-none focus:ring-2 focus:ring-kh-teal/40 focus:border-kh-teal transition resize-none"
          />
          <p className="text-[11px] text-kh-muted font-medium mt-1 px-1">
            Benutzername und Passwort werden automatisch generiert. Avatar wird beim ersten Login gewählt.
          </p>
        </div>

        {error && (
          <div className="bg-kh-red-light text-kh-red text-sm font-semibold rounded-xl px-4 py-3">{error}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-kh-dark text-white font-bold rounded-xl py-3.5 text-sm flex items-center justify-center gap-2 hover:bg-kh-teal transition disabled:opacity-60"
        >
          {loading
            ? <><span className="msym animate-spin text-lg">progress_activity</span>Wird angelegt…</>
            : <><span className="msym text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>Klasse anlegen</>
          }
        </button>
      </form>
    </div>
  )
}
