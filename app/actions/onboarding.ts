'use server'

import { createClient } from '@/lib/supabase/server'
import { getAuth } from '@/lib/auth'

/**
 * Markiert den Willkommens-Screen als erledigt, egal ob das Passwort
 * geändert oder der Schritt übersprungen wurde. Der Screen ist eine
 * Empfehlung, keine Sperre: wer ihn wegklickt, kommt trotzdem in die App.
 *
 * Bewusst NICHT an die Passwortänderung gekoppelt. Sonst bekäme ein Kind,
 * das sein neues Passwort am nächsten Tag vergisst, den Screen erneut und
 * würde ein zweites Mal ändern.
 */
export async function willkommenAbschliessen() {
  const { user } = await getAuth()
  if (!user) return { ok: false as const }

  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({ onboarded_at: new Date().toISOString() })
    .eq('id', user.id)

  return { ok: !error }
}
