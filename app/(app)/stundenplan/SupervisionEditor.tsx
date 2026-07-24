'use client'

import { useState, useRef, useEffect } from 'react'
import { setSupervision } from '@/app/actions/teacherSupervision'
import { supervisionBreak, MAX_BREAK_SLOT } from '@/lib/supervisionSlots'

const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr']
const DAY_FULL = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag']
/** Generische Ort-Vorschläge für die kurzen Pausen — reiner Freitext, diese
 *  Liste ist nur eine Tipphilfe, keine feste Werteliste. */
const GENERIC_LOCATIONS = ['Garderobe', '1. Stock', '2. Stock', 'Schulhof', 'Aula']

export interface Supervision { day: number; breakSlot: number; location: string }

/** Verwaltung der Gangaufsichten im "Mein Plan"-Tab. Parallel zum persönlichen
 *  Stundenplan, aber auf der PAUSEN-Achse: pro Wochentag lässt sich jede Pause
 *  an-/abschalten UND mit einem Ort versehen (Freitext, wie das Klassen-Label
 *  im Stundenplan-Editor). Lange Aufsichten (7:45–8:00, 9:45–10:00) tragen
 *  einen goldenen, kurze einen blauen Marker; "Große Pause" wird bei den
 *  langen Pausen als erster Vorschlag angeboten, ist aber kein Zwang — auch
 *  die lange Pause kann z.B. "Schulhof" heißen.
 *
 *  Die angezeigten Pausen-Zeilen richten sich nach dem Schultag (Standard bis
 *  nach der 7. Stunde) und werden erweitert, falls eine spätere Aufsicht
 *  existiert — so bleibt das Raster kompakt, ohne Einträge zu verstecken. */
