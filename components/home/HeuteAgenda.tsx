'use client'

import { useState } from 'react'
import Link from 'next/link'

// Slot→Zeit-Mapping identisch zum Stundenplan (TimetableGrid.tsx SLOT_TIMES).
const SLOT_TIMES = ['8:00', '8:55', '10:00', '10:55', '11:50', '12:45', '13:40', '14:35', '15:30', '16:25']
const DAY_NAMES = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag']
const DAY_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr']

interface Entry { day: number; slot: number; subject: string }
interface Note { day: number; subject: string; content: string }
interface Subject { label: string; short: string; color: string }

export interface AgendaData {
  /** Standard-Stundenplan der Klasse (class_timetable_entries), day 1=Mo…5=Fr. */
  entries: Entry[]
  /** Planungs-Notizen der relevanten Woche (planning_notes), subject = Fach-Label. */
  notes: Note[]
  /** Fächer-Katalog für Kürzel + Farbe. */
  subjects: Subject[]
  /** Heutiger Wochentag: 1=Mo … 7=So. */
  todayWeekday: number
  /** Montag (YYYY-MM-DD) der angezeigten Woche. */
  weekStart: string
  /** z.B. "KW 29". */
  weekLabel: string
}

function fmtDate(weekStart: string, dayIdx0: number): string {
  const d = new Date(`${weekStart}T00:00:00`)
  d.setDate(d.getDate() + dayIdx0)
  return d.toLocaleDateString('de-AT', { day: 'numeric', month: 'long' })
}

/** Kleines Fach-Badge (Kürzel auf Farbverlauf), wie im HÜ-/Stundenplan-Stil. */
function SubjChip({ subj, size = 28 }: { subj: Subject; size?: number }) {
  return (
    <span
      className="rounded-[9px] flex items-center justify-center font-extrabold text-white flex-shrink-0"
      style={{
        width: size, height: size, fontSize: size <= 24 ? 10 : 11.5,
        background: `linear-gradient(135deg, ${subj.color}ee 0%, ${subj.color}99 100%)`,
      }}
    >
      {subj.short}
    </span>
  )
}

/**
 * "Heutige Agenda" — Header-Card über "Demnächst fällig" (nur Lehreransicht).
 * Bündelt den eigenen Unterricht + Planungs-Notizen, umschaltbar zwischen
 * Tages- (heute) und Wochenansicht. Bewusst KEINE Doppelung des Statistik-
 * Panels (Reise/HÜ/Erinnerungen/Termine/Dienste) — hier geht es um den
 * Stundenverlauf und die Notizen, die sonst nur unter /stundenplan bzw.
 * /planung sichtbar sind.
 */
