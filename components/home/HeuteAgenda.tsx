'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { buildClassColorMap, classColorFrom } from '@/lib/classLabelColor'

// Slot→Zeit-Mapping identisch zum Stundenplan (TimetableGrid.tsx SLOT_TIMES).
const SLOT_TIMES = ['8:00', '8:55', '10:00', '10:55', '11:50', '12:45', '13:40', '14:35', '15:30', '16:25']
const DAY_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr']
const DAY_FULL = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag']

interface Entry {
  day: number
  slot: number
  subject: string
  /** Nur im persönlichen Lehrer-Plan gesetzt: freie Klassen-Bezeichnung ("4a"). */
  classLabel?: string
}
interface Note { day: number; subject: string; content: string }
interface Subject { label: string; short: string; color: string }

export interface AgendaData {
  /** Kartentitel, z.B. "Heutige Agenda" (Lehrer) oder "Stundenplan" (Eltern). */
  title: string
  /** Material-Symbol im Kartenkopf. */
  icon: string
  /** Stundenplan-Einträge, day 1=Mo…5=Fr. Lehrer: teacher_timetable_entries
   *  (eigener Plan, mit classLabel); Eltern/Schüler: timetable_entries
   *  (gepushter Plan des Kindes, ohne classLabel). */
  entries: Entry[]
  /** Planungs-Notizen (nur Lehrer; Eltern übergeben []). subject = Fach-Label,
   *  leer = allgemeine Tages-/Wochennotiz. day 0 = Wochennotiz. */
  notes: Note[]
  /** Name der aktiven Klasse. Die Notizen stammen aus DEREN Planung, dürfen
   *  also nicht an Stunden einer anderen Klasse kleben (z.B. "D 1b"). */
  notesClassName?: string | null
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
}

function fmtDayNum(weekStart: string, dayIdx0: number): string {
  const d = new Date(`${weekStart}T00:00:00`)
  d.setDate(d.getDate() + dayIdx0)
  return d.toLocaleDateString('de-AT', { day: 'numeric' }) + '.'
}

