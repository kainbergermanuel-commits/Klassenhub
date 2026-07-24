'use client'

import { useState } from 'react'
import { setSupervision } from '@/app/actions/teacherSupervision'
import { supervisionBreak, MAX_BREAK_SLOT } from '@/lib/supervisionSlots'

const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr']

export interface Supervision { day: number; breakSlot: number }

/** Verwaltung der Gangaufsichten im "Mein Plan"-Tab. Parallel zum persönlichen
 *  Stundenplan, aber auf der PAUSEN-Achse: pro Wochentag lässt sich jede Pause
 *  an-/abschalten, in der man Aufsicht hat. Lange Aufsichten (7:45–8:00,
 *  9:45–10:00) tragen einen goldenen, kurze einen blauen Marker.
 *
 *  Die angezeigten Pausen-Zeilen richten sich nach dem Schultag (Standard bis
 *  nach der 7. Stunde) und werden erweitert, falls eine spätere Aufsicht
 *  existiert — so bleibt das Raster kompakt, ohne Einträge zu verstecken. */
export default function SupervisionEditor({ initial }: { initial: Supervision[] }) {
  const key = (day: number, slot: number) => `${day}-${slot}`
  const [active, setActive] = useState<Set<string>>(() => new Set(initial.map(s => key(s.day, s.breakSlot))))
  const [saving, setSaving] = useState<string | null>(null)

  const usedSlots = [...active].map(k => Number(k.split('-')[1]))
  const maxSlot = Math.min(MAX_BREAK_SLOT, Math.max(7, ...(usedSlots.length ? usedSlots : [0])))
  const breaks = Array.from({ length: maxSlot + 1 }, (_, i) => supervisionBreak(i))

  async function toggle(day: number, slot: number) {
    const k = key(day, slot)
    const on = !active.has(k)
    setActive(prev => { const n = new Set(prev); if (on) n.add(k); else n.delete(k); return n })
    setSaving(k)
    try {
      await setSupervision(day, slot, on)
    } catch {
      // Serverfehler (z.B. Migration noch nicht eingespielt) → optimistischen
      // Zustand zurücknehmen, damit die Anzeige nicht lügt.
      setActive(prev => { const n = new Set(prev); if (on) n.delete(k); else n.add(k); return n })
    }
    setSaving(null)
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <span className="msym text-[20px] text-[#2F86C5]" style={{ fontVariationSettings: "'FILL' 1" }}>supervisor_account</span>
        <h2 className="font-extrabold text-[16px] text-kh-dark">Gangaufsichten</h2>
      </div>
      <p className="text-[12.5px] text-kh-muted font-medium mb-4">
        Tippe die Pausen an, in denen du Aufsicht hast — sie erscheinen auf deiner Startseite neben den Stunden.
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
                  const on = active.has(k)
                  return (
                    <td key={day} className="p-0.5">
                      <button
                        onClick={() => toggle(day, b.slot)}
                        disabled={saving === k}
                        aria-pressed={on}
                        aria-label={`Aufsicht ${DAYS[di]} ${b.start}–${b.end} ${on ? 'entfernen' : 'eintragen'}`}
                        className={`w-full min-h-[36px] rounded-lg flex items-center justify-center transition-colors disabled:opacity-60 ${
                          on ? 'text-white' : 'bg-transparent text-transparent hover:bg-[#2F86C5]/10 hover:text-[#2F86C5]'
                        }`}
                        style={on ? {
                          background: b.long
                            ? 'linear-gradient(180deg, #C98A2Bee 0%, #C98A2B99 100%)'
                            : 'linear-gradient(180deg, #2F86C5ee 0%, #2F86C599 100%)',
                        } : undefined}
                      >
                        <span className="msym text-[17px]" style={{ fontVariationSettings: on ? "'FILL' 1" : undefined }}>
                          {on ? 'check' : 'add'}
                        </span>
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
    </div>
  )
}
