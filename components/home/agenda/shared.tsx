'use client'

/**
 * Bausteine der Agenda-Card: Typen, Konstanten und die kleinen Teile, die
 * Tages-, Wochen- und Planungsansicht gemeinsam benutzen.
 *
 * Ausgelagert, weil HeuteAgenda.tsx auf knapp 800 Zeilen und sechs Komponenten
 * gewachsen war. Reine Verschiebung, kein Verhaltensunterschied.
 */

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { type SupervisionBreak } from '@/lib/supervisionSlots'
import IconButton from '@/components/ui/IconButton'

// Slot→Zeit-Mapping identisch zum Stundenplan (TimetableGrid.tsx SLOT_TIMES).
export const SLOT_TIMES = ['8:00', '8:55', '10:00', '10:55', '11:50', '12:45', '13:40', '14:35', '15:30', '16:25']
export const DAY_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr']
export const DAY_FULL = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag']

export interface Entry {
  day: number
  slot: number
  subject: string
  /** Nur im persönlichen Lehrer-Plan gesetzt: freie Klassen-Bezeichnung ("4a"). */
  classLabel?: string
}
export interface Note { day: number; subject: string; content: string }
export interface Subject { label: string; short: string; color: string }

export interface AgendaData {
  /** Kartentitel, z.B. "Heutige Agenda" (Lehrer) oder "Stundenplan" (Eltern). */
  title: string
  /** Material-Symbol im Kartenkopf. */
  icon: string
  /** Stundenplan-Einträge, day 1=Mo…5=Fr. Lehrer: teacher_timetable_entries
   *  (eigener Plan, mit classLabel); Eltern/Schüler: timetable_entries
   *  (gepushter Plan des Kindes, ohne classLabel). */
  entries: Entry[]
  /** Planungs-Notizen der Lehrperson (Eltern übergeben []). subject =
   *  Fach-Label, leer = allgemeine Tages-/Wochennotiz, day 0 = Wochennotiz.
   *  Klassenunabhängig: die Planung gehört der Lehrperson, welche Klasse eine
   *  Notiz meint, steht in ihrem Text (feature-planung-persoenlich.sql). */
  notes: Note[]
  /** Text im Leerzustand, wenn für den Fokustag nichts eingetragen ist. */
  emptyMessage?: string
  /** Fächer-Katalog für Kürzel + Farbe. */
  subjects: Subject[]
  /** Fokus-Wochentag der Tagesansicht: 1=Mo … 7=So. */
  focusWeekday: number
  /** Beschriftung des Tages-Tabs, z.B. "Heute" oder "Morgen". */
  focusTabLabel: string
  /** Volles Datum des Fokustags, z.B. "Montag, 21. Juli". */
  focusDateLabel: string
  /** Montag (YYYY-MM-DD) der angezeigten Woche. */
  weekStart: string
  /** z.B. "KW 29". */
  weekLabel: string
  /** Fußzeile mit Stundenplan-/Planung-Links (nur Lehrer). */
  showPlanningLinks: boolean
  /** Eigene Benutzer-ID — nur nötig, damit der Planung-Reiter andere Wochen
   *  nachladen kann (die Planung gehört der Lehrperson). Fehlt sie, bleibt
   *  das Blättern aus. */
  authorId?: string | null
  /** Gangaufsichten der Lehrperson (nur Lehrer; Eltern lassen es weg). day 1=Mo…5=Fr,
   *  breakSlot 0=vor der 1. Stunde, N=Pause nach der N. Stunde, location Freitext. */
  supervisions?: { day: number; breakSlot: number; location: string }[]
}

export function fmtDayNum(weekStart: string, dayIdx0: number): string {
  const d = new Date(`${weekStart}T00:00:00`)
  d.setDate(d.getDate() + dayIdx0)
  return d.toLocaleDateString('de-AT', { day: 'numeric' }) + '.'
}

export function fmtDayDate(weekStart: string, dayIdx0: number): string {
  const d = new Date(`${weekStart}T00:00:00`)
  d.setDate(d.getDate() + dayIdx0)
  return d.toLocaleDateString('de-AT', { day: 'numeric', month: 'long' })
}

/** Kleines Fach-Badge (Kürzel auf Farbverlauf), wie im HÜ-/Stundenplan-Stil.
 *
 *  Die Schriftgröße hängt nicht nur an der Bubble-Größe, sondern auch an der
 *  Länge des Kürzels: Das Badge ist quadratisch und fix breit, deshalb sprengen
 *  dreistellige Kürzel wie "DGB" oder "BSP" den Kreis, während "D" oder "M"
 *  darin verloren wirken. */
