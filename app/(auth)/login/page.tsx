'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const email = `${username}@klassenhub.local`
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Benutzername oder Passwort falsch.')
      setLoading(false)
      return
    }

    // Full page navigation so the server reads the new session cookie
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-kh-page flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-12 h-12 rounded-2xl bg-kh-dark flex items-center justify-center">
            <span className="msym text-kh-teal text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              school
            </span>
          </div>
          <div>
            <div className="text-xl font-extrabold text-kh-dark tracking-tight">KlassenHub</div>
            <div className="text-xs text-kh-muted font-medium">MS Hirtenberg</div>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-kh-border">
          <h1 className="text-xl font-extrabold text-kh-dark mb-1">Willkommen zurück</h1>
          <p className="text-sm text-kh-muted font-medium mb-6">Melde dich mit deinem Benutzernamen an.</p>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-bold text-kh-dark mb-1.5 block" htmlFor="username">
                Benutzername
              </label>
              <input
                id="username"
                type="text"
                required
                autoCapitalize="none"
                autoCorrect="off"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="vorname.nachname"
                className="w-full rounded-xl border border-kh-border px-4 py-3 text-sm font-medium text-kh-dark placeholder:text-kh-muted focus:outline-none focus:ring-2 focus:ring-kh-teal/40 focus:border-kh-teal transition"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-kh-dark mb-1.5 block" htmlFor="password">
                Passwort
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-kh-border px-4 py-3 text-sm font-medium text-kh-dark placeholder:text-kh-muted focus:outline-none focus:ring-2 focus:ring-kh-teal/40 focus:border-kh-teal transition"
              />
            </div>

            {error && (
              <div className="bg-kh-red-light text-kh-red text-sm font-semibold rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-kh-dark text-white font-bold rounded-xl py-3.5 text-sm flex items-center justify-center gap-2 hover:bg-kh-teal transition disabled:opacity-60"
            >
              {loading ? (
                <span className="msym animate-spin text-lg">progress_activity</span>
              ) : (
                <>
                  <span className="msym text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>login</span>
                  Anmelden
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-kh-muted mt-6 font-medium">
          Zugang wird von der Klassenlehrkraft eingerichtet.
        </p>
      </div>
    </div>
  )
}