function fmtDayDate(weekStart: string, dayIdx0: number): string {
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
function SubjChip({ subj, size = 28 }: { subj: Subject; size?: number }) {
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
function ClassPill({ label, color }: { label: string; color: string }) {
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
function LessonCell({
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

/** Dezente „Diese Woche"-Zeile: bringt die (sonst nirgends sichtbare)
 *  Wochennotiz auf die Startseite, ohne die Card aufzublähen. */
function WeekNoteLine({ text }: { text: string }) {
  return (
    <div className="mt-3 flex items-start gap-2.5 rounded-xl px-3 py-2.5" style={{ background: '#F8ECD6' }}>
      <span className="msym text-[16px] flex-shrink-0 mt-px" style={{ color: '#B9791A', fontVariationSettings: "'FILL' 1" }}>event_note</span>
      <div className="min-w-0">
        <div className="text-[10px] font-extrabold uppercase tracking-wide" style={{ color: '#8A5E14' }}>Diese Woche</div>
        <div className="text-[12.5px] text-kh-dark/90 leading-snug line-clamp-2 mt-0.5 whitespace-pre-wrap">{text}</div>
      </div>
    </div>
  )
}

/** Popup mit der vollständigen Tagesplanung: allgemeine Tagesnotiz + Fach-Notizen.
 *  Nutzt bewusst dasselbe Modal-Muster wie HwEyeButton/AddHomeworkModal
 *  (createPortal, Bottom-Sheet auf Mobile). Die Wochennotiz gehört auf
 *  Kartenebene (WeekNoteLine), nicht hier hinein — sie ist tages­übergreifend. */
function PlanungPopup({
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
          <button onClick={onClose} className="msym text-2xl text-kh-muted hover:text-kh-dark transition-colors flex-shrink-0" aria-label="Schließen">close</button>
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

        <Link href="/planung" className="flex items-center justify-center gap-1.5 mt-5 h-10 rounded-xl gradient-teal text-white text-[13px] font-bold hover:opacity-90 transition-opacity">
          <span className="msym text-[17px]">edit_calendar</span> In Planung öffnen
        </Link>
      </div>
    </div>,
    document.body,
  )
}

/**
 * Agenda-Header-Card über "Demnächst fällig". Bündelt den Stundenplan +
 * (bei Lehrpersonen) die Planungs-Notizen, umschaltbar zwischen Tages- und
 * Wochenansicht. Konfigurierbar für zwei Rollen:
 *  • Lehrperson → "Heutige Agenda", Fokus = heute, mit Planung + Links.
 *  • Elternteil → "Stundenplan", Fokus = morgen, ohne Planung/Links.
 *
 * Die Tagesplanung selbst hält die Card bewusst schlank: statt Notizen an jede
 * Stunde zu kleben, öffnet ein Tipp (Tag: "Planung ansehen" · Woche: Tag antippen)
 * ein Popup mit der vollen Tagesplanung. Die Wochennotiz sitzt als eigene Zeile
 * auf Kartenebene. Bewusst KEINE Doppelung des Statistik-Panels.
 */
export default function HeuteAgenda({ data }: { data: AgendaData }) {
  const { title, icon, entries, notes, subjects, focusWeekday, focusTabLabel, focusDateLabel, weekStart, weekLabel, showPlanningLinks, emptyMessage } = data
  const focusIsSchoolday = focusWeekday >= 1 && focusWeekday <= 5
  const [view, setView] = useState<'tag' | 'woche'>(focusIsSchoolday ? 'tag' : 'woche')
  const [popupDay, setPopupDay] = useState<number | null>(null)

  const subjMap = new Map(subjects.map(s => [s.label, s]))
  const subjOf = (label: string): Subject => subjMap.get(label) ?? { label, short: label.slice(0, 2).toUpperCase(), color: '#6E7E80' }

  /** Klassenfarben aus dem GESAMTEN Plan ableiten, nicht nur aus dem gerade
   *  sichtbaren Tag — sonst bekäme dieselbe Klasse in Tages- und
   *  Wochenansicht unterschiedliche Farben. */
  const classColors = buildClassColorMap(entries.map(e => e.classLabel ?? ''))
  const classColorOf = (label: string) => classColorFrom(classColors, label)

  /** Nur nicht-leere Notizen zählen — leergeräumte Fach-Abschnitte hinterlassen
   *  teils leere Zeilen, die weder Badge noch Popup verdienen. */
  const dayPlanNotes = (day: number) => notes.filter(n => n.day === day && n.subject !== '' && n.content.trim())
  const dayGeneralNote = (day: number) => notes.find(n => n.day === day && n.subject === '')?.content.trim() || null
  const dayHasPlan = (day: number) => !!dayGeneralNote(day) || dayPlanNotes(day).length > 0
  const dayPlanCount = (day: number) => (dayGeneralNote(day) ? 1 : 0) + dayPlanNotes(day).length

  /** Wochennotiz (day 0) — tagesübergreifend, gehört auf Kartenebene. */
  const weekNote = notes.find(n => n.day === 0 && n.subject === '')?.content.trim() || null

  const focusPlanCount = focusIsSchoolday ? dayPlanCount(focusWeekday) : 0

  return (
    <div className="rounded-2xl p-5 shadow-[0_8px_16px_rgba(20,40,45,.10)]" style={{ background: 'linear-gradient(135deg, #F4F8FA 0%, #FEFEFC 60%)' }}>
      <div className="flex items-center justify-between gap-2 mb-4">
        <h2 className="flex items-center gap-2 font-extrabold text-base text-kh-dark min-w-0">
          <span className="msym text-[20px] text-[#3E8DB8] flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
          <span className="truncate">{title}</span>
        </h2>
        {/* Gleiche Optik wie der Erinnerungen/Termine-Umschalter im Seitenpanel
            (AgendaPanel) — beide Karten stehen auf derselben Startseite, zwei
            verschiedene Umschalter-Stile nebeneinander wirkten zufällig. Gilt
            über diese Komponente automatisch für Lehrer- UND Elternansicht. */}
        <div className="flex gap-0.5 p-0.5 rounded-lg bg-gradient-to-b from-[#ECE7DD] to-white flex-shrink-0">
          {([['tag', focusTabLabel], ['woche', 'Woche']] as const).map(([v, lbl]) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all ${
                view === v ? 'bg-white/70 text-kh-dark shadow-sm' : 'text-kh-muted hover:text-kh-dark'
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {view === 'tag' ? (
        <TagView
          weekday={focusWeekday}
          tabLabel={focusTabLabel}
          entries={entries.filter(e => e.day === focusWeekday).sort((a, b) => a.slot - b.slot)}
          subjOf={subjOf}
          dateLabel={focusIsSchoolday ? focusDateLabel : null}
          showPlanningLinks={showPlanningLinks}
          emptyMessage={emptyMessage}
          classColorOf={classColorOf}
          planCount={focusPlanCount}
          onOpenPlanning={() => setPopupDay(focusWeekday)}
          weekNote={showPlanningLinks ? weekNote : null}
        />
      ) : (
        <WocheView
          entries={entries}
          subjOf={subjOf}
          focusWeekday={focusWeekday}
          weekStart={weekStart}
          weekLabel={weekLabel}
          classColorOf={classColorOf}
          dayPlanCount={dayPlanCount}
          dayHasPlan={dayHasPlan}
          onOpenPlanning={setPopupDay}
          weekNote={showPlanningLinks ? weekNote : null}
        />
      )}

      {popupDay !== null && (
        <PlanungPopup
          dayLabel={DAY_FULL[popupDay - 1]}
          dateLabel={fmtDayDate(weekStart, popupDay - 1)}
          isToday={focusIsSchoolday && popupDay === focusWeekday}
          dayNote={dayGeneralNote(popupDay)}
          subjectNotes={dayPlanNotes(popupDay)
            .map(n => ({ subject: n.subject, content: n.content }))
            .sort((a, b) => subjects.findIndex(s => s.label === a.subject) - subjects.findIndex(s => s.label === b.subject))}
          subjOf={subjOf}
          onClose={() => setPopupDay(null)}
        />
      )}
    </div>
  )
}

function TagView({
  weekday, tabLabel, entries, subjOf, dateLabel, showPlanningLinks, emptyMessage, classColorOf, planCount, onOpenPlanning, weekNote,
}: {
  weekday: number
  tabLabel: string
  entries: Entry[]
  subjOf: (l: string) => Subject
  dateLabel: string | null
  showPlanningLinks: boolean
  emptyMessage?: string
  classColorOf: (l: string) => string
  planCount: number
  onOpenPlanning: () => void
  weekNote: string | null
}) {
  if (weekday > 5) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-8">
        <span className="msym text-[34px] text-[#3E8DB8]/50 mb-2" style={{ fontVariationSettings: "'FILL' 1" }}>weekend</span>
        <p className="text-sm font-semibold text-kh-dark">{tabLabel} ist unterrichtsfrei</p>
        <p className="text-[12.5px] text-kh-muted mt-0.5">Wechsle zur Wochenansicht für die Übersicht.</p>
      </div>
    )
  }

  return (
    <>
      {/* Datum + „Planung ansehen": öffnet das Popup mit der vollen Tagesplanung,
          statt die Notizen an jede Stunde zu kleben (hält die Card schlank). */}
      <div className="flex items-center justify-between gap-2 mb-3 -mt-1 min-h-[26px]">
        {dateLabel && <p className="text-[12.5px] font-semibold text-kh-muted">{dateLabel}</p>}
        {planCount > 0 && (
          <button
            onClick={onOpenPlanning}
            className="flex items-center gap-1.5 text-[12px] font-bold text-[#3E8DB8] bg-[#3E8DB8]/12 hover:bg-[#3E8DB8]/20 rounded-full pl-2.5 pr-3 py-1.5 transition-colors flex-shrink-0"
          >
            <span className="msym text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>sticky_note_2</span>
            Planung ansehen · {planCount}
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl bg-white/60 px-4 py-4">
          <span className="msym text-[22px] text-kh-muted flex-shrink-0">calendar_view_week</span>
          <div className="text-[13px] text-kh-muted font-medium">
            {emptyMessage ?? 'Kein Unterricht eingetragen.'}{' '}
            <Link href="/stundenplan" className="font-bold text-[#3E8DB8] hover:underline">Stundenplan öffnen</Link>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {entries.map(e => {
            const s = subjOf(e.subject)
            return (
              <div key={`${e.day}-${e.slot}`} className="flex items-center gap-3 rounded-xl bg-white/70 px-3 py-2.5">
                <div className="flex flex-col items-center w-11 flex-shrink-0">
                  <span className="text-[13px] font-extrabold text-kh-dark leading-none">{e.slot}.</span>
                  <span className="text-[10px] font-medium text-kh-muted mt-0.5">{SLOT_TIMES[e.slot - 1]}</span>
                </div>
                <SubjChip subj={s} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[14px] font-semibold text-kh-dark truncate">{s.label}</span>
                    {e.classLabel && <ClassPill label={e.classLabel} color={classColorOf(e.classLabel)} />}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {weekNote && <WeekNoteLine text={weekNote} />}

      {showPlanningLinks && (
        <div className="flex items-center gap-4 mt-3.5 pt-3 border-t border-kh-border/40">
          <Link href="/stundenplan" className="flex items-center gap-1 text-[12.5px] font-semibold text-kh-muted hover:text-[#3E8DB8] transition-colors">
            <span className="msym text-[15px]">calendar_view_week</span> Stundenplan
          </Link>
          <Link href="/planung" className="flex items-center gap-1 text-[12.5px] font-semibold text-kh-muted hover:text-[#3E8DB8] transition-colors">
            <span className="msym text-[15px]">edit_calendar</span> Planung
          </Link>
        </div>
      )}
    </>
  )
}

function WocheView({
  entries, subjOf, focusWeekday, weekStart, weekLabel, classColorOf, dayPlanCount, dayHasPlan, onOpenPlanning, weekNote,
}: {
  entries: Entry[]
  subjOf: (l: string) => Subject
  focusWeekday: number
  weekStart: string
  weekLabel: string
  classColorOf: (l: string) => string
  dayPlanCount: (day: number) => number
  dayHasPlan: (day: number) => boolean
  onOpenPlanning: (day: number) => void
  weekNote: string | null
}) {
  // Spaltentreues Raster: Die Stundennummer steht EINMAL als Spaltenüberschrift
  // statt an jeder Stunde. Das setzt voraus, dass gleiche Stunden exakt
  // untereinander liegen — nur dann stimmt die Überschrift mit dem Inhalt
  // überein. Freistunden werden dadurch zur echten Lücke in der Spalte.
  const maxSlot = Math.min(10, Math.max(5, ...entries.map(e => e.slot)))
  const slots = Array.from({ length: maxSlot }, (_, i) => i + 1)
  const byDaySlot = new Map(entries.map(e => [`${e.day}-${e.slot}`, e]))
  const gridCols = { gridTemplateColumns: `2.25rem repeat(${maxSlot}, minmax(0, 1fr))` }

  return (
    <>
      <p className="text-[12.5px] font-semibold text-kh-muted mb-3 -mt-1">{weekLabel}</p>

      <div className="grid items-end gap-x-1 mb-1 px-1" style={gridCols}>
        <span />
        {slots.map(s => (
          <span key={s} className="text-center text-[10px] font-bold text-kh-muted tabular-nums leading-none">
            {s}.
          </span>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        {DAY_SHORT.map((short, i) => {
          const day = i + 1
          const noteCount = dayPlanCount(day)
          const tappable = dayHasPlan(day)
          const isFocus = day === focusWeekday
          const Row = (
            <div
              className={`grid items-center gap-x-1 rounded-xl px-1 py-2 transition-colors ${
                isFocus ? 'bg-[#3E8DB8]/12 ring-1 ring-[#3E8DB8]/30' : 'bg-white/60'
              } ${tappable ? 'hover:bg-white/90' : ''}`}
              style={gridCols}
            >
              <div className="flex flex-col items-center">
                <span className={`text-[12.5px] font-extrabold leading-none ${isFocus ? 'text-[#3E8DB8]' : 'text-kh-dark'}`}>{short}</span>
                <span className="text-[9.5px] font-medium text-kh-muted mt-0.5 leading-none">{fmtDayNum(weekStart, i)}</span>
                {noteCount > 0 && (
                  <span className="flex items-center gap-0.5 text-[9.5px] font-bold text-[#B9791A] mt-1 leading-none">
                    <span className="msym text-[11px]" style={{ fontVariationSettings: "'FILL' 1" }}>sticky_note_2</span>
                    {noteCount}
                  </span>
                )}
              </div>
              {slots.map(s => {
                const e = byDaySlot.get(`${day}-${s}`)
                return e ? (
                  <LessonCell
                    key={s}
                    subj={subjOf(e.subject)}
                    slot={s}
                    classLabel={e.classLabel}
                    classColor={e.classLabel ? classColorOf(e.classLabel) : undefined}
                  />
                ) : (
                  // Freistunde: sichtbarer Platzhalter statt leerer Zelle, damit
                  // die Lücke als solche gelesen wird und nicht als Layoutfehler.
                  <span key={s} className="h-10 rounded-lg bg-kh-border/20" aria-label={`${s}. Stunde frei`} />
                )
              })}
            </div>
          )
          // Tage mit Planung öffnen das Tages-Popup; ohne bleiben sie statisch.
          return tappable
            ? <button key={day} onClick={() => onOpenPlanning(day)} className="w-full text-left" aria-label={`Planung ${DAY_FULL[i]} ansehen`}>{Row}</button>
            : <div key={day}>{Row}</div>
        })}
      </div>

      {weekNote && <WeekNoteLine text={weekNote} />}
    </>
  )
}