export function SubjChip({ subj, size = 28 }: { subj: Subject; size?: number }) {
  const base = size <= 24 ? 10 : 11.5
  const len = subj.short.length
  const scale = len >= 4 ? 0.62 : len === 3 ? 0.78 : 1
  return (
    <span
      className="rounded-[9px] flex items-center justify-center font-extrabold text-white flex-shrink-0 leading-none"
      style={{
        width: size, height: size,
        fontSize: base * scale,
        letterSpacing: len >= 3 ? '-0.02em' : undefined,
        background: `linear-gradient(135deg, ${subj.color}ee 0%, ${subj.color}99 100%)`,
      }}
    >
      {subj.short}
    </span>
  )
}

/** Klassen-Bezeichnung ("4a") aus dem persönlichen Lehrer-Stundenplan.
 *  Trägt bewusst eine EIGENE Farbe (siehe lib/classLabelColor.ts), nicht die
 *  des Fachs — sonst sähen E 3a und E 4b identisch aus, was genau die
 *  Unterscheidung ist, um die es hier geht. */
export function ClassPill({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="flex-shrink-0 rounded-[7px] px-2 py-[3px] text-[11px] font-extrabold leading-tight"
      style={{
        color,
        // Verlauf + feine Innenkontur statt einer flachen 12%-Füllung: die war
        // gegen den hellen Kartenhintergrund kaum wahrnehmbar. Die Kontur liegt
        // als inset-Shadow innen, damit sie das Layout nicht verschiebt.
        background: `linear-gradient(135deg, ${color}40 0%, ${color}1f 100%)`,
        boxShadow: `inset 0 0 0 1px ${color}3d`,
      }}
    >
      {label}
    </span>
  )
}

/** Eine Stunde als Zelle im Wochenraster: Fach über Klasse, gestapelt.
 *
 *  Die Stundennummer steht NICHT hier, sondern einmal als Spaltenüberschrift —
 *  sie an jeder Stunde zu wiederholen war redundant. Gestapelt statt
 *  nebeneinander, damit auch sechs Spalten auf einem Telefon nebeneinander
 *  passen. Die Nummer wandert stattdessen in den title-Tooltip. */
export function LessonCell({
  subj, slot, classLabel, classColor,
}: { subj: Subject; slot: number; classLabel?: string; classColor?: string }) {
  return (
    <span
      className="h-10 rounded-lg bg-white/85 ring-1 ring-kh-border/50 flex flex-col items-center justify-center gap-0.5 px-0.5 shadow-[0_1px_2px_rgba(20,40,45,.05)]"
      title={`${slot}. Stunde · ${subj.label}${classLabel ? ` · ${classLabel}` : ''}`}
    >
      <SubjChip subj={subj} size={22} />
      {classLabel && (
        <span
          className="text-[9px] font-extrabold leading-none max-w-full truncate"
          style={{ color: classColor }}
        >
          {classLabel}
        </span>
      )}
    </span>
  )
}

/** Zweite Spalte im Tag-View: die Gangaufsichten des Tages, nach Zeit sortiert.
 *  Lange Aufsichten (7:45–8:00, 9:45–10:00) golden, kurze blau — konsistent zum
 *  Verwaltungs-Raster im Stundenplan. */
