'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ChangePasswordForm() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const tooShort = password.length > 0 && password.length < 6
  const mismatch = confirm.length > 0 && confirm !== password
  const canSubmit = password.length >= 6 && password === confirm && !saving

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSaving(true)
    setError(null)
    setSuccess(false)

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    setSaving(false)

    if (error) {
      setError(error.message)
      return
    }
    setSuccess(true)
    setPassword('')
    setConfirm('')
  }

  return (
    <form onSubmit={handleSubmit} className="kh-card p-6 max-w-md">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-11 h-11 rounded-[13px] bg-kh-teal-light text-kh-teal flex items-center justify-center flex-shrink-0">
          <span className="msym text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
        </div>
        <div>
          <h2 className="font-extrabold text-[16px] text-kh-dark">Passwort ändern</h2>
          <p className="text-[12.5px] text-kh-muted font-medium">Mindestens 6 Zeichen</p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <label className="text-xs font-bold text-kh-muted uppercase tracking-wider block mb-1.5">Neues Passwort</label>
          <input
            type={show ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="new-password"
            placeholder="••••••••"
            className="w-full border border-kh-border rounded-xl px-4 py-3 text-sm font-medium text-kh-dark outline-none focus:border-kh-teal transition-colors"
          />
          {tooShort && <p className="text-[12px] font-semibold text-kh-red mt-1.5">Mindestens 6 Zeichen.</p>}
        </div>

        <div>
          <label className="text-xs font-bold text-kh-muted uppercase tracking-wider block mb-1.5">Passwort bestätigen</label>
          <input
            type={show ? 'text' : 'password'}
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            autoComplete="new-password"
            placeholder="••••••••"
            className="w-full border border-kh-border rounded-xl px-4 py-3 text-sm font-medium text-kh-dark outline-none focus:border-kh-teal transition-colors"
          />
          {mismatch && <p className="text-[12px] font-semibold text-kh-red mt-1.5">Passwörter stimmen nicht überein.</p>}
        </div>

        <label className="flex items-center gap-2 text-[13px] font-semibold text-kh-muted cursor-pointer select-none">
          <input type="checkbox" checked={show} onChange={e => setShow(e.target.checked)} className="accent-kh-teal w-4 h-4" />
          Passwort anzeigen
        </label>
      </div>

      {error && (
        <div className="mt-4 text-sm font-semibold text-kh-red bg-kh-red-light px-3.5 py-2.5 rounded-xl">{error}</div>
      )}
      {success && (
        <div className="mt-4 text-sm font-semibold text-kh-green bg-kh-green-light px-3.5 py-2.5 rounded-xl flex items-center gap-2">
          <span className="msym text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          Passwort erfolgreich geändert.
        </div>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full mt-5 py-3 rounded-full gradient-teal text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {saving ? 'Speichern…' : 'Passwort speichern'}
      </button>
    </form>
  )
}
