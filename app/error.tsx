'use client'

import { useEffect } from 'react'

/**
 * Auffangnetz für Fehler beim Server-Rendern (u. a. AuthUnavailableError aus
 * lib/auth.ts).
 *
 * Zweck: Eine Störung darf nicht wie ein Abmelden aussehen. Vorher landete
 * jeder Aussetzer der Auth-Abfrage über redirect('/login') auf der
 * Anmeldemaske — ohne Hinweis, obwohl die Session im Cookie gültig blieb.
 * Hier steht stattdessen, was los ist, und ein Knopf lädt es neu.
 */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-[100dvh] bg-kh-page flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-sm border border-kh-border text-center">
        <div className="w-12 h-12 rounded-2xl bg-kh-amber-light flex items-center justify-center mx-auto mb-4">
          <span className="msym text-kh-amber text-2xl">cloud_off</span>
        </div>
        <h1 className="text-lg font-extrabold text-kh-dark mb-1">Das hat gerade nicht geklappt</h1>
        <p className="text-sm text-kh-muted font-medium mb-6">
          Die Seite konnte gerade nicht geladen werden. Deine Anmeldung ist davon nicht betroffen.
        </p>
        <button
          onClick={reset}
          className="tap w-full rounded-2xl bg-kh-teal text-white font-bold py-3 text-sm"
        >
          Nochmal versuchen
        </button>
      </div>
    </div>
  )
}