export default function SupervisionEditor({ initial }: { initial: Supervision[] }) {
  const key = (day: number, slot: number) => `${day}-${slot}`
  const [grid, setGrid] = useState<Map<string, string>>(
    () => new Map(initial.map(s => [key(s.day, s.breakSlot), s.location])),
  )
  const [saving, setSaving] = useState<string | null>(null)
  const [popup, setPopup] = useState<{ day: number; slot: number } | null>(null)
  const [draftLocation, setDraftLocation] = useState('')
  const initialDraftRef = useRef('')
  const popupRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) setPopup(null)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const usedSlots = [...grid.keys()].map(k => Number(k.split('-')[1]))
  const maxSlot = Math.min(MAX_BREAK_SLOT, Math.max(7, ...(usedSlots.length ? usedSlots : [0])))
  const breaks = Array.from({ length: maxSlot + 1 }, (_, i) => supervisionBreak(i))

  /** Bisher im Raster verwendete Orte + ein paar Klassiker als Vorschlags-Chips.
   *  "Große Pause" steht bei langen Pausen voran, ist aber editierbar. */
  function suggestionsFor(long: boolean): string[] {
    const used = [...grid.values()].filter(Boolean)
    const base = long ? ['Große Pause', ...GENERIC_LOCATIONS] : GENERIC_LOCATIONS
    return [...new Set([...base, ...used])].slice(0, 6)
  }

  async function persist(day: number, slot: number, on: boolean, location: string) {
    const k = key(day, slot)
    setSaving(k)
    try {
      await setSupervision(day, slot, on, location)
      setGrid(prev => {
        const next = new Map(prev)
        if (on) next.set(k, location); else next.delete(k)
        return next
      })
    } catch {
      // Serverfehler (z.B. Migration noch nicht eingespielt) — Grid bleibt wie
      // vor dem Versuch, damit die Anzeige nicht etwas Ungespeichertes zeigt.
    }
    setSaving(null)
  }

  function openPopup(day: number, slot: number, long: boolean) {
    const existing = grid.get(key(day, slot))
    const draft = existing ?? (long ? 'Große Pause' : '')
    setDraftLocation(draft)
    initialDraftRef.current = draft
    setPopup({ day, slot })
  }

  /** Chip-Klick speichert sofort. Freitext speichert erst beim Verlassen des
   *  Felds — UND nur, wenn sich gegenüber dem Öffnen tatsächlich etwas
   *  geändert hat, sonst würde reines Antippen+Wegklicken einer leeren Zelle
   *  versehentlich eine Aufsicht anlegen. */
  function applyLocation(location: string) {
    setDraftLocation(location)
    if (!popup) return
    persist(popup.day, popup.slot, true, location)
  }

  function commitOnBlur() {
    if (!popup || draftLocation === initialDraftRef.current) return
    persist(popup.day, popup.slot, true, draftLocation)
  }

  function removeEntry() {
    if (!popup) return
    persist(popup.day, popup.slot, false, '')
    setPopup(null)
  }

  const popupBreak = popup ? supervisionBreak(popup.slot) : null
  const popupActive = popup ? grid.has(key(popup.day, popup.slot)) : false

  return (
    <div className="relative">
      <div className="flex items-center gap-2 mb-1">
        <span className="msym text-[20px] text-[#2F86C5]" style={{ fontVariationSettings: "'FILL' 1" }}>supervisor_account</span>
        <h2 className="font-extrabold text-[16px] text-kh-dark">Gangaufsichten</h2>
      </div>
      <p className="text-[12.5px] text-kh-muted font-medium mb-4">
        Tippe eine Pause an, um deine Aufsicht samt Ort einzutragen — beides erscheint auf deiner Startseite neben den Stunden.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse table-fixed">
          <thead>
            <tr>
              <th className="w-[72px] pb-3" />
              {DAYS.map(d => (
                <th key={d} className="pb-3 text-center text-[11px] font-bold text-kh-muted uppercase tracking-wide">{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {breaks.map(b => (
              <tr key={b.slot}>
                <td className="pr-2 text-right select-none py-0.5 w-[72px] align-middle">
                  <div className="text-[11px] font-bold text-kh-dark tabular-nums leading-none">{b.start}–{b.end}</div>
                  <div
                    className="text-[9px] font-bold uppercase tracking-wide mt-0.5"
                    style={{ color: b.long ? '#B9791A' : '#9AA6A7' }}
                  >
                    {b.long ? 'lang' : 'kurz'}
                  </div>
                </td>
                {DAYS.map((_, di) => {
                  const day = di + 1
                  const k = key(day, b.slot)
                  const location = grid.get(k)
                  const on = location !== undefined
                  return (
                    <td key={day} className="p-0.5">
                      <button
                        onClick={() => openPopup(day, b.slot, b.long)}
                        disabled={saving === k}
                        aria-pressed={on}
                        aria-label={`Aufsicht ${DAYS[di]} ${b.start}–${b.end}${on && location ? `, ${location}` : ''} bearbeiten`}
                        className={`w-full min-h-[38px] rounded-lg flex flex-col items-center justify-center gap-0.5 px-0.5 transition-colors disabled:opacity-60 ${
                          on ? 'text-white' : 'bg-transparent text-transparent hover:bg-[#2F86C5]/10 hover:text-[#2F86C5]'
                        }`}
                        style={on ? {
                          background: b.long
                            ? 'linear-gradient(180deg, #C98A2Bee 0%, #C98A2B99 100%)'
                            : 'linear-gradient(180deg, #2F86C5ee 0%, #2F86C599 100%)',
                        } : undefined}
                      >
                        <span className="msym text-[16px] leading-none" style={{ fontVariationSettings: on ? "'FILL' 1" : undefined }}>
                          {on ? 'check' : 'add'}
                        </span>
                        {on && location && (
                          <span className="text-[8.5px] font-bold leading-none max-w-full truncate px-0.5">{location}</span>
                        )}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-kh-border/60">
        <span className="flex items-center gap-1.5 text-[11.5px] font-medium text-kh-muted">
          <span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: '#C98A2B' }} />
          Lange Aufsicht (7:45–8:00, 9:45–10:00)
        </span>
        <span className="flex items-center gap-1.5 text-[11.5px] font-medium text-kh-muted">
          <span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: '#2F86C5' }} />
          Kurze Pausen-Aufsicht
        </span>
      </div>

      {/* Orts-Popup — gleiches Muster wie die Klassen-Freitext-Eingabe im
          persönlichen Stundenplan-Editor (TeacherTimetableEditor). */}
      {popup && popupBreak && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setPopup(null)} />
          <div
            ref={popupRef}
            className="fixed z-20 bg-white border border-kh-border rounded-2xl shadow-xl p-3 w-[248px]"
            style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
          >
            <div className="text-[10px] font-bold text-kh-muted uppercase tracking-wide mb-2 px-1">
              {DAY_FULL[popup.day - 1]}, {popupBreak.start}–{popupBreak.end}
            </div>

            <label className="block text-[10px] font-bold text-kh-muted uppercase tracking-wide mb-1.5 px-1">
              Ort der Aufsicht
            </label>
            <input
              type="text"
              autoFocus
              value={draftLocation}
              onChange={e => setDraftLocation(e.target.value)}
              onBlur={commitOnBlur}
              onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
              maxLength={30}
              placeholder="z.B. Garderobe"
              className="w-full px-3 py-1.5 rounded-xl border border-kh-border text-[13px] font-semibold text-kh-dark placeholder:font-medium placeholder:text-kh-muted/70 focus:outline-none focus:ring-2 focus:ring-kh-teal/40"
            />
            <div className="flex flex-wrap gap-1 mt-1.5">
              {suggestionsFor(popupBreak.long).map(l => {
                const chipActive = draftLocation === l
                return (
                  <button
                    key={l}
                    onClick={() => applyLocation(l)}
                    className="px-2 py-0.5 rounded-full text-[11px] font-extrabold transition"
                    style={chipActive
                      ? { background: '#2F86C5', color: '#fff' }
                      : { background: '#2F86C51f', color: '#2F86C5' }}
                  >
                    {l}
                  </button>
                )
              })}
            </div>

            {popupActive && (
              <div className="border-t border-kh-border mt-2 pt-2">
                <button
                  onClick={removeEntry}
                  className="w-full text-left px-2 py-1.5 rounded-lg text-[12.5px] font-semibold text-kh-muted hover:bg-kh-page transition flex items-center gap-1.5"
                >
                  <span className="msym text-[15px]">delete</span>
                  Aufsicht entfernen
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
