'use client'

import { useState, useRef, useEffect } from 'react'
import { saveTeacherTimetableEntry } from '@/app/actions/teacherTimetable'
import { buildClassColorMap, classColorFrom } from '@/lib/classLabelColor'

const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr']
const SLOTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
const SLOT_TIMES = ['8:00', '8:55', '10:00', '10:55', '11:50', '12:45', '13:40', '14:35', '15:30', '16:25']

export interface TeacherEntry { day: number; slot: number; subject: string; classLabel: string }
interface SubjectOption { label: string; short: string; color: string }
interface Props {
  entries: TeacherEntry[]
  subjects: SubjectOption[]
  /** Name der aktiven Klasse (z.B. "4a") — als erster Label-Vorschlag. */
  activeClassName: string | null
}

interface Cell { subject: string; classLabel: string }

/** Persönlicher Stundenplan der Lehrperson — Schwester-Komponente zu
 *  ClassTimetableEditor, aber für eine andere Achse: nicht der Plan EINER
 *  Klasse, sondern die Woche EINER PERSON quer über mehrere Klassen. Deshalb
 *  eigenständig statt generalisiert: Zelle, Popup und Fußzeile unterscheiden
 *  sich alle drei (Klassen-Label pro Stunde; kein Push an Kinder).
 *
 *  Das Klassen-Label ist bewusst Freitext — die Vorschlags-Chips darüber
 *  bestehen nur aus den bereits verwendeten Labels und ersparen das
 *  wiederholte Tippen, ohne eine DB-Verknüpfung einzuführen. */
