'use client'

/**
 * Die drei Ansichten der Agenda-Card: Tag, Woche, Planung. Der Zustand liegt
 * bewusst in HeuteAgenda.tsx — diese Komponenten stellen nur dar.
 */

import Link from 'next/link'
import { type SupervisionBreak } from '@/lib/supervisionSlots'
import {
  SLOT_TIMES, DAY_SHORT, DAY_FULL, fmtDayNum,
  SubjChip, ClassPill, LessonCell, SupervisionColumn, WeekNoteLine,
  type Entry, type Note, type Subject,
} from './shared'

export function TagView({
  weekday, tabLabel, entries, subjOf, dateLabel, showPlanningLinks, emptyMessage, classColorOf, planCount, onOpenPlanning, weekNote, supervisions,
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
  supervisions: (SupervisionBreak & { location: string })[]
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

      {/* Stunden links, Gangaufsichten als zweite Spalte rechts (nur wenn es an
          diesem Tag welche gibt — sonst nehmen die Stunden die volle Breite).
          Auf Mobile stapelt das Grid, die Aufsichten rutschen unter die Stunden. */}
      <div className={supervisions.length > 0 ? 'grid md:grid-cols-[1fr_168px] gap-3 items-start' : ''}>
        <div className="min-w-0">
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
        </div>

        {supervisions.length > 0 && <SupervisionColumn breaks={supervisions} />}
      </div>

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

export function WocheView({
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

/** Dritter Reiter (nur Lehrpersonen): die Planung der Woche am Stück lesbar.
 *
 *  Bewusst eine reine LESE-Ansicht auf dieselben Notizen, die Tag- und
 *  Wochenreiter schon geladen haben — geschrieben wird weiterhin nur unter
 *  /planung. Der Unterschied zum Popup ist die Woche auf einen Blick statt
 *  Tag für Tag; deshalb sind die Texte hier gekürzt, das Popup bleibt der Ort
 *  für den vollen Wortlaut (Tag antippen).
 *
 *  Leere Tage bleiben sichtbar statt herausgefiltert: „an diesem Tag ist noch
 *  nichts geplant" ist genau die Information, für die man den Reiter öffnet. */
export function PlanungView({
  weekLabel, weekStart, isCurrentWeek, loading, canBrowse, onPrev, onNext, onBackToCurrent,
  focusWeekday, weekNote, dayGeneralNote, dayPlanNotes, subjects, subjOf, onOpenPlanning,
}: {
  weekLabel: string
  weekStart: string
  isCurrentWeek: boolean
  loading: boolean
  canBrowse: boolean
  onPrev: () => void
  onNext: () => void
  onBackToCurrent: () => void
  focusWeekday: number
  weekNote: string | null
  dayGeneralNote: (day: number) => string | null
  dayPlanNotes: (day: number) => Note[]
  subjects: Subject[]
  subjOf: (l: string) => Subject
  onOpenPlanning: (day: number) => void
}) {
  const hasAnything = !!weekNote || [1, 2, 3, 4, 5].some(d => !!dayGeneralNote(d) || dayPlanNotes(d).length > 0)

  const monday = new Date(`${weekStart}T00:00:00`)
  const friday = new Date(monday)
  friday.setDate(monday.getDate() + 4)
  const fmtShort = (d: Date) => d.toLocaleDateString('de-AT', { day: 'numeric', month: 'numeric' })

  return (
    <>
      {/* Wochenzeile mit Pfeilen: dieselbe Woche wie /planung, nur zum Lesen.
          Ein Klick auf die KW-Beschriftung führt zurück in die aktuelle Woche —
          sonst findet man nach dem Blättern nicht mehr zurück. */}
      <div className="flex items-center gap-1.5 mb-3 -mt-1">
        <button
          onClick={onPrev}
          disabled={!canBrowse}
          aria-label="Woche zurück"
          className="w-7 h-7 rounded-lg flex items-center justify-center text-kh-muted hover:text-kh-dark hover:bg-white/80 transition-colors disabled:opacity-30 disabled:hover:bg-transparent flex-shrink-0"
        >
          <span className="msym text-[18px]">chevron_left</span>
        </button>
        <button
          onClick={onBackToCurrent}
          disabled={isCurrentWeek}
          className="text-[12.5px] font-semibold text-kh-muted disabled:cursor-default enabled:hover:text-[#3E8DB8] transition-colors"
          title={isCurrentWeek ? undefined : 'Zurück zur aktuellen Woche'}
        >
          {weekLabel} · {fmtShort(monday)}–{fmtShort(friday)}
        </button>
        <button
          onClick={onNext}
          disabled={!canBrowse}
          aria-label="Woche vor"
          className="w-7 h-7 rounded-lg flex items-center justify-center text-kh-muted hover:text-kh-dark hover:bg-white/80 transition-colors disabled:opacity-30 disabled:hover:bg-transparent flex-shrink-0"
        >
          <span className="msym text-[18px]">chevron_right</span>
        </button>
        {loading && <span className="text-[11px] font-semibold text-kh-muted/70">lädt …</span>}
      </div>

      {weekNote && <div className="mb-2.5"><WeekNoteLine text={weekNote} label={isCurrentWeek ? 'Diese Woche' : weekLabel} /></div>}

      {!hasAnything ? (
        <div className="flex flex-col items-center text-center py-7">
          <span className="msym text-[34px] text-kh-muted/40 mb-2" style={{ fontVariationSettings: "'FILL' 1" }}>edit_calendar</span>
          <p className="text-[13.5px] text-kh-muted font-medium">
            {loading ? 'Planung wird geladen …' : `Für ${isCurrentWeek ? 'diese Woche' : weekLabel} ist noch nichts geplant.`}
          </p>
          <Link href={`/planung?w=${weekStart}`} className="mt-3 flex items-center gap-1.5 text-[12.5px] font-bold text-[#3E8DB8] hover:underline">
            <span className="msym text-[16px]">edit_calendar</span> Planung öffnen
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {DAY_SHORT.map((short, i) => {
            const day = i + 1
            const isFocus = day === focusWeekday
            const general = dayGeneralNote(day)
            const subjectNotes = dayPlanNotes(day)
              .sort((a, b) => subjects.findIndex(s => s.label === a.subject) - subjects.findIndex(s => s.label === b.subject))
            const empty = !general && subjectNotes.length === 0

            return (
              <button
                key={day}
                onClick={() => !empty && onOpenPlanning(day)}
                disabled={empty}
                aria-label={empty ? `${DAY_FULL[i]}: nichts geplant` : `Planung ${DAY_FULL[i]} ansehen`}
                className={`w-full text-left flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                  isFocus ? 'bg-[#3E8DB8]/12 ring-1 ring-[#3E8DB8]/30' : 'bg-white/60'
                } ${empty ? 'cursor-default' : 'hover:bg-white/90'}`}
              >
                <div className="flex flex-col items-center w-9 flex-shrink-0 pt-px">
                  <span className={`text-[12.5px] font-extrabold leading-none ${isFocus ? 'text-[#3E8DB8]' : 'text-kh-dark'}`}>{short}</span>
                  <span className="text-[9.5px] font-medium text-kh-muted mt-0.5 leading-none">{fmtDayNum(weekStart, i)}</span>
                </div>

                {empty ? (
                  <span className="text-[12.5px] text-kh-muted/70 font-medium pt-px">Nichts geplant</span>
                ) : (
                  <div className="min-w-0 flex-1 flex flex-col gap-1.5">
                    {general && (
                      <div className="flex items-start gap-2 min-w-0">
                        <span className="msym text-[15px] text-kh-muted flex-shrink-0 mt-px" style={{ fontVariationSettings: "'FILL' 1" }}>push_pin</span>
                        <span className="text-[12.5px] text-kh-dark/90 leading-snug line-clamp-2 whitespace-pre-wrap">{general}</span>
                      </div>
                    )}
                    {subjectNotes.map((n, k) => {
                      const s = subjOf(n.subject)
                      return (
                        <div key={k} className="flex items-start gap-2 min-w-0">
                          <SubjChip subj={s} size={20} />
                          <span className="text-[12.5px] text-kh-dark/90 leading-snug line-clamp-2 whitespace-pre-wrap pt-px">{n.content}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}
    </>
  )
}