export function SupervisionColumn({ breaks }: { breaks: (SupervisionBreak & { location: string })[] }) {
  return (
    <div
      className="rounded-xl ring-1 ring-kh-border/40 p-3"
      style={{
        background: 'linear-gradient(160deg, #FBF7EE 0%, #FFFFFF 65%)',
        boxShadow: '0 1px 2px rgba(20,40,45,.05), 0 6px 14px rgba(20,40,45,.08)',
      }}
    >
      <div className="flex items-center gap-1.5 mb-2.5">
        <span className="msym text-[16px] text-[#2F86C5]" style={{ fontVariationSettings: "'FILL' 1" }}>supervisor_account</span>
        <span className="text-[11px] font-extrabold uppercase tracking-wide text-kh-muted">Aufsichten</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {breaks.map(b => {
          const color = b.long ? '#C98A2B' : '#2F86C5'
          return (
            <div key={b.slot} className="flex items-stretch gap-2 px-2.5 py-2">
              <span className="w-1 rounded-full flex-shrink-0" style={{ background: color }} />
              <div className="min-w-0">
                <div className="text-[12.5px] font-extrabold text-kh-dark tabular-nums leading-none">{b.start}–{b.end}</div>
                <div className="text-[10px] font-bold mt-1 leading-none truncate" style={{ color: b.long ? '#8A5E14' : '#2E6C93' }}>
                  {b.location || (b.long ? 'Lange Aufsicht' : 'Kurze Aufsicht')}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Dezente „Diese Woche"-Zeile: bringt die (sonst nirgends sichtbare)
 *  Wochennotiz auf die Startseite, ohne die Card aufzublähen. */
export function WeekNoteLine({ text, label = 'Diese Woche' }: { text: string; label?: string }) {
  return (
    <div className="mt-3 flex items-start gap-2.5 rounded-xl px-3 py-2.5" style={{ background: '#F8ECD6' }}>
      <span className="msym text-[16px] flex-shrink-0 mt-px" style={{ color: '#B9791A', fontVariationSettings: "'FILL' 1" }}>event_note</span>
      <div className="min-w-0">
        <div className="text-[10px] font-extrabold uppercase tracking-wide" style={{ color: '#8A5E14' }}>{label}</div>
        <div className="text-[12.5px] text-kh-dark/90 leading-snug line-clamp-2 mt-0.5 whitespace-pre-wrap">{text}</div>
      </div>
    </div>
  )
}

/** Popup mit der vollständigen Tagesplanung: allgemeine Tagesnotiz + Fach-Notizen.
 *  Nutzt bewusst dasselbe Modal-Muster wie HwEyeButton/AddHomeworkModal
 *  (createPortal, Bottom-Sheet auf Mobile). Die Wochennotiz gehört auf
 *  Kartenebene (WeekNoteLine), nicht hier hinein — sie ist tages­übergreifend. */
export function PlanungPopup({
  dayLabel, dateLabel, isToday, dayNote, subjectNotes, subjOf, onClose,
}: {
  dayLabel: string
  dateLabel: string
  isToday: boolean
  dayNote: string | null
  subjectNotes: { subject: string; content: string }[]
  subjOf: (l: string) => Subject
  onClose: () => void
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  if (!mounted) return null

  const isEmpty = !dayNote && subjectNotes.length === 0

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl max-h-[85vh] overflow-y-auto scrollbar-kh" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-[17px] font-extrabold text-kh-dark">{dayLabel}</h2>
              {isToday && (
                <span className="text-[11px] font-bold text-white px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: 'linear-gradient(135deg,#1E5FA8,#3FA9F5)' }}>Heute</span>
              )}
            </div>
            <p className="text-[12.5px] text-kh-muted font-medium mt-0.5">{dateLabel} · Planung</p>
          </div>
          <IconButton onClick={onClose} aria-label="Schließen" icon="close" size="sm" />
        </div>

        {isEmpty ? (
          <div className="flex flex-col items-center text-center py-6">
            <span className="msym text-[34px] text-kh-muted/40 mb-2" style={{ fontVariationSettings: "'FILL' 1" }}>edit_calendar</span>
            <p className="text-[13.5px] text-kh-muted font-medium">Für diesen Tag ist noch nichts geplant.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {dayNote && (
              <div className="flex items-start gap-3 rounded-xl bg-[#F6F3ED] px-3.5 py-3">
                <span className="msym text-[18px] text-kh-muted flex-shrink-0 mt-px" style={{ fontVariationSettings: "'FILL' 1" }}>push_pin</span>
                <div className="min-w-0">
                  <div className="text-[10.5px] font-extrabold text-kh-muted uppercase tracking-wide mb-0.5">Tagesnotiz</div>
                  <div className="text-[13.5px] text-kh-dark/90 leading-relaxed whitespace-pre-wrap">{dayNote}</div>
                </div>
              </div>
            )}
            {subjectNotes.map((n, i) => {
              const s = subjOf(n.subject)
              return (
                <div key={i} className="flex items-start gap-3 rounded-xl bg-[#FAF8F3] px-3.5 py-3">
                  <SubjChip subj={s} size={30} />
                  <div className="min-w-0 pt-0.5">
                    <div className="text-[10.5px] font-extrabold uppercase tracking-wide mb-0.5" style={{ color: s.color }}>{s.label}</div>
                    <div className="text-[13.5px] text-kh-dark/90 leading-relaxed whitespace-pre-wrap">{n.content}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <Link href="/planung" className="flex items-center justify-center gap-1.5 mt-5 h-10 rounded-xl gradient-teal text-white text-[13px] font-bold hover:brightness-105 transition-[filter,opacity] duration-150 tap">
          <span className="msym text-[17px]">edit_calendar</span> In Planung öffnen
        </Link>
      </div>
    </div>,
    document.body,
  )
}

