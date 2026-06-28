'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createTeacher } from '@/app/actions/adminManagement'

interface Props {
  classes: { id: string; name: string; school: string }[]
}

export default function NeueLehrkraftForm({ classes }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ username: string; password: string; fullName: string } | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await createTeacher(new FormData(e.currentTarget))
      setResult(res)
    } catch (err) {
      setError((err as Error).message)
    }
    setLoading(false)
  }

  if (result) {
    return (
      <div className="max-w-md">
        <div className="bg-white rounded-2xl px-6 py-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <span className="msym text-[28px] text-kh-teal" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            <div>
              <div className="font-extrabold text-[17px] text-kh-dark">{result.fullName}</div>
              <div className="text-xs text-kh-muted font-medium">Lehrperson wurde angelegt</div>
            </div>
          </div>
          <div className="bg-kh-page rounded-xl px-4 py-3.5 flex flex-col gap-2 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-kh-muted">Benutzername</span>
              <span className="font-mono text-sm font-bold text-kh-dark">{result.username}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-kh-muted">Passwort</span>
              <span className="font-mono text-sm font-bold text-kh-dark">{result.password}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setResult(null); setError(null) }}
              className="flex-1 border border-kh-border text-kh-dark font-bold rounded-xl py-2.5 text-sm hover:bg-kh-page transition"
            >
              Weitere anlegen
            </button>
            <button
              onClick={() => { router.push('/admin'); router.refresh() }}
              className="flex-1 bg-kh-dark text-white font-bold rounded-xl py-2.5 text-sm hover:bg-kh-teal transition"
            >
              Zurück
            </button>
          </div>
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
      <h1 className="text-[25px] font-extrabold text-kh-dark tracking-tight mb-1">Lehrperson anlegen</h1>
      <p className="text-sm text-kh-muted font-medium mb-6">Neuen Lehrpersonen-Account erstellen.</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="text-xs font-bold text-kh-dark mb-1.5 block">Vor- und Nachname</label>
          <input
            name="full_name"
            type="text"
            required
            placeholder="z.B. Maria Mustermann"
            className="w-full rounded-xl border border-kh-border px-4 py-3 text-sm font-medium text-kh-dark placeholder:text-kh-muted focus:outline-none focus:ring-2 focus:ring-kh-teal/40 focus:border-kh-teal transition"
          />
        </div>

        {classes.length > 0 && (
          <div>
            <label className="text-xs font-bold text-kh-dark mb-1.5 block">Klassen zuweisen (optional, mehrere möglich)</label>
            <div className="flex flex-col gap-2">
              {classes.map(c => (
                <label key={c.id} className="flex items-center gap-3 bg-white border border-kh-border rounded-xl px-4 py-3 cursor-pointer hover:border-kh-teal transition">
                  <input
                    type="checkbox"
                    name="class_ids"
                    value={c.id}
                    className="w-4 h-4 accent-kh-teal"
                  />
                  <span className="text-sm font-medium text-kh-dark">{c.name} <span className="text-kh-muted">– {c.school}</span></span>
                </label>
              ))}
            </div>
            <p className="text-[11px] text-kh-muted font-medium mt-1.5 px-1">Die erste ausgewählte Klasse wird als Primärklasse gesetzt.</p>
          </div>
        )}

        {error && (
          <div className="bg-kh-red-light text-kh-red text-sm font-semibold rounded-xl px-4 py-3">{error}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-kh-dark text-white font-bold rounded-xl py-3.5 text-sm flex items-center justify-center gap-2 hover:bg-kh-teal transition disabled:opacity-60"
        >
          {loading
            ? <span className="msym animate-spin text-lg">progress_activity</span>
            : <><span className="msym text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>Lehrperson anlegen</>
          }
        </button>
      </form>
    </div>
  )
}
