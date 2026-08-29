'use client'

import { useState } from 'react'
import { pctOf, Ring, Sparkline, SectionLabel } from '@/components/home/statParts'
import { localDateOf, isOver } from '@/lib/date'
import type { Homework } from '@/lib/types'

interface SubjectInfo { label: string; short: string; color: string }

interface Props {
  /** Voller, unfiltierter Hausübungs-Bestand der Klasse — die "je Fach"-
   *  Aufschlüsselung braucht alle Fächer, nicht nur das aktuell gefilterte. */
  homework: Homework[]
  /** Vom Kind abgegeben (Zeile in homework_completions existiert). */
  doneIds: Set<string>
  /** Zusätzlich von einem Elternteil bestätigt — echte Teilmenge von doneIds. */
  confirmedIds: Set<string>
  /** homeworkId → completed_at (ISO) des ausgewählten Kindes, für Pünktlichkeit. */
  completedAtByHw: Map<string, string>
  subjects: SubjectInfo[]
  activeSubject: string | null
  today: string
}

type Mode = 'abgegeben' | 'bestaetigt'

const NEUTRAL_COLOR = '#0F8A82'

/**
 * Statistik-Block im Schüler-Hausübungs-Panel (Klasse-Seite) — dieselben
 * Bausteine wie im Statistik-Panel der Lehrer-Startseite (`statParts.tsx`),
 * aber für EIN Kind statt die ganze Klasse, und reaktiv auf den bestehenden
 * Fach-Filter: "Alle" zeigt die Gesamtquote + eine Aufschlüsselung je Fach
 * (schwächstes Fach zuerst — direkter Hinweis, wo Nachfragen sich lohnt),
 * ein einzelnes Fach zeigt nur dessen Kennzahlen.
 *
 * Zusätzlicher Umschalter "Abgegeben"/"Bestätigt": beide Zustände sind im
 * System real unterschiedlich (dieselbe Unterscheidung, nach der auch der
 * bestätigte Streak zählt) — abgegeben heißt nur, dass das Kind fertig ist,
 * bestätigt heißt, dass auch ein Elternteil es abgehakt hat. Ohne den
 * Umschalter sieht man nur "abgegeben"; die Lücke dazwischen war bisher
 * unsichtbar.
 *
 * Bewusst KEINE Links (anders als RingTile/BarRow auf der Startseite) — das
 * hier ist ein Info-Block innerhalb eines Slide-in-Panels, kein Navigations-
 * ziel. Deshalb lokale, nicht-klickbare Darstellung statt der geteilten
 * Link-Kacheln.
 */
