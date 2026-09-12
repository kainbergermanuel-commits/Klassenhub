'use client'

import { useState, useEffect } from 'react'
import { buildClassColorMap, classColorFrom } from '@/lib/classLabelColor'
import { supervisionBreak, type SupervisionBreak } from '@/lib/supervisionSlots'
import { addDaysISO, getWeekNumber } from '@/lib/date'
import { createClient } from '@/lib/supabase/client'
import { DAY_FULL, fmtDayDate, PlanungPopup, type Entry, type Note, type Subject } from './agenda/shared'
import { TagView, WocheView, PlanungView } from './agenda/views'

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
  const { title, icon, entries, notes, subjects, focusWeekday, focusTabLabel, focusDateLabel, weekStart, weekLabel, showPlanningLinks, emptyMessage, supervisions, authorId } = data
  const focusIsSchoolday = focusWeekday >= 1 && focusWeekday <= 5
  const [view, setView] = useState<'tag' | 'woche' | 'planung'>(focusIsSchoolday ? 'tag' : 'woche')
  const [popupDay, setPopupDay] = useState<number | null>(null)
  /** Aus welcher Woche das Popup stammt — im Planung-Reiter kann das eine
   *  andere als die angezeigte Startwoche sein. */
  const [popupWeek, setPopupWeek] = useState<string>(weekStart)

  /** Planung-Reiter: Wochenversatz + nachgeladene Notizen je Woche.
   *  Woche 0 kommt vom Server (data.notes), alles andere wird beim ersten
   *  Blättern einmal geholt und dann aus dem Cache bedient. */
  const [planOffset, setPlanOffset] = useState(0)
  const [planCache, setPlanCache] = useState<Record<string, Note[]>>({})
  const [planLoading, setPlanLoading] = useState(false)
  const planWeekStart = planOffset === 0 ? weekStart : addDaysISO(planOffset * 7, new Date(`${weekStart}T00:00:00`))
  const planNotes = planOffset === 0 ? notes : planCache[planWeekStart] ?? []

  useEffect(() => {
    if (view !== 'planung' || planOffset === 0 || !authorId) return
    if (planCache[planWeekStart]) return
    let cancelled = false
    setPlanLoading(true)
    const supabase = createClient()
    supabase.from('planning_notes' as never)
      .select('day,subject,content')
      .eq('author_id', authorId)
      .eq('week_start', planWeekStart)
      .then(({ data: rows }) => {
        if (cancelled) return
        setPlanCache(c => ({ ...c, [planWeekStart]: (rows as Note[] | null) ?? [] }))
        setPlanLoading(false)
      })
    return () => { cancelled = true }
  }, [view, planOffset, planWeekStart, authorId, planCache])

  const subjMap = new Map(subjects.map(s => [s.label, s]))
  const subjOf = (label: string): Subject => subjMap.get(label) ?? { label, short: label.slice(0, 2).toUpperCase(), color: '#6E7E80' }

  /** Klassenfarben aus dem GESAMTEN Plan ableiten, nicht nur aus dem gerade
   *  sichtbaren Tag — sonst bekäme dieselbe Klasse in Tages- und
   *  Wochenansicht unterschiedliche Farben. */
  const classColors = buildClassColorMap(entries.map(e => e.classLabel ?? ''))
  const classColorOf = (label: string) => classColorFrom(classColors, label)

  /** Nur nicht-leere Notizen zählen — leergeräumte Fach-Abschnitte hinterlassen
   *  teils leere Zeilen, die weder Badge noch Popup verdienen. */
  const notesOfDay = (src: Note[], day: number) => src.filter(n => n.day === day && n.subject !== '' && n.content.trim())
  const generalOfDay = (src: Note[], day: number) => src.find(n => n.day === day && n.subject === '')?.content.trim() || null
  const dayPlanNotes = (day: number) => notesOfDay(notes, day)
  const dayGeneralNote = (day: number) => generalOfDay(notes, day)
  const dayHasPlan = (day: number) => !!dayGeneralNote(day) || dayPlanNotes(day).length > 0
  const dayPlanCount = (day: number) => (dayGeneralNote(day) ? 1 : 0) + dayPlanNotes(day).length

  /** Wochennotiz (day 0) — tagesübergreifend, gehört auf Kartenebene. */
  const weekNote = notes.find(n => n.day === 0 && n.subject === '')?.content.trim() || null

  const focusPlanCount = focusIsSchoolday ? dayPlanCount(focusWeekday) : 0

  /** Der Planung-Reiter existiert nur für Lehrpersonen — Eltern und
   *  Schüler:innen sehen dieselbe Card ohne Planungsdaten (notes = []). */
  const focusHasPlan = focusIsSchoolday && dayHasPlan(focusWeekday)
  const tabs: [('tag' | 'woche' | 'planung'), string][] = showPlanningLinks
    ? [['tag', focusTabLabel], ['woche', 'Woche'], ['planung', 'Planung']]
    : [['tag', focusTabLabel], ['woche', 'Woche']]

  /** Gangaufsichten des Fokustags, nach Zeit (= break_slot) sortiert. */
  const focusSupervisions: (SupervisionBreak & { location: string })[] = (supervisions ?? [])
    .filter(s => s.day === focusWeekday)
    .map(s => ({ ...supervisionBreak(s.breakSlot), location: s.location }))
    .sort((a, b) => a.slot - b.slot)

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
          {tabs.map(([v, lbl]) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`relative px-3 py-1.5 rounded-md text-[11px] font-bold transition-all ${
                view === v ? 'bg-white/70 text-kh-dark shadow-sm' : 'text-kh-muted hover:text-kh-dark'
              }`}
            >
              {lbl}
              {/* Punkt am Planung-Reiter: heute steht etwas in der Planung.
                  Bewusst nur ein Punkt ohne Zahl — die Zahl steht im Reiter
                  selbst (Tagesabschnitte) und wäre hier doppelt. */}
              {v === 'planung' && focusHasPlan && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full" style={{ background: '#B9791A' }} />
              )}
            </button>
          ))}
        </div>
      </div>

      {view === 'planung' ? (
        <PlanungView
          weekLabel={planOffset === 0 ? weekLabel : `KW ${getWeekNumber(planWeekStart)}`}
          weekStart={planWeekStart}
          isCurrentWeek={planOffset === 0}
          loading={planLoading}
          canBrowse={!!authorId}
          onPrev={() => setPlanOffset(o => o - 1)}
          onNext={() => setPlanOffset(o => o + 1)}
          onBackToCurrent={() => setPlanOffset(0)}
          focusWeekday={planOffset === 0 ? focusWeekday : 0}
          weekNote={generalOfDay(planNotes, 0)}
          dayGeneralNote={(d) => generalOfDay(planNotes, d)}
          dayPlanNotes={(d) => notesOfDay(planNotes, d)}
          subjects={subjects}
          subjOf={subjOf}
          onOpenPlanning={(d) => { setPopupWeek(planWeekStart); setPopupDay(d) }}
        />
      ) : view === 'tag' ? (
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
          onOpenPlanning={() => { setPopupWeek(weekStart); setPopupDay(focusWeekday) }}
          weekNote={showPlanningLinks ? weekNote : null}
          supervisions={focusSupervisions}
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
          onOpenPlanning={(d) => { setPopupWeek(weekStart); setPopupDay(d) }}
          weekNote={showPlanningLinks ? weekNote : null}
        />
      )}

      {popupDay !== null && (
        <PlanungPopup
          dayLabel={DAY_FULL[popupDay - 1]}
          dateLabel={fmtDayDate(popupWeek, popupDay - 1)}
          isToday={focusIsSchoolday && popupDay === focusWeekday && popupWeek === weekStart}
          dayNote={generalOfDay(popupWeek === weekStart ? notes : planCache[popupWeek] ?? [], popupDay)}
          subjectNotes={notesOfDay(popupWeek === weekStart ? notes : planCache[popupWeek] ?? [], popupDay)
            .map(n => ({ subject: n.subject, content: n.content }))
            .sort((a, b) => subjects.findIndex(s => s.label === a.subject) - subjects.findIndex(s => s.label === b.subject))}
          subjOf={subjOf}
          onClose={() => setPopupDay(null)}
        />
      )}
    </div>
  )
}