export default function HeuteAgenda({ data }: { data: AgendaData }) {
  const { entries, notes, subjects, todayWeekday, weekStart, weekLabel } = data
  const isSchoolday = todayWeekday >= 1 && todayWeekday <= 5
  const [view, setView] = useState<'tag' | 'woche'>(isSchoolday ? 'tag' : 'woche')

  const subjMap = new Map(subjects.map(s => [s.label, s]))
  const subjOf = (label: string): Subject => subjMap.get(label) ?? { label, short: label.slice(0, 2).toUpperCase(), color: '#6E7E80' }

  const noteFor = (day: number, subject: string) => notes.find(n => n.day === day && n.subject === subject)?.content ?? null

  return (
    <div className="rounded-2xl p-5 shadow-[0_8px_16px_rgba(20,40,45,.10)]" style={{ background: 'linear-gradient(135deg, #F4F8FA 0%, #FEFEFC 60%)' }}>
      {/* Kopf: Titel + Tag/Woche-Umschalter */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <h2 className="flex items-center gap-2 font-extrabold text-base text-kh-dark min-w-0">
          <span className="msym text-[20px] text-[#3E8DB8] flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>today</span>
          <span className="truncate">Heutige Agenda</span>
        </h2>
        <div className="flex items-center gap-1 rounded-full bg-white/70 p-0.5 border border-kh-border/50 flex-shrink-0">
          {(['tag', 'woche'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1 rounded-full text-[12.5px] font-bold transition-colors ${
                view === v ? 'bg-[#3E8DB8] text-white shadow-sm' : 'text-kh-muted hover:text-kh-dark'
              }`}
            >
              {v === 'tag' ? 'Heute' : 'Woche'}
            </button>
          ))}
        </div>
      </div>

      {view === 'tag' ? (
        <TagView
          weekday={todayWeekday}
          entries={entries.filter(e => e.day === todayWeekday).sort((a, b) => a.slot - b.slot)}
          notes={notes.filter(n => n.day === todayWeekday)}
          subjOf={subjOf}
          noteFor={noteFor}
          dateLabel={isSchoolday ? `${DAY_NAMES[todayWeekday - 1]}, ${fmtDate(weekStart, todayWeekday - 1)}` : null}
        />
      ) : (
        <WocheView
          entries={entries}
          notes={notes}
          subjOf={subjOf}
          todayWeekday={todayWeekday}
          weekStart={weekStart}
          weekLabel={weekLabel}
        />
      )}
    </div>
  )
}

function TagView({
  weekday, entries, notes, subjOf, noteFor, dateLabel,
}: {
  weekday: number
  entries: Entry[]
  notes: Note[]
  subjOf: (l: string) => Subject
  noteFor: (day: number, subject: string) => string | null
  dateLabel: string | null
}) {
  // Notizen zu Fächern, die heute nicht im Stundenplan stehen → eigener Block.
  const scheduledSubjects = new Set(entries.map(e => e.subject))
  const looseNotes = notes.filter(n => !scheduledSubjects.has(n.subject))

  if (weekday > 5) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-8">
        <span className="msym text-[34px] text-[#3E8DB8]/50 mb-2" style={{ fontVariationSettings: "'FILL' 1" }}>weekend</span>
        <p className="text-sm font-semibold text-kh-dark">Heute ist unterrichtsfrei</p>
        <p className="text-[12.5px] text-kh-muted mt-0.5">Wechsle zur Wochenansicht für die kommende Woche.</p>
      </div>
    )
  }

  return (
    <>
      {dateLabel && <p className="text-[12.5px] font-semibold text-kh-muted mb-3 -mt-1">{dateLabel}</p>}

      {entries.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl bg-white/60 px-4 py-4">
          <span className="msym text-[22px] text-kh-muted flex-shrink-0">calendar_view_week</span>
          <div className="text-[13px] text-kh-muted font-medium">
            Für heute ist kein Unterricht eingetragen.{' '}
            <Link href="/stundenplan" className="font-bold text-[#3E8DB8] hover:underline">Stundenplan öffnen</Link>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {entries.map(e => {
            const s = subjOf(e.subject)
            const note = noteFor(weekday, e.subject)
            return (
              <div key={`${e.day}-${e.slot}`} className="flex items-start gap-3 rounded-xl bg-white/70 px-3 py-2.5">
                <div className="flex flex-col items-center w-11 flex-shrink-0 pt-0.5">
                  <span className="text-[13px] font-extrabold text-kh-dark leading-none">{e.slot}.</span>
                  <span className="text-[10px] font-medium text-kh-muted mt-0.5">{SLOT_TIMES[e.slot - 1]}</span>
                </div>
                <SubjChip subj={s} />
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="text-[14px] font-semibold text-kh-dark truncate">{s.label}</div>
                  {note && (
                    <div className="flex items-start gap-1.5 mt-1 text-[12.5px] text-kh-muted">
                      <span className="msym text-[14px] flex-shrink-0 mt-px" style={{ color: s.color }}>sticky_note_2</span>
                      <span className="min-w-0">{note}</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {looseNotes.length > 0 && (
        <div className="mt-3.5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-bold text-kh-muted uppercase tracking-wide">Weitere Notizen</span>
            <div className="flex-1 h-px bg-kh-border/50" />
          </div>
          <div className="flex flex-col gap-1.5">
            {looseNotes.map((n, i) => {
              const s = subjOf(n.subject)
              return (
                <div key={i} className="flex items-start gap-2.5 rounded-xl bg-white/60 px-3 py-2">
                  <SubjChip subj={s} size={22} />
                  <span className="text-[12.5px] text-kh-dark/90 min-w-0 pt-0.5">{n.content}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 mt-3.5 pt-3 border-t border-kh-border/40">
        <Link href="/stundenplan" className="flex items-center gap-1 text-[12.5px] font-semibold text-kh-muted hover:text-[#3E8DB8] transition-colors">
          <span className="msym text-[15px]">calendar_view_week</span> Stundenplan
        </Link>
        <Link href="/planung" className="flex items-center gap-1 text-[12.5px] font-semibold text-kh-muted hover:text-[#3E8DB8] transition-colors">
          <span className="msym text-[15px]">edit_calendar</span> Planung
        </Link>
      </div>
    </>
  )
}

function WocheView({
  entries, notes, subjOf, todayWeekday, weekStart, weekLabel,
}: {
  entries: Entry[]
  notes: Note[]
  subjOf: (l: string) => Subject
  todayWeekday: number
  weekStart: string
  weekLabel: string
}) {
  return (
    <>
      <p className="text-[12.5px] font-semibold text-kh-muted mb-3 -mt-1">{weekLabel}</p>
      <div className="flex flex-col gap-1.5">
        {DAY_SHORT.map((short, i) => {
          const day = i + 1
          const dayEntries = entries.filter(e => e.day === day).sort((a, b) => a.slot - b.slot)
          const noteCount = notes.filter(n => n.day === day).length
          const isToday = day === todayWeekday
          return (
            <Link
              key={day}
              href="/planung"
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                isToday ? 'bg-[#3E8DB8]/12 ring-1 ring-[#3E8DB8]/30' : 'bg-white/60 hover:bg-white/90'
              }`}
            >
              <div className="flex flex-col items-center w-9 flex-shrink-0">
                <span className={`text-[13px] font-extrabold leading-none ${isToday ? 'text-[#3E8DB8]' : 'text-kh-dark'}`}>{short}</span>
                <span className="text-[10px] font-medium text-kh-muted mt-0.5">{fmtDate(weekStart, i).replace(/\s\w+$/, '')}</span>
              </div>
              <div className="flex-1 min-w-0 flex flex-wrap items-center gap-1">
                {dayEntries.length === 0 ? (
                  <span className="text-[12px] text-kh-muted/70 font-medium">frei</span>
                ) : (
                  dayEntries.map(e => <SubjChip key={e.slot} subj={subjOf(e.subject)} size={22} />)
                )}
              </div>
              {noteCount > 0 && (
                <span className="flex items-center gap-1 text-[11.5px] font-bold text-[#B9791A] flex-shrink-0">
                  <span className="msym text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>sticky_note_2</span>
                  {noteCount}
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </>
  )
}