export default function StudentHomeworkStats({
  homework, doneIds, confirmedIds, completedAtByHw, subjects, activeSubject, today,
}: Props) {
  const [mode, setMode] = useState<Mode>('abgegeben')
  const activeIds = mode === 'bestaetigt' ? confirmedIds : doneIds
  const isDone = (h: Homework) => activeIds.has(h.id)

  const filtered = activeSubject ? homework.filter(h => h.subject === activeSubject) : homework
  const total = filtered.length
  if (total === 0) return null

  const doneItems = filtered.filter(isDone)
  const done = doneItems.length
  const pct = pctOf(done, total)

  // Wartet auf Bestätigung: unabhängig vom Umschalter immer sichtbar, damit
  // die Lücke zwischen beiden Zuständen auch ohne Umschalten auffällt.
  const confirmedCountRaw = filtered.filter(h => confirmedIds.has(h.id)).length
  const pending = filtered.filter(h => doneIds.has(h.id)).length - confirmedCountRaw

  // Pünktlichkeit bezieht sich immer auf den Abgabezeitpunkt (completed_at),
  // egal ob "abgegeben" oder "bestätigt" gerade betrachtet wird — nur die
  // Grundgesamtheit (doneItems) ändert sich mit dem Umschalter.
  const onTime = doneItems.filter(h => {
    const at = completedAtByHw.get(h.id)
    return at ? localDateOf(at) <= h.due_date : false
  }).length
  const punctualPct = done > 0 ? pctOf(onTime, done) : null

  // Verlauf nur über bereits fällige HÜ — nicht fällige als "0" zu zeigen
  // sähe wie ein verpasster Termin aus, ist aber nur "noch nicht dran".
  const sparkValues = [...filtered]
    .filter(h => isOver(h.due_date, today))
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .slice(-6)
    .map(h => (isDone(h) ? 100 : 0))

  const ringColor = activeSubject
    ? subjects.find(s => s.label === activeSubject)?.color ?? NEUTRAL_COLOR
    : NEUTRAL_COLOR

  // Je-Fach-Aufschlüsselung nur im "Alle"-Zustand — bei einem aktiven Filter
  // wäre sie redundant mit der Ring-Kennzahl direkt darüber. Schwächstes
  // Fach zuerst: die Reihenfolge selbst ist der Hinweis.
  const breakdown = activeSubject
    ? []
    : subjects
        .map(s => {
          const subjHw = homework.filter(h => h.subject === s.label)
          const subjDone = subjHw.filter(isDone).length
          return { ...s, done: subjDone, total: subjHw.length, pct: pctOf(subjDone, subjHw.length) }
        })
        .filter(s => s.total > 0)
        .sort((a, b) => a.pct - b.pct)

  // Kein eigenes mb-*: der Elterncontainer (flex flex-col gap-6) übernimmt den
  // Abstand zum nächsten Block bereits — nur pb-5+border als Trenner-Optik.
  return (
    <div className="pb-5 border-b border-kh-border/60">
      <SectionLabel
        icon="query_stats"
        action={
          // Gleicher Umschalter-Stil wie Heute/Woche (HeuteAgenda) und
          // Erinnerungen/Termine (AgendaPanel) — ein Muster für alle
          // Zweizustands-Umschalter in der App.
          <div className="flex gap-0.5 p-0.5 rounded-lg bg-gradient-to-b from-[#ECE7DD] to-white flex-shrink-0">
            {(['abgegeben', 'bestaetigt'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-2.5 py-1 rounded-md text-[10.5px] font-bold transition-all ${
                  mode === m ? 'bg-white/70 text-kh-dark shadow-sm' : 'text-kh-muted hover:text-kh-dark'
                }`}
              >
                {m === 'abgegeben' ? 'Abgegeben' : 'Bestätigt'}
              </button>
            ))}
          </div>
        }
      >
        Statistik{activeSubject ? ` · ${activeSubject}` : ''}
      </SectionLabel>

      <div className="flex items-center gap-3">
        <Ring pct={pct} color={ringColor}>
          <span className="msym text-[17px]" style={{ color: ringColor, fontVariationSettings: "'FILL' 1" }}>
            assignment
          </span>
        </Ring>
        <div className="flex-1 min-w-0">
          <div className="text-[19px] font-extrabold text-kh-dark tabular-nums tracking-tight">{pct}%</div>
          <div className="text-[11.5px] font-medium text-kh-muted">
            {done}/{total} {mode === 'bestaetigt' ? 'bestätigt' : 'abgegeben'}
          </div>
        </div>
        {punctualPct !== null && (
          <div className="text-right flex-shrink-0 pl-2">
            <div className="text-[16px] font-extrabold text-kh-dark tabular-nums">{punctualPct}%</div>
            <div className="text-[10px] font-medium text-kh-muted whitespace-nowrap">pünktlich</div>
          </div>
        )}
      </div>

      {pending > 0 && (
        <p className="mt-2.5 flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: '#C98A2B' }}>
          <span className="msym text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>hourglass_top</span>
          {pending} {pending === 1 ? 'wartet' : 'warten'} noch auf Bestätigung der Eltern
        </p>
      )}

      {sparkValues.length >= 2 && (
        <div className="mt-3.5">
          <div className="text-[10px] font-bold text-kh-muted uppercase tracking-wide mb-1">
            Verlauf · letzte {sparkValues.length} fällige
          </div>
          <Sparkline values={sparkValues} color={ringColor} />
        </div>
      )}

      {breakdown.length > 1 && (
        <div className="mt-4">
          <div className="text-[10px] font-bold text-kh-muted uppercase tracking-wide mb-1.5">Je Fach</div>
          <div className="flex flex-col gap-1.5">
            {breakdown.map(s => (
              <div key={s.label} className="flex items-center gap-2">
                <span className="w-7 text-[10px] font-bold text-kh-muted flex-shrink-0">{s.short}</span>
                <div className="flex-1 h-1.5 rounded-full bg-[#EFE9DC] overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.max(4, s.pct)}%`, background: s.color, transition: 'width 700ms cubic-bezier(0.22,1,0.36,1)' }}
                  />
                </div>
                <span className="text-[10.5px] font-bold text-kh-dark tabular-nums w-9 text-right flex-shrink-0">
                  {s.done}/{s.total}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
