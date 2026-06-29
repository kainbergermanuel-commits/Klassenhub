'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createParent } from '@/app/actions/userManagement'

interface Student {
  id: string
  full_name: string
}

export default function NeuesElternteilForm({ students }: { students: Student[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ username: string; password: string; fullName: string } | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await createParent(new FormData(e.currentTarget))
      setResult(res)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    return (
      <div className="max-w-md">
        <div className="mb-6">
          <h1 className="text-[25px] font-extrabold text-kh-dark tracking-tight">Elternteil angelegt</h1>
          <p className="text-sm text-kh-muted font-medium mt-1">Zugangsdaten einmalig notieren und weitergeben.</p>
        </div>
        <div className="bg-kh-teal-light border border-kh-teal/20 rounded-2xl p-6 mb-4">
          <div className="text-sm font-bold text-kh-dark mb-1">{result.fullName}</div>
          <div className="flex flex-col gap-3 mt-3">
            <div>
              <div className="text-xs text-kh-muted font-semibold mb-0.5">Benutzername</div>
              <div className="font-mono text-[15px] font-bold text-kh-dark bg-white rounded-xl px-4 py-2.5 border border-kh-border">{result.username}</div>
            </div>
            <div>
              <div className="text-xs text-kh-muted font-semibold mb-0.5">Passwort</div>
              <div className="font-mono text-[15px] font-bold text-kh-dark bg-white rounded-xl px-4 py-2.5 border border-kh-border">{result.password}</div>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setResult(null)} className="flex-1 bg-kh-dark text-white font-bold rounded-xl py-3 text-sm hover:bg-kh-teal transition">
            Weitere:n anlegen
          </button>
          <button onClick={() => router.push('/klasse')} className="flex-1 bg-white border border-kh-border text-kh-dark font-bold rounded-xl py-3 text-sm hover:bg-kh-page transition">
            Zur Klasse
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
      <h1 className="text-[25px] font-extrabold text-kh-dark tracking-tight mb-1">Elternteil anlegen</h1>
      <p className="text-sm text-kh-muted font-medium mb-6">Username und Passwort werden automatisch generiert.</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="text-xs font-bold text-kh-dark mb-1.5 block">Vollständiger Name</label>
          <input
            name="full_name"
            type="text"
            required
            placeholder="z.B. Fam. Hofer"
            className="w-full rounded-xl border border-kh-border px-4 py-3 text-base font-medium text-kh-dark placeholder:text-kh-muted focus:outline-none focus:ring-2 focus:ring-kh-teal/40 focus:border-kh-teal transition"
          />
        </div>

        {students.length > 0 && (
          <div>
            <label className="text-xs font-bold text-kh-dark mb-1.5 block">Kind (optional)</label>
            <select
              name="child_id"
              className="w-full rounded-xl border border-kh-border px-4 py-3 text-sm font-medium text-kh-dark focus:outline-none focus:ring-2 focus:ring-kh-teal/40 focus:border-kh-teal transition bg-white"
            >
              <option value="">— Kein Kind verknüpfen —</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.full_name}</option>
              ))}
            </select>
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
            : <><span className="msym text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>person_add</span>Anlegen</>
          }
        </button>
      </form>
    </div>
  )
}