export default function TeacherTimetableEditor({ entries, subjects, activeClassName }: Props) {
  const [grid, setGrid] = useState<Map<string, Cell>>(() => {
    const m = new Map<string, Cell>()
    for (const e of entries) m.set(`${e.day}-${e.slot}`, { subject: e.subject, classLabel: e.classLabel })
    return m
  })
  const [popup, setPopup] = useState<{ day: number; slot: number } | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [draftLabel, setDraftLabel] = useState('')
  const popupRef = useRef<HTMLDivElement>(null)

  const key = (day: number, slot: number) => `${day}-${slot}`

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) setPopup(null)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const current = popup ? grid.get(key(popup.day, popup.slot)) ?? null : null

  // Beim Öffnen einer Zelle das gespeicherte Label in den Entwurf übernehmen.
  useEffect(() => {
    setDraftLabel(current?.classLabel ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popup?.day, popup?.slot])

  /** Bisher verwendete Klassen-Labels + aktive Klasse, als Vorschlags-Chips.
   *  Live aus dem Raster, damit ein frisch getipptes Label sofort erscheint. */
  const labelSuggestions = (() => {
    const used = [...grid.values()].map(c => c.classLabel).filter(Boolean)
    const all = activeClassName ? [activeClassName, ...used] : used
    return [...new Set(all)].slice(0, 6)
  })()

  /** Klassenfarben AUSSCHLIESSLICH aus dem Raster ableiten — exakt dieselbe
   *  Quelle wie in der Startseiten-Agenda. Nähme man die Vorschläge dazu,
   *  könnte eine noch gar nicht verplante Klasse eine Farbe belegen und die
   *  Zuordnung gegenüber der Agenda verschieben. */
  const classColors = buildClassColorMap([...grid.values()].map(c => c.classLabel))
  const classColorOf = (label: string) => classColorFrom(classColors, label)
  /** Noch nicht verplante Klasse: neutral statt Platzhalterfarbe, die sich
   *  nach dem ersten Eintrag ändern würde. */
  const hasColor = (label: string) => classColors.has(label.trim().toLowerCase())

  async function persist(day: number, slot: number, subject: string, classLabel: string) {
    const k = key(day, slot)
    setSaving(k)
    try {
      await saveTeacherTimetableEntry(day, slot, subject, classLabel)
      setGrid(prev => {
        const next = new Map(prev)
        if (subject) next.set(k, { subject, classLabel })
        else next.delete(k)
        return next
      })
    } catch {}
    setSaving(null)
  }

  /** Fach wählen — das Popup bleibt bewusst offen, damit direkt danach die
   *  Klasse gesetzt werden kann (der häufigste nächste Handgriff). */
  function selectSubject(subject: string) {
    if (!popup) return
    persist(popup.day, popup.slot, subject, draftLabel)
  }

  function applyLabel(label: string) {
    setDraftLabel(label)
    if (!popup || !current?.subject) return
    persist(popup.day, popup.slot, current.subject, label)
  }

  function removeEntry() {
    if (!popup) return
    persist(popup.day, popup.slot, '', '')
    setPopup(null)
  }

  const filledSlots = [...grid.keys()].map(k => parseInt(k.split('-')[1]))
  const maxSlot = Math.max(6, ...(filledSlots.length ? filledSlots : [6])) + 1
  const visibleSlots = SLOTS.slice(0, Math.min(maxSlot, 10))

  return (
    <div className="overflow-x-auto relative">
      <table className="w-full border-collapse text-sm table-fixed">
        <thead>
          <tr>
            <th className="w-8 pb-3" />
            {DAYS.map(d => (
              <th key={d} className="pb-3 text-center text-[11px] font-bold text-kh-muted uppercase tracking-wide">{d}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibleSlots.map(slot => (
            <tr key={slot}>
              <td className="pr-2 text-right select-none py-0.5 w-10">
                <div className="text-[11px] font-bold text-kh-muted">{slot}.</div>
                <div className="text-[9px] font-medium text-kh-muted/70">{SLOT_TIMES[slot - 1]}</div>
              </td>
              {DAYS.map((_, di) => {
                const day = di + 1
                const k = key(day, slot)
                const cell = grid.get(k)
                const isSaving = saving === k
                const subj = cell ? subjects.find(s => s.label === cell.subject) : undefined

                return (
                  <td key={day} className="p-0.5">
                    <button
                      onClick={() => setPopup({ day, slot })}
                      disabled={isSaving}
                      className={`w-full rounded-lg px-2 py-2 text-center transition min-h-[46px] flex flex-col items-center justify-center gap-0.5 ${
                        cell ? 'text-white hover:opacity-75 transition-opacity' : 'bg-transparent text-transparent hover:bg-kh-teal/10 hover:text-kh-teal transition-colors'
                      } disabled:cursor-default`}
                      style={cell && subj
                        ? { background: `linear-gradient(180deg, ${subj.color}ee 0%, ${subj.color}99 100%)` }
                        : cell
                        ? { background: 'linear-gradient(180deg, #6E7E80ee 0%, #6E7E8099 100%)' }
                        : undefined}
                    >
                      {isSaving ? (
                        <span className="text-[12px] font-bold">…</span>
                      ) : cell ? (
                        <>
                          <span className="text-[12px] font-bold leading-none">{subj?.short ?? cell.subject}</span>
                          {cell.classLabel && (
                            // Weiße Pille statt farbigem Text direkt auf dem
                            // Fach-Verlauf — sonst wäre z.B. Blau auf Blau
                            // unlesbar. So trägt die Klasse ihre eigene Farbe
                            // auf jedem beliebigen Fach-Hintergrund.
                            <span
                              className="rounded-[6px] px-1.5 py-[1.5px] bg-white/95 text-[9.5px] font-extrabold leading-none shadow-sm"
                              style={{ color: classColorOf(cell.classLabel) }}
                            >
                              {cell.classLabel}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-[12px] font-bold">+</span>
                      )}
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Fach- und Klassen-Popup */}
      {popup && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setPopup(null)} />
          <div
            ref={popupRef}
            className="fixed z-20 bg-white border border-kh-border rounded-2xl shadow-xl p-3 w-[248px]"
            style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
          >
            <div className="text-[10px] font-bold text-kh-muted uppercase tracking-wide mb-2 px-1">
              {DAYS[popup.day - 1]}, {popup.slot}. Stunde
            </div>

            <div className="flex flex-col gap-0.5 max-h-[260px] overflow-y-auto">
              {subjects.map(s => (
                <button
                  key={s.short}
                  onClick={() => selectSubject(s.label)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition hover:bg-kh-page ${
                    current?.subject === s.label ? 'bg-kh-page' : ''
                  }`}
                >
                  <span
                    className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-extrabold text-white"
                    style={{ background: s.color }}
                  >
                    {s.short.charAt(0)}
                  </span>
                  <span className="text-[13px] font-semibold text-kh-dark">{s.label}</span>
                  {current?.subject === s.label && (
                    <span className="msym text-[14px] text-kh-teal ml-auto">check</span>
                  )}
                </button>
              ))}
            </div>

            {/* Klasse — reiner Freitext, Chips nur als Tipphilfe */}
            <div className="border-t border-kh-border mt-2 pt-2.5">
              <label className="block text-[10px] font-bold text-kh-muted uppercase tracking-wide mb-1.5 px-1">
                Klasse
              </label>
              <input
                type="text"
                value={draftLabel}
                onChange={e => setDraftLabel(e.target.value)}
                onBlur={() => { if (current?.subject && draftLabel !== current.classLabel) applyLabel(draftLabel) }}
                onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                disabled={!current?.subject}
                maxLength={20}
                placeholder={current?.subject ? 'z.B. 4a' : 'Zuerst Fach wählen'}
                className="w-full px-3 py-1.5 rounded-xl border border-kh-border text-[13px] font-semibold text-kh-dark placeholder:font-medium placeholder:text-kh-muted/70 focus:outline-none focus:ring-2 focus:ring-kh-teal/40 disabled:bg-kh-page disabled:text-kh-muted"
              />
              {current?.subject && labelSuggestions.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {/* Chips tragen schon hier ihre Klassenfarbe, damit die
                      Zuordnung vor dem Speichern sichtbar ist. */}
                  {labelSuggestions.map(l => {
                    const known = hasColor(l)
                    const c = known ? classColorOf(l) : '#8A8177'
                    const active = draftLabel === l
                    return (
                      <button
                        key={l}
                        onClick={() => applyLabel(l)}
                        className="px-2 py-0.5 rounded-full text-[11px] font-extrabold transition hover:opacity-80"
                        style={active
                          ? { background: c, color: '#fff' }
                          : { background: `${c}1f`, color: c }}
                      >
                        {l}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {current?.subject && (
              <div className="border-t border-kh-border mt-2 pt-2">
                <button
                  onClick={removeEntry}
                  className="w-full text-left px-3 py-2 rounded-xl text-[13px] font-semibold text-kh-muted hover:bg-kh-page transition flex items-center gap-2"
                >
                  <span className="msym text-[15px]">delete</span>
                  Eintrag löschen
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Legende */}
      {(() => {
        const usedLabels = [...grid.values()].map(c => c.subject)
        const used = subjects.filter(s => usedLabels.includes(s.label))
        return used.length > 0 ? (
          <div className="flex flex-wrap gap-x-4 gap-y-2 mt-5 pt-4 border-t border-kh-border">
            {used.map(s => (
              <div key={s.label} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                <span className="text-[11px] font-medium text-kh-muted">{s.label}</span>
              </div>
            ))}
          </div>
        ) : null
      })()}

      <p className="mt-5 flex items-start gap-1.5 text-[11.5px] text-kh-muted font-medium">
        <span className="msym text-[14px] flex-shrink-0 mt-px">lock</span>
        Dieser Plan gehört nur dir — er wird nicht an Kinder oder Eltern gesendet und ändert
        sich nicht, wenn du oben die Klasse wechselst.
      </p>
    </div>
  )
}
