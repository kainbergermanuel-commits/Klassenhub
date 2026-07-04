'use client'

import { useState, useRef, useEffect } from 'react'
import { saveTimetableEntry } from '@/app/actions/timetable'
import { SUBJECTS } from '@/lib/subjects'

const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr']
const SLOTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
const SLOT_TIMES = ['8:00', '8:55', '10:00', '10:55', '11:50', '12:45', '13:40', '14:35', '15:30', '16:25']

interface Entry { day: number; slot: number; subject: string }
interface DueMarker { day: number; subject: string; title: string; done: boolean }
interface ReminderMarker { day: number; title: string }
interface Props { entries: Entry[]; readonly?: boolean; dueMarkers?: DueMarker[]; reminderMarkers?: ReminderMarker[] }

/**
 * Eigenes, gestyltes Tooltip statt title-Attribut (native Browser-Tooltips
 * lassen sich nicht stylen). placement='top': für Ecke-Badges in Zellen
 * (Tooltip erscheint darüber). placement='bottom': für den Erinnerungs-Pin
 * im Tabellenkopf ganz oben (Tooltip erscheint darunter, sonst würde er über
 * die Card hinausragen).
 */
function BadgeTooltip({
  label, children, anchorClassName = 'absolute bottom-0.5 right-0.5', placement = 'top',
}: {
  label: string
  children: React.ReactNode
  anchorClassName?: string
  placement?: 'top' | 'bottom'
}) {
  const isTop = placement === 'top'
  return (
    <span tabIndex={0} className={`group/badge outline-none ${anchorClassName}`}>
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute right-0 z-30 w-max max-w-[180px] whitespace-normal rounded-lg px-2.5 py-1.5 text-[11px] font-semibold leading-snug text-white opacity-0 scale-95 transition-all duration-150 shadow-lg group-hover/badge:opacity-100 group-hover/badge:scale-100 group-focus-visible/badge:opacity-100 group-focus-visible/badge:scale-100 ${
          isTop ? 'bottom-full mb-1.5 origin-bottom-right' : 'top-full mt-1.5 origin-top-right'
        }`}
        style={{ background: 'linear-gradient(135deg, #17404B 0%, #0F2E37 100%)' }}
      >
        {label}
        <span
          className={`absolute right-2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent ${
            isTop ? 'top-full border-t-[5px]' : 'bottom-full border-b-[5px]'
          }`}
          style={isTop ? { borderTopColor: '#123640' } : { borderBottomColor: '#17404B' }}
        />
      </span>
    </span>
  )
}

/** Warndreieck mit echtem SVG-Gradient (kein background-clip-Trick nötig). */
function DueBadge() {
  return (
    <svg
      width="17" height="17" viewBox="0 0 24 24"
      style={{ filter: 'drop-shadow(0 1px 1.5px rgba(0,0,0,.25))' }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="dueBadgeGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#E06B57" />
          <stop offset="100%" stopColor="#F2907E" />
        </linearGradient>
      </defs>
      <path
        d="M10.2 3.6c.77-1.37 2.83-1.37 3.6 0l8.3 14.7c.75 1.33-.2 3-1.8 3H3.7c-1.6 0-2.55-1.67-1.8-3z"
        fill="url(#dueBadgeGrad)" stroke="white" strokeOpacity="0.7" strokeWidth="0.9" strokeLinejoin="round"
      />
      <rect x="11.1" y="9" width="1.8" height="6" rx="0.9" fill="white" />
      <circle cx="12" cy="17.3" r="1.05" fill="white" />
    </svg>
  )
}

/** Dezenter Haken für bereits erledigte HÜ — kein Container/Chip, nur der Strich selbst. */
function DoneBadge() {
  return (
    <svg
      width="15" height="15" viewBox="0 0 24 24"
      style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,.2))' }}
      aria-hidden="true"
    >
      <path
        d="M4 12.5l5 5.5L20 6"
        fill="none" stroke="#8FCBAE" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.9"
      />
    </svg>
  )
}

/** Erinnerungs-Pin (nicht fachgebunden) für den Tages-Header — Stecknadel-Form wie das push_pin-Icon der App, Farbe wie das Erinnerungen-Modul. */
function ReminderPin() {
  return (
    <svg
      width="13" height="13" viewBox="0 0 24 24"
      style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,.18))' }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="reminderPinGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2F86C5" />
          <stop offset="100%" stopColor="#56AEE6" />
        </linearGradient>
      </defs>
      <path
        d="M14 4v5c0 1.12.37 2.16 1 3H9c.65-.86 1-1.9 1-3V4h4m3-2H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3V4h1c.55 0 1-.45 1-1s-.45-1-1-1z"
        fill="url(#reminderPinGrad)"
      />
    </svg>
  )
}

export default function TimetableGrid({ entries, readonly = false, dueMarkers = [], reminderMarkers = [] }: Props) {
  const reminderByDay = new Map<number, string[]>()
  for (const m of reminderMarkers) {
    if (!reminderByDay.has(m.day)) reminderByDay.set(m.day, [])
    reminderByDay.get(m.day)!.push(m.title)
  }
  const dueByDaySubject = new Map<string, { title: string; done: boolean }[]>()
  for (const m of dueMarkers) {
    const k = `${m.day}-${m.subject}`
    if (!dueByDaySubject.has(k)) dueByDaySubject.set(k, [])
    dueByDaySubject.get(k)!.push({ title: m.title, done: m.done })
  }
  const [grid, setGrid] = useState<Map<string, string>>(() => {
    const m = new Map<string, string>()
    for (const e of entries) m.set(`${e.day}-${e.slot}`, e.subject)
    return m
  })
  const [popup, setPopup] = useState<{ day: number; slot: number } | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const popupRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setPopup(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function key(day: number, slot: number) { return `${day}-${slot}` }

  async function select(day: number, slot: number, subject: string | null) {
    const k = key(day, slot)
    setSaving(k)
    setPopup(null)
    try {
      await saveTimetableEntry(day, slot, subject ?? '')
      setGrid(prev => {
        const next = new Map(prev)
        if (subject) next.set(k, subject)
        else next.delete(k)
        return next
      })
    } catch {}
    setSaving(null)
  }

  const filledSlots = [...grid.keys()].map(k => parseInt(k.split('-')[1]))
  const maxSlot = Math.max(6, ...(filledSlots.length ? filledSlots : [6])) + (readonly ? 0 : 1)
  const visibleSlots = SLOTS.slice(0, Math.min(maxSlot, 10))

  const currentSubject = popup ? grid.get(key(popup.day, popup.slot)) ?? null : null

  return (
    <div className="overflow-x-auto relative">
      <table className="w-full border-collapse text-sm table-fixed">
        <thead>
          <tr>
            <th className="w-8 pb-3" />
            {DAYS.map((d, di) => {
              const day = di + 1
              const reminderTitles = reminderByDay.get(day)
              return (
                <th key={d} className="pb-3 text-center text-[11px] font-bold text-kh-muted uppercase tracking-wide">
                  <span className="relative inline-flex items-center gap-1">
                    {d}
                    {reminderTitles && reminderTitles.length > 0 && (
                      <BadgeTooltip
                        label={`Erinnerung: ${reminderTitles.join(', ')}`}
                        anchorClassName="relative inline-flex"
                        placement="bottom"
                      >
                        <ReminderPin />
                      </BadgeTooltip>
                    )}
                  </span>
                </th>
              )
            })}
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
                const value = grid.get(k) ?? ''
                const isSaving = saving === k
                const subj = SUBJECTS.find(s => s.label === value)
                const dueEntries = value ? dueByDaySubject.get(`${day}-${value}`) : undefined
                const openEntries = dueEntries?.filter(e => !e.done)
                const doneEntries = dueEntries?.filter(e => e.done)

                return (
                  <td key={day} className="p-0.5">
                    <div className="relative">
                      <button
                        onClick={() => !readonly && setPopup({ day, slot })}
                        disabled={readonly || isSaving}
                        className={`w-full rounded-lg px-2 py-2.5 text-[12px] font-bold text-center transition min-h-[40px] ${
                          value
                            ? 'text-white hover:opacity-75 transition-opacity'
                            : readonly
                            ? 'bg-transparent'
                            : 'bg-transparent text-transparent hover:bg-kh-teal/10 hover:text-kh-teal transition-colors'
                        } disabled:cursor-default`}
                        style={value && subj
                          ? { background: `linear-gradient(180deg, ${subj.color}ee 0%, ${subj.color}99 100%)` }
                          : value
                          ? { background: 'linear-gradient(180deg, #6E7E80ee 0%, #6E7E8099 100%)' }
                          : undefined}
                      >
                        {isSaving ? '…' : value ? (subj?.short ?? value) : readonly ? '' : '+'}
                      </button>
                      {openEntries && openEntries.length > 0 ? (
                        <BadgeTooltip label={`Fällig: ${openEntries.map(e => e.title).join(', ')}`}>
                          <DueBadge />
                        </BadgeTooltip>
                      ) : doneEntries && doneEntries.length > 0 ? (
                        <BadgeTooltip label={`Erledigt: ${doneEntries.map(e => e.title).join(', ')}`}>
                          <DoneBadge />
                        </BadgeTooltip>
                      ) : null}
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Fach-Popup */}
      {popup && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setPopup(null)} />
          <div
            ref={popupRef}
            className="fixed z-20 bg-white border border-kh-border rounded-2xl shadow-xl p-3 w-[220px]"
            style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
          >
            <div className="text-[10px] font-bold text-kh-muted uppercase tracking-wide mb-2 px-1">
              {DAYS[popup.day - 1]}, {popup.slot}. Stunde
            </div>
            <div className="flex flex-col gap-0.5 max-h-[320px] overflow-y-auto">
              {SUBJECTS.map(s => (
                <button
                  key={s.short}
                  onClick={() => select(popup.day, popup.slot, s.label)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition hover:bg-kh-page ${
                    currentSubject === s.label ? 'bg-kh-page' : ''
                  }`}
                >
                  <span
                    className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-extrabold text-white"
                    style={{ background: s.color }}
                  >
                    {s.short.charAt(0)}
                  </span>
                  <span className="text-[13px] font-semibold text-kh-dark">{s.label}</span>
                  {currentSubject === s.label && (
                    <span className="msym text-[14px] text-kh-teal ml-auto">check</span>
                  )}
                </button>
              ))}
            </div>
            {currentSubject && (
              <div className="border-t border-kh-border mt-2 pt-2">
                <button
                  onClick={() => select(popup.day, popup.slot, null)}
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
        const used = SUBJECTS.filter(s => [...grid.values()].includes(s.label))
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
    </div>
  )
}
