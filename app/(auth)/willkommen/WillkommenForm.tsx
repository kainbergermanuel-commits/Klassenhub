'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { willkommenAbschliessen } from '@/app/actions/onboarding'
import type { Role } from '@/lib/types'

/**
 * Zwei Schritte: begrüßen, dann Passwort anbieten.
 *
 * Der Passwortwechsel ist eine Empfehlung, keine Pflicht. Ein erzwungener
 * Wechsel würde bei Zehnjährigen am ersten Tag verlässlich dazu führen, dass
 * ein Teil der Klasse am nächsten Morgen nicht mehr hineinkommt. Deshalb ist
 * "Später" bei den Kindern ein gleichwertiger Weg und nur bei den Eltern
 * der leisere von beiden.
 */
export default function WillkommenForm({
  vorname, nachname, role,
}: { vorname: string; nachname: string; role: Role }) {
  const [schritt, setSchritt] = useState<'hallo' | 'passwort'>('hallo')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const kind = role === 'student'
  const tooShort = password.length > 0 && password.length < 6
  const mismatch = confirm.length > 0 && confirm !== password
  const canSubmit = password.length >= 6 && password === confirm && !saving

  async function fertig() {
    await willkommenAbschliessen()
    window.location.href = '/'
  }

  async function speichern(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSaving(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setSaving(false)
      setError(error.message)
      return
    }
    await fertig()
  }

  async function spaeter() {
    setSaving(true)
    await fertig()
  }

  return (
    <div className="min-h-screen bg-kh-page flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
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

        <div className="bg-white rounded-3xl p-8 shadow-sm border border-kh-border">
          {schritt === 'hallo' ? (
            <>
              <div className="w-14 h-14 rounded-2xl bg-kh-teal-light text-kh-teal flex items-center justify-center mb-5">
                <span className="msym text-[30px]" style={{ fontVariationSettings: "'FILL' 1" }}>waving_hand</span>
              </div>

              <h1 className="text-2xl font-extrabold text-kh-dark mb-2 leading-tight">
                {kind ? `Hallo ${vorname}!` : `Willkommen, Familie ${nachname || vorname}!`}
              </h1>

              {kind ? (
                <div className="text-[15px] text-kh-muted font-medium leading-relaxed flex flex-col gap-3">
                  <p>
                    Schön, dass du da bist. Das hier ist <strong className="text-kh-dark">KlassenHub</strong>,
                    unsere Klasse im Netz.
                  </p>
                  <p>
                    Hier stehen deine Hausübungen, dein Stundenplan und was in der Klasse ansteht.
                    Und dein Abenteuer wartet auch schon auf dich.
                  </p>
                </div>
              ) : (
                <div className="text-[15px] text-kh-muted font-medium leading-relaxed flex flex-col gap-3">
                  <p>
                    Schön, dass Sie da sind. <strong className="text-kh-dark">KlassenHub</strong> ist unsere
                    Klassen-App: Hier läuft zusammen, was Schule und Zuhause voneinander wissen müssen.
                  </p>
                  <p>
                    Hausübungen, Termine, Stundenplan, Erinnerungen und Nachrichten zwischen Ihnen
                    und mir. Ein kurzer Blick pro Tag genügt.
                  </p>
                </div>
              )}

              <button
                onClick={() => setSchritt('passwort')}
                className="w-full mt-7 py-3.5 rounded-full gradient-teal text-white text-sm font-bold hover:brightness-105 transition tap flex items-center justify-center gap-2"
              >
                Los geht&apos;s
                <span className="msym text-lg">arrow_forward</span>
              </button>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-2xl bg-kh-teal-light text-kh-teal flex items-center justify-center mb-5">
                <span className="msym text-[30px]" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
              </div>

              <h1 className="text-2xl font-extrabold text-kh-dark mb-2 leading-tight">
                {kind ? 'Willst du dein eigenes Passwort?' : 'Bitte vergeben Sie ein eigenes Passwort'}
              </h1>

              <p className="text-[15px] text-kh-muted font-medium leading-relaxed mb-6">
                {kind ? (
                  <>
                    Dein Passwort steht auf dem Zettel, den deine Eltern bekommen haben. Du kannst dir
                    hier ein eigenes ausdenken, das nur du kennst. Merk es dir gut!
                  </>
                ) : (
                  <>
                    Ihr Erstpasswort steht auf dem Brief, den Sie erhalten haben. Da dieser Zettel zu
                    Hause herumliegt, empfehle ich ein eigenes Passwort, das nur Sie kennen.
                  </>
                )}
              </p>

              <form onSubmit={speichern} className="flex flex-col gap-3">
                <div>
                  <label className="text-xs font-bold text-kh-muted uppercase tracking-wider block mb-1.5">
                    {kind ? 'Dein neues Passwort' : 'Neues Passwort'}
                  </label>
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
                  <label className="text-xs font-bold text-kh-muted uppercase tracking-wider block mb-1.5">
                    Noch einmal eingeben
                  </label>
                  <input
                    type={show ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className="w-full border border-kh-border rounded-xl px-4 py-3 text-sm font-medium text-kh-dark outline-none focus:border-kh-teal transition-colors"
                  />
                  {mismatch && (
                    <p className="text-[12px] font-semibold text-kh-red mt-1.5">
                      Die beiden Passwörter sind nicht gleich.
                    </p>
                  )}
                </div>

                <label className="flex items-center gap-2 text-[13px] font-semibold text-kh-muted cursor-pointer select-none">
                  <input type="checkbox" checked={show} onChange={e => setShow(e.target.checked)} className="accent-kh-teal w-4 h-4" />
                  Passwort anzeigen
                </label>

                {error && (
                  <div className="text-sm font-semibold text-kh-red bg-kh-red-light px-3.5 py-2.5 rounded-xl">{error}</div>
                )}

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="w-full mt-2 py-3.5 rounded-full gradient-teal text-white text-sm font-bold hover:brightness-105 transition tap disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {saving ? 'Speichern…' : 'Passwort speichern und starten'}
                </button>

                <button
                  type="button"
                  onClick={spaeter}
                  disabled={saving}
                  className="w-full py-2.5 text-[13px] font-bold text-kh-muted hover:text-kh-dark transition disabled:opacity-40"
                >
                  {kind ? 'Passwort behalten und loslegen' : 'Später ändern'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-kh-muted mt-6 font-medium">
          {kind
            ? 'Wenn du dein Passwort vergisst, sag es einfach Herrn Kainberger.'
            : 'Das Passwort lässt sich jederzeit unter Einstellungen ändern.'}
        </p>
      </div>
    </div>
  )
}
