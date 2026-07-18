'use client'

import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export interface ConfirmOptions {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  /** 'danger' färbt den Bestätigen-Button rot (Löschen/Überschreiben). */
  tone?: 'default' | 'danger'
  icon?: string
}

/** Gestyltes Bestätigungs-Modal statt des nackten `window.confirm` — hält die
 *  Designsprache der App auch im Bestätigungs-Moment durch. Bewusst als Hook
 *  (kein globaler Provider): `confirm(opts)` gibt ein Promise<boolean> zurück,
 *  `dialog` wird von der Komponente einmal gerendert. Per createPortal an
 *  document.body (fixed-Overlay unter transform-animierten Vorfahren, siehe
 *  AnimateIn/RiddleCard). */
export function useConfirm() {
  const [state, setState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const confirm = useCallback(
    (opts: ConfirmOptions) => new Promise<boolean>(resolve => setState({ ...opts, resolve })),
    []
  )

  const close = useCallback((value: boolean) => {
    setState(prev => { prev?.resolve(value); return null })
  }, [])

  useEffect(() => {
    if (!state) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close(false)
      if (e.key === 'Enter') close(true)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [state, close])

  const danger = state?.tone === 'danger'

  const dialog = mounted && state
    ? createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4"
          onClick={() => close(false)}
        >
          <div
            className="w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <span
                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${danger ? 'bg-kh-red/12' : 'bg-kh-teal/12'}`}
              >
                <span
                  className={`msym text-[21px] ${danger ? 'text-kh-red' : 'text-kh-teal'}`}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {state.icon ?? (danger ? 'warning' : 'help')}
                </span>
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="font-extrabold text-[15.5px] text-kh-dark leading-snug">{state.title}</h3>
                {state.message && <p className="text-[13px] text-kh-muted mt-1.5 leading-relaxed">{state.message}</p>}
              </div>
            </div>

            <div className="flex gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => close(false)}
                className="flex-1 rounded-full border border-kh-border/70 bg-white px-4 py-2.5 text-[13px] font-bold text-kh-dark hover:bg-kh-page transition-colors"
              >
                {state.cancelLabel ?? 'Abbrechen'}
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => close(true)}
                className={`flex-1 rounded-full px-4 py-2.5 text-[13px] font-bold text-white transition-opacity hover:opacity-90 ${danger ? 'bg-kh-red' : 'gradient-teal'}`}
              >
                {state.confirmLabel ?? 'Bestätigen'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )
    : null

  return { confirm, dialog }
}
